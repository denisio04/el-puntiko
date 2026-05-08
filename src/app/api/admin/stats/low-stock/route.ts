import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const threshold = 5;

    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lte: threshold,
        },
        isActive: true,
      },
      orderBy: {
        stock: "asc",
      },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        stock: true,
        price: true,
      },
    });

    return NextResponse.json(lowStockProducts);
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}