import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();

  try {
    const [totalOrders, pendingOrders, confirmedOrders, cancelledOrders, affiliates, ordersWithItems] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.affiliateProfile.count(),
      prisma.order.findMany({
        where: { status: "CONFIRMED" },
        include: { items: true },
      }),
    ]);

    let totalSales = 0;
    let totalProviderCost = 0;

    for (const order of ordersWithItems) {
      totalSales += order.total;
      const providerCost = order.items.reduce((sum, item) => {
        return sum + (item.purchasePrice ? item.purchasePrice * item.quantity : 0);
      }, 0);
      totalProviderCost += providerCost;
    }

    const totalProfit = totalSales - totalProviderCost;

    return NextResponse.json({
      totalOrders,
      totalSales,
      totalProfit,
      totalProviderCost,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      affiliates,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}