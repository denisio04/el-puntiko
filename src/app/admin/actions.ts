"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getAdminWallet() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { wallet: 0, error: "No autorizado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { wallet: true },
  });

  return { wallet: user?.wallet || 0 };
}

export async function withdrawFromWallet(amount: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { wallet: true },
  });

  const currentWallet = user?.wallet || 0;
  
  if (typeof amount !== "number" || amount <= 0 || amount > currentWallet) {
    return { error: "Cantidad inválida" };
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { wallet: { decrement: amount } },
    select: { wallet: true },
  });

  return { wallet: updated.wallet || 0 };
}

export async function getOrders() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "AFFILIATE")) {
    return { error: "No autorizado" };
  }

  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
        },
      },
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return { orders: orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })) };
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return { error: "Estado inválido" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    return { error: "Pedido no encontrado" };
  }

  if (order.status === status) {
    return { order: { ...order, createdAt: order.createdAt.toISOString() } };
  }

  const providerCost = order.items.reduce((sum, item) => {
    return sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0);
  }, 0);
  const profit = order.total - providerCost;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    const goingFromConfirmed = order.status === "CONFIRMED" && status !== "CONFIRMED";
    const goingToConfirmed = status === "CONFIRMED" && order.status !== "CONFIRMED";
    const isCancelling = status === "CANCELLED";

if (goingFromConfirmed || (isCancelling && order.status !== "CANCELLED")) {
      if (order.deliveryId) {
        const deliveryTxs = await tx.walletTransaction.findMany({
          where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
        });
        if (deliveryTxs.length > 0) {
          const deliveryAmount = deliveryTxs.reduce((s, t) => s + t.amount, 0);
          await tx.user.update({
            where: { id: order.deliveryId },
            data: { wallet: { decrement: deliveryAmount } },
          });
          const deliveryProfile = await tx.deliveryProfile.findUnique({
            where: { userId: order.deliveryId },
          });
          if (deliveryProfile) {
            await tx.deliveryProfile.update({
              where: { userId: order.deliveryId },
              data: { totalDeliveries: { decrement: 1 } },
            });
          }
        }
      }

      const processedAffiliates = new Set();
      for (const item of order.items) {
        if (item.affiliateId && !processedAffiliates.has(item.affiliateId)) {
          processedAffiliates.add(item.affiliateId);
          const affiliate = await tx.affiliateProfile.findUnique({
            where: { id: item.affiliateId },
          });
          if (affiliate) {
            const txs = await tx.walletTransaction.findMany({
              where: { orderId: order.id, type: "COMMISSION" },
            });
            if (txs.length > 0) {
              const comm = txs.reduce((s, t) => s + t.amount, 0);
              await tx.user.update({
                where: { id: affiliate.userId },
                data: { wallet: { decrement: comm } },
              });
              await tx.walletTransaction.create({
                data: {
                  userId: affiliate.userId,
                  amount: comm,
                  type: "COMMISSION_PENDING",
                  description: `Comisión revertida por orden ${order.orderNumber}`,
                  orderId: order.id,
                },
              });
              await tx.affiliateProfile.update({
                where: { id: item.affiliateId },
                data: { pendingBalance: { increment: comm } },
              });
            }
          }
        }
      }

      const adminTxs = await tx.walletTransaction.findMany({
        where: { orderId: order.id, type: "PROFIT" },
      });
      if (adminTxs.length > 0) {
        const adminAmt = adminTxs.reduce((s, t) => s + t.amount, 0);
        const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
        const share = adminAmt / admins.length;
        for (const admin of admins) {
          await tx.user.update({
            where: { id: admin.id },
            data: { wallet: { decrement: share } },
          });
        }
      }

      if (providerCost > 0) {
        const supplier = await tx.user.findFirst({ where: { role: "SUPPLIER" } });
        if (supplier) {
          await tx.user.update({
            where: { id: supplier.id },
            data: { wallet: { decrement: providerCost } },
          });
        }
      }

      await tx.walletTransaction.deleteMany({
        where: { orderId: order.id, type: { in: ["COMMISSION", "DELIVERY_COMMISSION", "PROFIT", "PURCHASE_ORDERS"] } },
      });
    }

    if (goingToConfirmed) {
      const existingDeliveryTx = await tx.walletTransaction.findFirst({
        where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
      });
      if (existingDeliveryTx) {
        return { order: updated };
      }

      if (providerCost > 0) {
        const supplier = await tx.user.findFirst({ where: { role: "SUPPLIER" } });
        if (supplier) {
          await tx.user.update({
            where: { id: supplier.id },
            data: { wallet: { increment: providerCost } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: supplier.id,
              amount: providerCost,
              type: "PURCHASE_ORDERS",
              description: `Pago por orden ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }
      }

      let deliveryAmount = 0;
      if (order.deliveryId) {
        const deliveryProfile = await tx.deliveryProfile.findUnique({
          where: { userId: order.deliveryId },
        });
        if (deliveryProfile) {
          deliveryAmount = profit * deliveryProfile.commissionRate;
          await tx.walletTransaction.create({
            data: {
              userId: order.deliveryId,
              amount: deliveryAmount,
              type: "DELIVERY_COMMISSION",
              description: `Entrega orden ${order.orderNumber}`,
              orderId: order.id,
            },
          });
          await tx.user.update({
            where: { id: order.deliveryId },
            data: { wallet: { increment: deliveryAmount } },
          });
          await tx.deliveryProfile.update({
            where: { userId: order.deliveryId },
            data: { totalDeliveries: { increment: 1 } },
          });
        }
      }

      let commAmount = 0;
      const processedAffiliates = new Set();
      for (const item of order.items) {
        if (item.affiliateId && !processedAffiliates.has(item.affiliateId)) {
          processedAffiliates.add(item.affiliateId);
          const affiliate = await tx.affiliateProfile.findUnique({
            where: { id: item.affiliateId },
          });
          if (affiliate) {
            const pendingTx = await tx.walletTransaction.findFirst({
              where: { orderId: order.id, userId: affiliate.userId, type: "COMMISSION_PENDING" },
            });
            if (pendingTx) {
              const commissionAmount = pendingTx.amount;
              commAmount += commissionAmount;
              await tx.user.update({
                where: { id: affiliate.userId },
                data: { wallet: { increment: commissionAmount } },
              });
              await tx.walletTransaction.update({
                where: { id: pendingTx.id },
                data: { 
                  type: "COMMISSION",
                  description: `Comisión por "${item.product?.name || 'producto'}" - Orden ${order.orderNumber}`
                },
              });
              await tx.affiliateProfile.update({
                where: { id: item.affiliateId },
                data: { pendingBalance: { decrement: commissionAmount } },
              });
            }
          }
        }
      }

      const adminAmt = profit - commAmount - deliveryAmount;
      if (adminAmt > 0) {
        const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
        const share = adminAmt / admins.length;
        for (const admin of admins) {
          await tx.user.update({
            where: { id: admin.id },
            data: { wallet: { increment: share } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: admin.id,
              amount: share,
              type: "PROFIT",
              description: `Ganancia orden ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }
      }
    }

    if (isCancelling && order.status !== "CANCELLED" && order.status !== "CONFIRMED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return { order: { ...updated, createdAt: updated.createdAt.toISOString() } };
  });

  return result;
}

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "AFFILIATE")) {
    return { error: "No autorizado" };
  }

  const [totalOrders, pendingOrders, confirmedOrders, cancelledOrders, affiliatesCount] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { status: "CONFIRMED" } }),
    prisma.order.count({ where: { status: "CANCELLED" } }),
    prisma.affiliateProfile.count(),
  ]);

  const revenueResult = await prisma.order.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { total: true },
  });
  const totalRevenue = revenueResult._sum.total || 0;

  return {
    stats: {
      totalOrders,
      totalSales: totalRevenue,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      affiliates: affiliatesCount,
    }
  };
}

export async function getTopProducts() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "AFFILIATE")) {
    return { error: "No autorizado" };
  }

  const orderItems = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  const productIds = orderItems.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const topProducts = orderItems.map((item) => {
    const product = productMap.get(item.productId);
    return {
      productId: item.productId,
      name: product?.name || "Desconocido",
      image: product?.image || null,
      totalSold: item._sum.quantity || 0,
    };
  });

  return { topProducts };
}

export async function getTopViewedProducts() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "AFFILIATE")) {
    return { error: "No autorizado" };
  }

  const topViewed = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { views: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      image: true,
      views: true,
    },
  });

  return {
    topViewedProducts: topViewed.map((p) => ({
      productId: p.id,
      name: p.name,
      image: p.image,
      views: p.views,
    })),
  };
}

export async function getSalesTrend(days: number = 30) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "AFFILIATE")) {
    return { error: "No autorizado" };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      status: "CONFIRMED",
      createdAt: { gte: startDate },
    },
    select: { total: true, createdAt: true },
  });

  const dailyMap = new Map<string, number>();
  
  for (const order of orders) {
    const date = order.createdAt.toISOString().split("T")[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + order.total);
  }

  const data: { date: string; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    data.push({ date: dateStr, total: dailyMap.get(dateStr) || 0 });
  }

  const totalRevenue = data.reduce((sum, d) => sum + d.total, 0);
  const avgDaily = totalRevenue / days;

  return { trend: { data, summary: { totalRevenue, avgDaily, totalOrders: orders.length } } };
}

export async function getLowStockProducts() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const products = await prisma.product.findMany({
    where: { stock: { lte: 5 }, isActive: true },
    orderBy: { stock: "asc" },
    take: 10,
  });

  return { lowStock: products };
}

export async function getTopAffiliates() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const affiliates = await prisma.affiliateProfile.findMany({
    take: 10,
    include: { user: { select: { name: true, wallet: true } } },
  });

  const sortedAffiliates = affiliates.sort((a, b) => (b.user.wallet || 0) - (a.user.wallet || 0));

  const topAffiliates = sortedAffiliates.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.user.name || "Desconocido",
    totalEarnings: a.user.wallet || 0,
    totalOrders: 0,
    commissionRate: a.commissionRate,
  }));

  return { topAffiliates };
}

export async function getAdminUsers() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      ci: true,
      role: true,
      wallet: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })) };
}

export async function createUser(username: string, password: string, name: string, role: string, wallet: number, phone?: string, ci?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  if (!username || !password) {
    return { error: "Usuario y contraseña requeridos" };
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" };
  }

  console.log("[createUser] Intentando crear usuario:", username, "role:", role);
  
  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    console.log("[createUser] Usuario ya existe:", username);
    return { error: "El usuario ya existe" };
  }

  const settings = await prisma.settings.findUnique({ where: { id: "global" } });
  const affiliateDefaultRate = settings?.affiliateCommissionRate ?? 0.10;
  const deliveryDefaultRate = settings?.deliveryCommissionRate ?? 0.20;

  const validRoles = ["ADMIN", "AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF", "CUSTOMER"];
  const userRole = validRoles.includes(role) ? role : "AFFILIATE";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      name: name || username,
      role: userRole,
      wallet: typeof wallet === "number" && wallet >= 0 ? wallet : 0,
      phone: phone || null,
      ci: ci || null,
    },
    select: { id: true, username: true, name: true, role: true, wallet: true, createdAt: true },
  });

  if (userRole === "AFFILIATE") {
    const affiliateCode = `AF${username.toUpperCase().replace(/[^A-Z0-9]/g, "")}${Date.now().toString(36).toUpperCase()}`;
    await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        code: affiliateCode,
        commissionRate: affiliateDefaultRate,
      },
    });
  }

  if (userRole === "DELIVERY") {
    await prisma.deliveryProfile.create({
      data: {
        userId: user.id,
        commissionRate: deliveryDefaultRate,
        pendingBalance: 0,
        totalDeliveries: 0,
      },
    });
  }

  return { user: { ...user, createdAt: user.createdAt.toISOString() } };
}

export async function updateUser(id: string, name: string, role: string, wallet: number, password: string | null, phone?: string, ci?: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  if (!id) {
    return { error: "ID requerido" };
  }

  const settings = await prisma.settings.findUnique({ where: { id: "global" } });
  const deliveryDefaultRate = settings?.deliveryCommissionRate ?? 0.20;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined && ["ADMIN", "AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF", "CUSTOMER"].includes(role)) updateData.role = role;
  if (typeof wallet === "number" && wallet >= 0) updateData.wallet = wallet;
  if (phone !== undefined) updateData.phone = phone || null;
  if (ci !== undefined) updateData.ci = ci || null;

  if (password && password.length >= 6) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  const currentUser = await prisma.user.findUnique({ where: { id } });
  const previousRole = currentUser?.role;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, wallet: true, createdAt: true },
  });

  if (role === "DELIVERY" && previousRole !== "DELIVERY") {
    const existingProfile = await prisma.deliveryProfile.findUnique({
      where: { userId: id },
    });
    if (!existingProfile) {
      await prisma.deliveryProfile.create({
        data: {
          userId: id,
          commissionRate: deliveryDefaultRate,
          pendingBalance: 0,
          totalDeliveries: 0,
        },
      });
    }
  }

  return { user: { ...user, createdAt: user.createdAt.toISOString() } };
}

export async function deleteUser(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  if (!id) {
    return { error: "ID requerido" };
  }

  const userToDelete = await prisma.user.findUnique({ where: { id } });
  if (!userToDelete) {
    return { error: "Usuario no encontrado" };
  }

  if (userToDelete.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "No se puede eliminar el último administrador" };
    }
  }

  await prisma.user.delete({ where: { id } });

  return { success: true };
}

export async function getAffiliates() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "AFFILIATE")) {
    return { error: "No autorizado" };
  }

  const affiliates = await prisma.affiliateProfile.findMany({
    include: {
      user: { select: { name: true, username: true, wallet: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const affiliateIds = affiliates.map((a) => a.id);
  const orderItems = await prisma.orderItem.findMany({
    where: { affiliateId: { in: affiliateIds } },
    select: { affiliateId: true },
  });
  const orderCountMap = new Map<string, number>();
  for (const item of orderItems) {
    if (item.affiliateId) {
      orderCountMap.set(item.affiliateId, (orderCountMap.get(item.affiliateId) || 0) + 1);
    }
  }

  const affiliateData = affiliates.map((a) => ({
    id: a.id,
    code: a.code,
    commissionRate: a.commissionRate,
    wallet: a.user.wallet || 0,
    totalOrders: orderCountMap.get(a.id) || 0,
    user: { name: a.user.name, username: a.user.username },
  }));

  return { affiliates: affiliateData };
}

export async function getAdminProducts() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: { select: { id: true, name: true } } },
  });

  return { products: products.map((p) => ({ 
    ...p, 
    createdAt: p.createdAt.toISOString(),
    supplierId: p.supplierId,
    supplierName: p.supplier?.name || null,
  })) };
}

export async function createProduct(data: {
  name: string;
  slug: string;
  description?: string;
  price: number;
  purchasePrice?: number;
  comparePrice?: number;
  image?: string;
  stock: number;
  category?: string;
  isActive?: boolean;
  supplierId?: string;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || "",
      price: data.price,
      purchasePrice: data.purchasePrice || null,
      comparePrice: data.comparePrice || null,
      image: data.image || "",
      stock: data.stock,
      category: data.category || null,
      isActive: data.isActive ?? true,
      supplierId: data.supplierId || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/categoria/[category]", "page");

  return { product: { ...product, createdAt: product.createdAt.toISOString() } };
}

export async function updateProduct(id: string, data: {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  purchasePrice?: number;
  comparePrice?: number;
  image?: string;
  stock?: number;
  category?: string;
  isActive?: boolean;
  supplierId?: string | null;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/categoria/[category]", "page");

  return { product };
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  await prisma.product.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/categoria/[category]", "page");

  return { success: true };
}

export async function getAdminCategories() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });

  return { categories: categories.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })) };
}

export async function getSuppliers() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const suppliers = await prisma.user.findMany({
    where: { role: "SUPPLIER" },
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });

  return { suppliers };
}

export async function createCategory(data: { name: string; slug: string; image?: string; isActive?: boolean }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const category = await prisma.category.create({ data });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/categoria/[category]", "page");

  return { category: { ...category, createdAt: category.createdAt.toISOString() } };
}

export async function updateCategory(id: string, data: { name?: string; slug?: string; image?: string; isActive?: boolean }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const category = await prisma.category.update({ where: { id }, data });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/categoria/[category]", "page");

  return { category };
}

export async function deleteCategory(id: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/categoria/[category]", "page");

  return { success: true };
}

export async function updateAllCommissionRates(affiliateRate: number, deliveryRate: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  if (typeof affiliateRate !== "number" || affiliateRate < 0 || affiliateRate > 1) {
    return { error: "Tasa de afiliado inválida" };
  }

  if (typeof deliveryRate !== "number" || deliveryRate < 0 || deliveryRate > 1) {
    return { error: "Tasa de delivery inválida" };
  }

  await prisma.affiliateProfile.updateMany({
    data: { commissionRate: affiliateRate },
  });

  await prisma.deliveryProfile.updateMany({
    data: { commissionRate: deliveryRate },
  });

  await prisma.settings.upsert({
    where: { id: "global" },
    update: { affiliateCommissionRate: affiliateRate, deliveryCommissionRate: deliveryRate },
    create: { id: "global", affiliateCommissionRate: affiliateRate, deliveryCommissionRate: deliveryRate },
  });

  return { success: true };
}

export async function getWorkers() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const workers = await prisma.user.findMany({
    where: {
      role: { in: ["AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF"] },
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      wallet: true,
    },
    orderBy: { role: "asc" },
  });

  return { workers };
}

export async function getGlobalCashBox() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const result = await prisma.user.aggregate({
    where: {
      role: { not: "CUSTOMER" },
    },
    _sum: {
      wallet: true,
    },
  });

  return { total: result._sum.wallet || 0 };
}

export async function payWorker(userId: string, amount: number) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { wallet: true, name: true },
  });

  if (!user) {
    return { error: "Usuario no encontrado" };
  }

  const currentWallet = user.wallet || 0;
  
  if (typeof amount !== "number" || amount <= 0) {
    return { error: "Cantidad inválida" };
  }

  if (amount > currentWallet) {
    return { error: "Cantidad mayor al saldo disponible" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { wallet: { decrement: amount } },
      select: { wallet: true, name: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        amount,
        type: "WORKER_PAYOUT",
        description: `Pago a trabajador: ${user.name || "Sin nombre"}`,
      },
    });

    return updatedUser;
  });

  return { wallet: updated.wallet, success: true };
}

export async function payAllWorkers() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const workers = await prisma.user.findMany({
    where: {
      role: { in: ["AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF"] },
      wallet: { gt: 0 },
    },
    select: { id: true, name: true, wallet: true },
  });

  if (workers.length === 0) {
    return { processed: 0, totalAmount: 0, success: true };
  }

  let totalAmount = 0;
  const results = await prisma.$transaction(async (tx) => {
    const txResults = [];
    for (const worker of workers) {
      const amount = worker.wallet || 0;
      if (amount > 0) {
        await tx.user.update({
          where: { id: worker.id },
          data: { wallet: { decrement: amount } },
        });

        await tx.walletTransaction.create({
          data: {
            userId: worker.id,
            amount,
            type: "WORKER_PAYOUT",
            description: `Pago total a trabajador: ${worker.name || "Sin nombre"}`,
          },
        });

        totalAmount += amount;
        txResults.push({ id: worker.id, amount });
      }
    }
    return txResults;
  });

  return { processed: results.length, totalAmount, success: true };
}

export async function getPaymentHistory() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: { type: "WORKER_PAYOUT" },
    include: {
      user: { select: { name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      userName: t.user?.name || "Desconocido",
      userUsername: t.user?.username || "",
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function getBonusConfig() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  let config = await prisma.bonusConfig.findUnique({
    where: { id: "global" },
  });

  if (!config) {
    config = await prisma.bonusConfig.create({
      data: {
        id: "global",
        requiredOrders: 5,
        discountPercent: 0.1,
        targetType: "ALL",
        targetIds: "[]",
        isActive: false,
      },
    });
  }

  return {
    requiredOrders: config.requiredOrders,
    discountPercent: config.discountPercent,
    targetType: config.targetType,
    targetIds: JSON.parse(config.targetIds || "[]"),
    isActive: config.isActive,
  };
}

export async function updateBonusConfig(data: {
  requiredOrders?: number;
  discountPercent?: number;
  targetType?: string;
  targetIds?: string[];
  isActive?: boolean;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const updateData: Record<string, unknown> = {};
  if (data.requiredOrders !== undefined) updateData.requiredOrders = data.requiredOrders;
  if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
  if (data.targetType !== undefined) updateData.targetType = data.targetType;
  if (data.targetIds !== undefined) updateData.targetIds = JSON.stringify(data.targetIds);
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const config = await prisma.bonusConfig.upsert({
    where: { id: "global" },
    update: updateData,
    create: {
      id: "global",
      requiredOrders: data.requiredOrders ?? 5,
      discountPercent: data.discountPercent ?? 0.1,
      targetType: data.targetType ?? "ALL",
      targetIds: JSON.stringify(data.targetIds ?? []),
      isActive: data.isActive ?? false,
    },
  });

  return {
    requiredOrders: config.requiredOrders,
    discountPercent: config.discountPercent,
    targetType: config.targetType,
    targetIds: JSON.parse(config.targetIds || "[]"),
    isActive: config.isActive,
  };
}

export async function getProductsAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return [];
  }

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return products;
}

export async function getCategoriesAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return [];
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return categories;
}