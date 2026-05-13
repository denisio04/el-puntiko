import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para solicitar productos" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    if (product.stock > 0) {
      return NextResponse.json(
        { error: "El producto tiene stock disponible. Puedes comprarlo ahora." },
        { status: 400 }
      );
    }

    const existing = await prisma.productRequest.findFirst({
      where: {
        productId: product.id,
        userId: session.user.id as string,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente para este producto" },
        { status: 409 }
      );
    }

    const request_entry = await prisma.productRequest.create({
      data: {
        productId: product.id,
        userId: session.user.id as string,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      requestId: request_entry.id,
      message: `Solicitud registrada para "${product.name}"`,
    });
  } catch (error) {
    console.error("Error creating product request:", error);
    return NextResponse.json(
      { error: "Error al registrar la solicitud" },
      { status: 500 }
    );
  }
}
