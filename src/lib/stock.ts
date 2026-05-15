import { prisma } from "./db";
import { stockEventBus } from "./stockEvents";

export async function getReservedCountsByProduct(): Promise<Map<string, number>> {
  await prisma.cartReservation.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const reservations = await prisma.cartReservation.groupBy({
    by: ["productId"],
    where: { expiresAt: { gte: new Date() } },
    _sum: { quantity: true },
  });

  const map = new Map<string, number>();
  for (const r of reservations) {
    map.set(r.productId, r._sum.quantity ?? 0);
  }
  return map;
}

export function computeAvailableStock(
  stock: number,
  reservedCounts: Map<string, number>,
  productId: string
): number {
  const reserved = reservedCounts.get(productId) ?? 0;
  return Math.max(0, stock - reserved);
}

export async function broadcastStockUpdate(productId: string): Promise<void> {
  await prisma.cartReservation.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });
  if (!product) return;

  const reserved = await prisma.cartReservation.aggregate({
    where: { productId, expiresAt: { gte: new Date() } },
    _sum: { quantity: true },
  });

  const totalReserved = reserved._sum.quantity ?? 0;
  const availableStock = Math.max(0, product.stock - totalReserved);
  stockEventBus.broadcast(productId, availableStock);
}
