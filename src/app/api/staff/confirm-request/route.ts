import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId es requerido" },
        { status: 400 }
      );
    }

    const productRequest = await prisma.productRequest.findUnique({
      where: { id: requestId },
      include: {
        product: true,
        user: true,
      },
    });

    if (!productRequest) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      );
    }

    if (
      productRequest.status !== "PENDING" &&
      productRequest.status !== "NOTIFIED"
    ) {
      return NextResponse.json(
        { error: "La solicitud ya fue procesada" },
        { status: 400 }
      );
    }

    if (productRequest.product.stock < 1) {
      return NextResponse.json(
        {
          error: `El producto "${productRequest.product.name}" no tiene stock disponible`,
        },
        { status: 409 }
      );
    }

    const customerName =
      productRequest.user.name ||
      productRequest.user.username ||
      "Cliente";
    const customerPhone = productRequest.user.phone || "";
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName,
          customerPhone,
          customerAddress: productRequest.user.address || "",
          customerId: productRequest.userId,
          staffId: session.user.id as string,
          subtotal: productRequest.product.price,
          total: productRequest.product.price,
          status: "PENDING",
          items: {
            create: {
              productId: productRequest.productId,
              quantity: 1,
              price: productRequest.product.price,
              purchasePrice: productRequest.product.purchasePrice ?? null,
            },
          },
        },
        include: { items: { include: { product: true } } },
      });

      await tx.product.update({
        where: { id: productRequest.productId },
        data: { stock: { decrement: 1 } },
      });

      await tx.productRequest.update({
        where: { id: requestId },
        data: { status: "COMPLETED" },
      });

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      message: `Pedido ${orderNumber} creado para ${customerName}`,
    });
  } catch (error) {
    console.error("Error confirming product request:", error);
    return NextResponse.json(
      { error: "Error al confirmar la solicitud" },
      { status: 500 }
    );
  }
}
