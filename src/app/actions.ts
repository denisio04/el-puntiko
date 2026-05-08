"use server";

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  purchasePrice?: number;
  quantity: number;
}

interface CreateOrderParams {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
}

export async function createOrder(params: CreateOrderParams) {
  const { customerName, customerPhone, customerAddress, notes, items, subtotal, total } = params;

  const cookieStore = await cookies();
  const rawRefCode = cookieStore.get("referral_code")?.value || "";
  const referralCode = rawRefCode
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 20);

  let affiliateId: string | null = null;

  if (referralCode.length > 0) {
    const affiliateProfile = await prisma.affiliateProfile.findUnique({
      where: { code: referralCode },
    });
    affiliateId = affiliateProfile?.id || null;
  }

  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        customerName,
        customerPhone,
        customerAddress,
        notes: notes || "",
        subtotal,
        total,
        items: {
          create: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price,
            purchasePrice: item.purchasePrice ?? null,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of items) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.id,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });
      if (updated.count === 0) {
        throw new Error(`Stock insuficiente para el producto ID=${item.id}`);
      }
    }

    const providerCost = items.reduce((sum, item) => {
      return sum + (item.purchasePrice && item.purchasePrice > 0 ? item.purchasePrice * item.quantity : 0);
    }, 0);

    if (providerCost > 0) {
      const admin = await tx.user.findFirst({ where: { role: "ADMIN" } });
      if (admin) {
        await tx.walletTransaction.create({
          data: {
            userId: admin.id,
            amount: providerCost,
            type: "PURCHASE_ORDERS",
            description: `Costo de compra orden ${orderNumber}`,
            orderId: newOrder.id,
          },
        });
      }
    }

    if (affiliateId) {
      const affiliate = await tx.affiliateProfile.findUnique({
        where: { id: affiliateId },
      });
      if (affiliate) {
        const commissionAmount = Math.round(total * (affiliate.commissionRate ?? 0.1) * 100) / 100;
await tx.walletTransaction.create({
            data: {
              userId: affiliate.userId,
              amount: commissionAmount,
              type: "COMMISSION",
              description: `Comisión por orden ${orderNumber}`,
              orderId: newOrder.id,
            },
          });
      }
    }

    return newOrder;
  });

  return order;
}