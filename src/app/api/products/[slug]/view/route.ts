import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.product.update({
      where: { slug: params.slug },
      data: { views: { increment: 1 } },
      select: { views: true },
    });

    return NextResponse.json({ success: true, views: updated.views });
  } catch {
    return NextResponse.json(
      { error: "Error al registrar vista" },
      { status: 500 }
    );
  }
}
