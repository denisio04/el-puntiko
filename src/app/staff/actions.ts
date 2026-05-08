"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function getStaffWallet() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STAFF") {
    return { wallet: 0, error: "No autorizado" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { wallet: true },
  });

  return { wallet: user?.wallet || 0 };
}

export async function getStaffStats() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STAFF") {
    return { error: "No autorizado" };
  }

  const staffId = session.user.id;

  // Get orders assigned to this staff
  const [totalOrders, completedOrders, pendingOrders, confirmedOrders] =
    await Promise.all([
      prisma.order.count({ where: { staffId } }),
      prisma.order.count({ where: { staffId, status: "CONFIRMED" } }),
      prisma.order.count({ where: { staffId, status: "PENDING" } }),
      prisma.order.count({ where: { staffId, status: "CONFIRMED" } }),
    ]);

  return {
    stats: {
      totalOrders,
      completedOrders,
      pendingOrders,
      confirmedOrders,
    },
  };
}

export async function getStaffOrders() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STAFF") {
    return { error: "No autorizado" };
  }

  // Staff can see all orders (not just their assigned ones) to manage them
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: true,
        },
      },
      delivery: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      staff: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    orders: orders.map((o) => ({ 
      ...o, 
      subtotal: o.subtotal,
      total: o.total,
      createdAt: o.createdAt.toISOString() 
    })),
  };
}

export async function getDeliveryPersons() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STAFF") {
    return { error: "No autorizado" };
  }

  const deliveries = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: { name: "asc" },
  });

  return { deliveries };
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STAFF") {
    return { error: "No autorizado" };
  }

  const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return { error: "Estado inválido" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return { error: "Pedido no encontrado" };
  }

  const oldStatus = order.status;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        staffId: session.user.id,
      },
      include: {
        items: { include: { product: true } },
        delivery: { select: { id: true, name: true, phone: true } },
      },
    });

    if (status === "CONFIRMED" && oldStatus !== "CONFIRMED") {
      if (updated.usedBonus && updated.customerId) {
        await tx.user.update({
          where: { id: updated.customerId },
          data: { lastBonusUsedAt: new Date(), bonusProductsUsed: 0 },
        });
      } else if (updated.customerId) {
        await tx.user.update({
          where: { id: updated.customerId },
          data: { bonusProductsUsed: { increment: 1 } },
        });
      }
    }

    if (oldStatus === "CONFIRMED" && status !== "CONFIRMED") {
      const providerCost = order.items.reduce((sum, item) => {
        return (
          sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0)
        );
      }, 0);

      if (order.deliveryId) {
        const deliveryTransactions = await tx.walletTransaction.findMany({
          where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
        });
        if (deliveryTransactions.length > 0) {
          const deliveryAmount = deliveryTransactions.reduce(
            (sum, t) => sum + t.amount,
            0,
          );
          const deliveryUser = await tx.user.findFirst({
            where: { id: order.deliveryId },
          });
          if (deliveryUser) {
            await tx.user.update({
              where: { id: deliveryUser.id },
              data: { wallet: { decrement: deliveryAmount } },
            });
          }
          await tx.walletTransaction.deleteMany({
            where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
          });
          
          const pendingTx = await tx.walletTransaction.findFirst({
            where: { orderId: order.id, userId: order.deliveryId, type: "DELIVERY_PENDING" },
          });

          const deliveryProfile = await tx.deliveryProfile.findUnique({
            where: { userId: order.deliveryId },
          });
          if (deliveryProfile) {
            if (pendingTx) {
              await tx.walletTransaction.update({
                where: { id: pendingTx.id },
                data: { type: "DELIVERY_PENDING" },
              });
              await tx.deliveryProfile.update({
                where: { userId: order.deliveryId },
                data: { 
                  pendingBalance: { increment: deliveryAmount },
                  totalDeliveries: { decrement: 1 },
                },
              });
            } else {
              await tx.deliveryProfile.update({
                where: { userId: order.deliveryId },
                data: { totalDeliveries: { decrement: 1 } },
              });
            }
          }
        }
      }

      // Revertir affiliates
      const affiliateTransactions = await tx.walletTransaction.findMany({
        where: { orderId: order.id, type: "COMMISSION" },
      });

      const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
      const adminTransactions = await tx.walletTransaction.findMany({
        where: { orderId: order.id, type: "PROFIT" },
      });
      if (admins.length > 0 && adminTransactions.length > 0) {
        const totalAdminProfit = adminTransactions.reduce(
          (sum, t) => sum + t.amount,
          0,
        );
        const adminShare = totalAdminProfit / admins.length;
        for (const admin of admins) {
          await tx.user.update({
            where: { id: admin.id },
            data: { wallet: { decrement: adminShare } },
          });
        }
        await tx.walletTransaction.deleteMany({
          where: { orderId: order.id, type: "PROFIT" },
        });
      }

      const processedAffiliates = new Set();
      for (const item of order.items) {
        if (item.affiliateId && !processedAffiliates.has(item.affiliateId)) {
          processedAffiliates.add(item.affiliateId);
          const affiliate = await tx.affiliateProfile.findUnique({
            where: { id: item.affiliateId },
          });
          if (affiliate) {
            const affiliateAmount = affiliateTransactions.reduce(
              (sum, t) => sum + t.amount,
              0,
            );
            if (affiliateAmount > 0) {
              await tx.user.update({
                where: { id: affiliate.userId },
                data: { wallet: { decrement: affiliateAmount } },
              });
              await tx.walletTransaction.create({
                data: {
                  userId: affiliate.userId,
                  amount: affiliateAmount,
                  type: "COMMISSION_PENDING",
                  description: `Comisión revertida por orden ${order.orderNumber}`,
                  orderId: order.id,
                },
              });
              await tx.affiliateProfile.update({
                where: { id: item.affiliateId },
                data: { pendingBalance: { increment: affiliateAmount } },
              });
            }
          }
        }
      }
      await tx.walletTransaction.deleteMany({
        where: { orderId: order.id, type: "COMMISSION" },
      });

      // Revertir supplier
      const supplier = await tx.user.findFirst({ where: { role: "SUPPLIER" } });
      if (supplier && providerCost > 0) {
        await tx.user.update({
          where: { id: supplier.id },
          data: { wallet: { decrement: providerCost } },
        });
      }

      await tx.walletTransaction.deleteMany({
        where: {
          orderId: order.id,
          type: {
            in: [
              "COMMISSION",
              "DELIVERY_COMMISSION",
              "PROFIT",
              "PURCHASE_ORDERS",
            ],
          },
        },
      });
    }

    // Acreditar ganancias cuando se entra a CONFIRMED
    if (status === "CONFIRMED" && oldStatus !== "CONFIRMED") {
      // Verificar si ya tiene transacciones de PROFIT para evitar duplicar
      const existingProfitTx = await tx.walletTransaction.findFirst({
        where: { orderId: order.id, type: "PROFIT" },
      });
      if (existingProfitTx) {
        return {
          order: { ...updated, createdAt: updated.createdAt.toISOString() },
        };
      }

      const existingDeliveryTx = await tx.walletTransaction.findFirst({
        where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
      });
      if (existingDeliveryTx) {
        return {
          order: { ...updated, createdAt: updated.createdAt.toISOString() },
        };
      }

      const providerCost = order.items.reduce((sum, item) => {
        return (
          sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0)
        );
      }, 0);
      const profit = order.total - providerCost;

      // Delivery commission
      let deliveryAmount = 0;
      if (order.deliveryId) {
        const deliveryProfile = await tx.deliveryProfile.findUnique({
          where: { userId: order.deliveryId },
        });
        if (deliveryProfile) {
          const pendingTx = await tx.walletTransaction.findFirst({
            where: { orderId: order.id, userId: order.deliveryId, type: "DELIVERY_PENDING" },
          });

          if (pendingTx) {
            deliveryAmount = pendingTx.amount;
            await tx.walletTransaction.update({
              where: { id: pendingTx.id },
              data: {
                type: "DELIVERY_COMMISSION",
                description: `Entrega orden ${order.orderNumber}`,
              },
            });
            await tx.user.update({
              where: { id: order.deliveryId },
              data: { wallet: { increment: deliveryAmount } },
            });
            await tx.deliveryProfile.update({
              where: { userId: order.deliveryId },
              data: {
                pendingBalance: { decrement: deliveryAmount },
                totalDeliveries: { increment: 1 },
              },
            });
          } else {
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
      }

      // Affiliate commissions
      const affiliateCommissions = new Map<string, number>();
      const processedAffiliates = new Set();

      for (const item of order.items) {
        if (item.affiliateId && !processedAffiliates.has(item.affiliateId)) {
          processedAffiliates.add(item.affiliateId);
          const affiliate = await tx.affiliateProfile.findUnique({
            where: { id: item.affiliateId },
            include: { user: true },
          });
          if (affiliate) {
            const pendingTx = await tx.walletTransaction.findFirst({
              where: {
                orderId: order.id,
                userId: affiliate.userId,
                type: "COMMISSION_PENDING",
              },
            });
            if (pendingTx) {
              const commissionAmount = pendingTx.amount;
              const currentAmount =
                affiliateCommissions.get(affiliate.userId) || 0;
              affiliateCommissions.set(
                affiliate.userId,
                currentAmount + commissionAmount,
              );

              await tx.user.update({
                where: { id: affiliate.userId },
                data: { wallet: { increment: commissionAmount } },
              });
              await tx.walletTransaction.update({
                where: { id: pendingTx.id },
                data: {
                  type: "COMMISSION",
                  description: `Comisión por orden ${order.orderNumber}`,
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

      const totalAffiliateCommission = Array.from(
        affiliateCommissions.values(),
      ).reduce((sum, amt) => sum + amt, 0);
      const remainingProfit =
        profit - deliveryAmount - totalAffiliateCommission;

      // Admin profit
      const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
      if (admins.length > 0 && remainingProfit > 0) {
        const adminShare = remainingProfit / admins.length;
        for (const admin of admins) {
          await tx.user.update({
            where: { id: admin.id },
            data: { wallet: { increment: adminShare } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: admin.id,
              amount: adminShare,
              type: "PROFIT",
              description: `Ganancia orden ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }
      }

      // Supplier payment
      const supplier = await tx.user.findFirst({ where: { role: "SUPPLIER" } });
      if (supplier && providerCost > 0) {
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

    if (
      status === "CANCELLED" &&
      oldStatus !== "CANCELLED" &&
      oldStatus !== "CONFIRMED"
    ) {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return {
      order: { ...updated, createdAt: updated.createdAt.toISOString() },
    };
  });

  return result;
}

export async function assignDeliveryPerson(
  orderId: string,
  deliveryId: string | null,
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "STAFF") {
    return { error: "No autorizado" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    return { error: "Pedido no encontrado" };
  }

  const newDeliveryId = deliveryId === "" || deliveryId === null ? null : deliveryId;
  const previousDeliveryId = order.deliveryId;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        deliveryId: newDeliveryId,
        staffId: session.user.id,
      },
      include: {
        items: { include: { product: true } },
        delivery: { select: { id: true, name: true, phone: true } },
        customer: { select: { name: true, phone: true } },
      },
    });

    if (newDeliveryId && order.status === "PENDING") {
      if (previousDeliveryId && previousDeliveryId !== newDeliveryId) {
        const oldPendingTx = await tx.walletTransaction.findFirst({
          where: { orderId: order.id, userId: previousDeliveryId, type: "DELIVERY_PENDING" },
        });
        if (oldPendingTx) {
          const oldProfile = await tx.deliveryProfile.findUnique({
            where: { userId: previousDeliveryId },
          });
          if (oldProfile) {
            await tx.deliveryProfile.update({
              where: { userId: previousDeliveryId },
              data: { pendingBalance: { decrement: oldPendingTx.amount } },
            });
          }
          await tx.walletTransaction.delete({ where: { id: oldPendingTx.id } });
        }
      }

      const existingPendingTx = await tx.walletTransaction.findFirst({
        where: { orderId: order.id, userId: newDeliveryId, type: "DELIVERY_PENDING" },
      });
      
      if (!existingPendingTx) {
        const providerCost = order.items.reduce((sum, item) => {
          return sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0);
        }, 0);
        const profit = order.total - providerCost;

        const deliveryProfile = await tx.deliveryProfile.findUnique({
          where: { userId: newDeliveryId },
        });

        if (deliveryProfile && profit > 0) {
          const pendingCommission = Math.round(profit * deliveryProfile.commissionRate * 100) / 100;

          await tx.deliveryProfile.update({
            where: { userId: newDeliveryId },
            data: { pendingBalance: { increment: pendingCommission } },
          });

          await tx.walletTransaction.create({
            data: {
              userId: newDeliveryId,
              amount: pendingCommission,
              type: "DELIVERY_PENDING",
              description: `Comisión pendiente orden ${order.orderNumber}`,
              orderId: order.id,
            },
          });
        }
      }
    }

    if (!newDeliveryId && previousDeliveryId && order.status === "PENDING") {
      const pendingTx = await tx.walletTransaction.findFirst({
        where: { orderId: order.id, userId: previousDeliveryId, type: "DELIVERY_PENDING" },
      });

      if (pendingTx) {
        const deliveryProfile = await tx.deliveryProfile.findUnique({
          where: { userId: previousDeliveryId },
        });

        if (deliveryProfile) {
          await tx.deliveryProfile.update({
            where: { userId: previousDeliveryId },
            data: { pendingBalance: { decrement: pendingTx.amount } },
          });
        }

        await tx.walletTransaction.delete({
          where: { id: pendingTx.id },
        });
      }
    }

    return { order: { ...updated, createdAt: updated.createdAt.toISOString() } };
  });

  return result;
}
