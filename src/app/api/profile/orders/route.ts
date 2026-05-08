import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

async function getAuthFromRequest() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return { user: { id: session.user.id as string, role: session.user.role as string } };
    }
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return null;
}

// GET /api/profile/orders - Obtener pedidos del usuario autenticado
export async function GET() {
  const auth = await getAuthFromRequest();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { customerId: auth.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching profile orders:", error);
    return NextResponse.json({ error: "Error al obtener pedidos" }, { status: 500 });
  }
}