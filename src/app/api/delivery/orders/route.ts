import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== "DELIVERY" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const orders = await prisma.order.findMany({
      where: { deliveryId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        customerAddress: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}