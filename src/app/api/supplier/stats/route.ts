import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";

async function getAuthFromRequest(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production"
  });
  
  if (token && token.id) {
    return { userId: token.id, role: token.role as string };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth || auth.role !== "SUPPLIER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supplier = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { wallet: true, role: true },
  });

  if (!supplier) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const pendingOrders = await prisma.order.findMany({
    where: { 
      items: { some: { product: { supplierId: auth.userId } } },
      status: "PENDING",
    },
    select: { 
      id: true, 
      total: true,
      items: {
        where: { product: { supplierId: auth.userId } },
        select: { purchasePrice: true, quantity: true },
      },
    },
  });

  const pendingBalance = pendingOrders.reduce((sum, order) => {
    const orderCost = order.items.reduce((itemSum, item) => {
      return itemSum + ((item.purchasePrice || 0) * item.quantity);
    }, 0);
    return sum + orderCost;
  }, 0);

  const confirmedOrders = await prisma.order.findMany({
    where: { 
      items: { some: { product: { supplierId: auth.userId } } },
      status: "CONFIRMED",
    },
  });

  const totalEarned = await prisma.walletTransaction.aggregate({
    where: { userId: auth.userId, type: "PURCHASE_ORDERS" },
    _sum: { amount: true },
  });

  const orderItems = await prisma.orderItem.findMany({
    where: { 
      product: { supplierId: auth.userId },
      order: { status: "CONFIRMED" },
    },
    include: { product: true },
  });

  const productMap = new Map<string, { name: string; sold: number; revenue: number }>();
  for (const item of orderItems) {
    const existing = productMap.get(item.productId) || { name: item.product.name, sold: 0, revenue: 0 };
    existing.sold += item.quantity;
    existing.revenue += (item.purchasePrice || 0) * item.quantity;
    productMap.set(item.productId, existing);
  }

  const topProducts = Array.from(productMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      totalSold: data.sold,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 10);

  const orderIds = Array.from(new Set(orderItems.map((item) => item.orderId)));
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: { id: true, createdAt: true },
  });
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  const dateMap = new Map<string, { orders: number; revenue: number }>();
  for (const item of orderItems) {
    const order = orderMap.get(item.orderId);
    if (order) {
      const date = order.createdAt.toISOString().split("T")[0];
      const existing = dateMap.get(date) || { orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += (item.purchasePrice || 0) * item.quantity;
      dateMap.set(date, existing);
    }
  }

  const ordersByDate = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      orders: data.orders,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const topViewedProducts = await prisma.product.findMany({
    where: { isActive: true, views: { gt: 0 } },
    orderBy: { views: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      views: true,
    },
  });

  return NextResponse.json({
    wallet: supplier.wallet || 0,
    pendingBalance,
    totalSales: confirmedOrders.length,
    totalEarned: totalEarned._sum.amount || 0,
    topProducts,
    topViewedProducts: topViewedProducts.map((p) => ({
      productId: p.id,
      productName: p.name,
      views: p.views,
    })),
    ordersByDate,
  });
}