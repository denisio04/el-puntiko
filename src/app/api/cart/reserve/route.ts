import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { broadcastStockUpdate } from "@/lib/stock";

export const dynamic = 'force-dynamic';

async function getAuthUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id as string;
  } catch {}
  return null;
}

function getExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return d;
}

async function cleanupExpiredReservations() {
  await prisma.cartReservation.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body as { items: Array<{ productId: string; quantity: number }> };

    if (!items?.length) {
      return NextResponse.json({ error: "No hay productos para reservar" }, { status: 400 });
    }

    await cleanupExpiredReservations();

    const result: { productId: string; reserved: number; available: number }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Producto no encontrado: ${item.productId}`);
        }

        const otherReserved = await tx.cartReservation.aggregate({
          where: {
            productId: item.productId,
            userId: { not: userId },
          },
          _sum: { quantity: true },
        });
        const otherQty = otherReserved._sum.quantity ?? 0;

        const existing = await tx.cartReservation.findUnique({
          where: {
            productId_userId: { productId: item.productId, userId },
          },
        });
        const existingQty = existing?.quantity ?? 0;

        const newRequestedQty = existingQty + item.quantity;
        const availableStock = product.stock - otherQty;

        if (availableStock < newRequestedQty) {
          throw new Error(
            `Stock insuficiente para "${product.name}". Disponible: ${Math.max(0, availableStock)}`
          );
        }

        if (existing) {
          await tx.cartReservation.update({
            where: { id: existing.id },
            data: {
              quantity: newRequestedQty,
              expiresAt: getExpiresAt(),
            },
          });
        } else {
          await tx.cartReservation.create({
            data: {
              productId: item.productId,
              userId,
              quantity: item.quantity,
              expiresAt: getExpiresAt(),
            },
          });
        }

        result.push({
          productId: item.productId,
          reserved: newRequestedQty,
          available: product.stock - otherQty - newRequestedQty,
        });
      }
    });

    for (const r of result) {
      broadcastStockUpdate(r.productId).catch(() => {});
    }

    return NextResponse.json({ success: true, reservations: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al reservar producto";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body as { items: Array<{ productId: string; quantity?: number }> };

    if (!items?.length) {
      return NextResponse.json({ error: "No hay productos para liberar" }, { status: 400 });
    }

    await cleanupExpiredReservations();

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const existing = await tx.cartReservation.findUnique({
          where: {
            productId_userId: { productId: item.productId, userId },
          },
        });
        if (!existing) continue;

        const qtyToRemove = item.quantity ?? existing.quantity;
        const newQty = existing.quantity - qtyToRemove;

        if (newQty <= 0) {
          await tx.cartReservation.delete({ where: { id: existing.id } });
        } else {
          await tx.cartReservation.update({
            where: { id: existing.id },
            data: { quantity: newQty, expiresAt: getExpiresAt() },
          });
        }
      }
    });

    const broadcastPromises = items.map((item) =>
      broadcastStockUpdate(item.productId).catch(() => {})
    );
    await Promise.all(broadcastPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al liberar reserva";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
