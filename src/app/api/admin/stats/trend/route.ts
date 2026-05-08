import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await prisma.order.findMany({
      where: {
        status: "CONFIRMED",
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const dailySales: Record<string, number> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailySales[dateKey] = 0;
    }

    orders.forEach((order) => {
      const dateKey = order.createdAt.toISOString().split("T")[0];
      if (dailySales[dateKey] !== undefined) {
        dailySales[dateKey] += order.total;
      }
    });

    const result = Object.entries(dailySales)
      .map(([date, total]) => ({ date, total }))
      .reverse();

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const avgDaily = totalRevenue / days;

    return NextResponse.json({
      data: result,
      summary: {
        totalRevenue,
        avgDaily,
        totalOrders: orders.length,
      },
    });
  } catch (error) {
    console.error("Error fetching sales trend:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}