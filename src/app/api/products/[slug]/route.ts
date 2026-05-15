import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getReservedCountsByProduct, computeAvailableStock } from "@/lib/stock";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const reservedCounts = await getReservedCountsByProduct();

    return NextResponse.json({
      ...product,
      availableStock: computeAvailableStock(product.stock, reservedCounts, product.id),
    });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener el producto" },
      { status: 500 }
    );
  }
}