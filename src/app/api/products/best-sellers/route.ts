import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReservedCountsByProduct, computeAvailableStock } from "@/lib/stock";

export async function GET() {
  try {
    const sales = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: {
          status: { in: ["CONFIRMED", "DELIVERED"] },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
    });

    if (sales.length === 0) {
      return NextResponse.json([]);
    }

    const productIds = sales.map((s) => s.productId);

    const [products, reservedCounts] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds }, isActive: true } }),
      getReservedCountsByProduct(),
    ]);

    const salesMap = new Map(
      sales.map((s) => [s.productId, s._sum.quantity ?? 0])
    );

    const result = products
      .map((product) => ({
        ...product,
        salesCount: salesMap.get(product.id) ?? 0,
        availableStock: computeAvailableStock(product.stock, reservedCounts, product.id),
      }))
      .sort((a, b) => b.salesCount - a.salesCount);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    return NextResponse.json(
      { error: "Error fetching best sellers" },
      { status: 500 }
    );
  }
}
