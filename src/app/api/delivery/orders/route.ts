import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

async function getAuthFromRequest(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const authCookie = cookieHeader.split(";").find(c => c.trim().startsWith("app-authenticated="));
  if (!authCookie) return null;

  const tokenWithPrefix = authCookie.split("=")[1];
  if (!tokenWithPrefix) return null;

  try {
    const token = decodeURIComponent(tokenWithPrefix);
    const parts = token.split("|");
    if (parts.length >= 2) {
      return { userId: parts[0], role: parts[1] };
    }
  } catch (e) {
    return null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || (auth.role !== "DELIVERY" && auth.role !== "ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = auth.userId;

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