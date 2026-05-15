import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { rateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { broadcastStockUpdate } from "@/lib/stock";

async function getAuthFromRequest(): Promise<{ user: { id: string; role: string } } | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return { user: { id: session.user.id as string, role: session.user.role as string } };
    }
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return null;
}

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function sanitizeRefCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 20);
}

export async function GET() {
  const auth = await getAuthFromRequest();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
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

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener pedidos" },
      { status: 500 }
    );
  }
}

// --- POST: crear orden (público, pero con validaciones) ---

export async function POST(request: NextRequest) {
  const rl = rateLimit(`orders:${getRateLimitKey(request)}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rl.retryAfter} segundos.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const auth = await getAuthFromRequest();
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const customerUser = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!customerUser || customerUser.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Cliente no válido" }, { status: 400 });
    }

    const body = await request.json();

    const { notes, items, subtotal, total, usedBonus } = body;

    const customerName = customerUser.name || "";
    const customerPhone = customerUser.phone || "";
    const customerAddress = customerUser.address || "";

    if (!customerName || !customerPhone || !customerAddress || !items?.length) {
      return NextResponse.json(
        { error: "Completa tus datos de perfil para poder hacer pedidos" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    // --- 1. Validar stock disponible ANTES de cualquier cambio ---
    const productIds = items.map((item: { id: string }) => item.id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const stockMap = new Map(products.map((p) => [p.id, p.stock]));

    for (const item of items) {
      const available = stockMap.get(item.id) ?? 0;
      if (available < item.quantity) {
        const product = products.find((p) => p.id === item.id);
        const name = product?.name ?? item.id;
        return NextResponse.json(
          { error: `Stock insuficiente para "${name}". Disponible: ${available}` },
          { status: 409 }
        );
      }
    }

    const orderNumber = generateOrderNumber();

    // --- 2. Transacción: crear orden + descontar stock ---
    const order = await prisma.$transaction(async (tx) => {
      // Mapear affiliateId por cada item según affiliateCode enviado desde el carrito
      const itemAffiliateMap = new Map<string, string | null>();
      
      for (const item of items) {
        const code = item.affiliateCode;
        if (code && code.length > 0) {
          const sanitizedCode = sanitizeRefCode(code);
          if (sanitizedCode && sanitizedCode.length > 0) {
            const profile = await tx.affiliateProfile.findUnique({
              where: { code: sanitizedCode },
            });
            itemAffiliateMap.set(item.id, profile?.id ?? null);
          } else {
            itemAffiliateMap.set(item.id, null);
          }
        } else {
          itemAffiliateMap.set(item.id, null);
        }
      }

      if (usedBonus === true) {
        await tx.user.update({
          where: { id: auth.user.id },
          data: { lastBonusUsedAt: new Date(), bonusProductsUsed: 0 },
        });
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerPhone,
          customerAddress,
          customerId: auth.user.id,
          notes: notes || "",
          subtotal,
          total,
          usedBonus: usedBonus === true,
          items: {
            create: items.map((item: { id: string; price: number; quantity: number; purchasePrice?: number; affiliateCode?: string }) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              purchasePrice: item.purchasePrice ?? null,
              affiliateId: itemAffiliateMap.get(item.id) ?? undefined,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Descontar stock con condición de carrera: solo si stock >= cantidad
      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: {
            id: item.id,
            stock: { gte: item.quantity }, // ← previene condición de carrera
          },
          data: {
            stock: { decrement: item.quantity },
          },
        });
        // Si no se actualizó ninguna fila, el stock cambió entre lectura y escritura
        if (updated.count === 0) {
          throw new Error(
            `Stock insuficiente para el producto ID=${item.id} ( race condition)`
          );
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

      for (const item of newOrder.items) {
        if (item.affiliateId) {
          const itemAffiliate = await tx.affiliateProfile.findUnique({
            where: { id: item.affiliateId },
          });
          if (itemAffiliate) {
            const itemTotal = item.price * item.quantity;
            const itemCost = (item.purchasePrice ?? 0) * item.quantity;
            const itemProfit = itemTotal - itemCost;
            const itemCommission = itemProfit > 0 
              ? Math.round(itemProfit * (itemAffiliate.commissionRate ?? 0.1) * 100) / 100
              : 0;
            if (itemCommission > 0) {
              await tx.walletTransaction.create({
                data: {
                  userId: itemAffiliate.userId,
                  amount: itemCommission,
                  type: "COMMISSION_PENDING",
                  description: `Comisión por ${item.quantity}x ${item.product?.name ?? 'producto'}`,
                  orderId: newOrder.id,
                },
              });
              await tx.affiliateProfile.update({
                where: { id: item.affiliateId },
                data: { pendingBalance: { increment: itemCommission } },
              });
            }
          }
        }
      }

      return newOrder;
    });

    await prisma.cartReservation.deleteMany({
      where: {
        userId: auth.user.id,
        productId: { in: productIds },
      },
    });

    const broadcastPromises = productIds.map((pid: string) =>
      broadcastStockUpdate(pid).catch(() => {})
    );
    Promise.all(broadcastPromises).catch(() => {});

    console.log("Order created:", order.id);

    return NextResponse.json({ success: true, orderId: order.id, orderNumber });
  } catch (error) {
    console.error("Error creating order:", error);
    const isProduction = process.env.NODE_ENV === "production";
    const message =
      error instanceof Error
        ? isProduction
          ? "Error al crear el pedido"
          : error.message
        : "Error al crear el pedido";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}