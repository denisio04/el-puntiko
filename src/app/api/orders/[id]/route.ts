import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { ORDER_STATUS } from "@/lib/constants";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin();
    if (!auth) return adminUnauthorized();

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status requerido" }, { status: 400 });
    }

    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const oldStatus = order.status;
    if (oldStatus === status) {
      return NextResponse.json(order);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: { include: { product: true } } },
      });

      const providerCost = order.items.reduce((sum, item) => {
        return sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0);
      }, 0);
      const profit = order.total - providerCost;

      if (oldStatus === "CONFIRMED" && status !== "CONFIRMED") {
        if (order.customerId && !order.usedBonus) {
          await tx.user.update({
            where: { id: order.customerId },
            data: { bonusProductsUsed: { decrement: 1 } },
          });
        }
        const deliveryTransactions = await tx.walletTransaction.findMany({
          where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
        });
        if (deliveryTransactions.length > 0 && order.deliveryId) {
          const deliveryAmount = deliveryTransactions.reduce((sum, t) => sum + t.amount, 0);
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

        const adminTransactions = await tx.walletTransaction.findMany({
          where: { orderId: order.id, type: "PROFIT" },
        });
        const admins = await tx.user.findMany({ where: { role: "ADMIN" } });
        if (admins.length > 0 && adminTransactions.length > 0) {
          const totalAdminProfit = adminTransactions.reduce((sum, t) => sum + t.amount, 0);
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

        const affiliateTransactions = await tx.walletTransaction.findMany({
          where: { orderId: order.id, type: "COMMISSION" },
        });
        const processedAffiliates = new Set();
        for (const item of order.items) {
          if (item.affiliateId && !processedAffiliates.has(item.affiliateId)) {
            processedAffiliates.add(item.affiliateId);
            const affiliate = await tx.affiliateProfile.findUnique({
              where: { id: item.affiliateId },
            });
            if (affiliate) {
              const affiliateAmount = affiliateTransactions.reduce((sum, t) => sum + t.amount, 0);
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

        const supplier = await tx.user.findFirst({ where: { role: "SUPPLIER" } });
        if (supplier && providerCost > 0) {
          await tx.user.update({
            where: { id: supplier.id },
            data: { wallet: { decrement: providerCost } },
          });
        }

        await tx.walletTransaction.deleteMany({
          where: { orderId: order.id, type: { in: ["COMMISSION", "DELIVERY_COMMISSION", "PROFIT", "PURCHASE_ORDERS"] } },
        });

        if (status === "CANCELLED") {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      if (status === "CONFIRMED" && oldStatus !== "CONFIRMED") {
        console.log("Confirming order, usedBonus:", order.usedBonus, "customerId:", order.customerId);
        if (order.usedBonus && order.customerId) {
          console.log("Resetting bonusProductsUsed to 0");
          await tx.user.update({
            where: { id: order.customerId },
            data: { lastBonusUsedAt: new Date(), bonusProductsUsed: 0 },
          });
        } else if (order.customerId) {
          console.log("Incrementing bonusProductsUsed by 1");
          await tx.user.update({
            where: { id: order.customerId },
            data: { bonusProductsUsed: { increment: 1 } },
          });
        }

        const existingProfitTx = await tx.walletTransaction.findFirst({
          where: { orderId: order.id, type: "PROFIT" },
        });
        if (existingProfitTx) {
          return NextResponse.json(updated);
        }

        const existingDeliveryTx = await tx.walletTransaction.findFirst({
          where: { orderId: order.id, type: "DELIVERY_COMMISSION" },
        });
        if (existingDeliveryTx) {
          return NextResponse.json(updated);
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
                where: { orderId: order.id, userId: affiliate.userId, type: "COMMISSION_PENDING" },
              });
              if (pendingTx) {
                const commissionAmount = pendingTx.amount;
                const currentAmount = affiliateCommissions.get(affiliate.userId) || 0;
                affiliateCommissions.set(affiliate.userId, currentAmount + commissionAmount);

                await tx.user.update({
                  where: { id: affiliate.userId },
                  data: { wallet: { increment: commissionAmount } },
                });
                await tx.walletTransaction.update({
                  where: { id: pendingTx.id },
                  data: {
                    type: "COMMISSION",
                    description: `Comisión por producto "${item.product?.name || 'item'}" - Orden ${order.orderNumber}`
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

        const totalAffiliateCommission = Array.from(affiliateCommissions.values()).reduce((sum, amt) => sum + amt, 0);
        const remainingProfit = profit - deliveryAmount - totalAffiliateCommission;

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

      if (status === "CANCELLED" && oldStatus !== "CANCELLED" && oldStatus !== "CONFIRMED") {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        if (order.customerId && !order.usedBonus) {
          await tx.user.update({
            where: { id: order.customerId },
            data: { bonusProductsUsed: { decrement: 1 } },
          });
        }
      }

      return updated;
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}