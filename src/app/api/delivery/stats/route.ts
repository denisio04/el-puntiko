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
    // Invalid token
  }

  return null;
}

interface DeliveryStats {
  wallet: number;
  pendingBalance: number;
  totalDeliveries: number;
  commissionRate: number;
  pendingOrders: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || (auth.role !== "DELIVERY" && auth.role !== "ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = auth.userId;

    // Get user and delivery profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallet: true },
    });

    const deliveryProfile = await prisma.deliveryProfile.findUnique({
      where: { userId },
    });

    const pendingOrdersCount = await prisma.order.count({
      where: {
        deliveryId: userId,
        status: { in: ["PENDING", "ASSIGNED"] },
      },
    });

    if (!deliveryProfile) {
      // Create profile if doesn't exist
      const newProfile = await prisma.deliveryProfile.create({
        data: {
          userId,
          commissionRate: 0.20,
          pendingBalance: 0,
          totalDeliveries: 0,
        },
      });

      return NextResponse.json({
        wallet: user?.wallet || 0,
        pendingBalance: 0,
        totalDeliveries: 0,
        commissionRate: 0.20,
        pendingOrders: pendingOrdersCount,
      });
    }

    return NextResponse.json({
      wallet: user?.wallet || 0,
      pendingBalance: deliveryProfile.pendingBalance,
      totalDeliveries: deliveryProfile.totalDeliveries,
      commissionRate: deliveryProfile.commissionRate,
      pendingOrders: pendingOrdersCount,
    });
  } catch (error) {
    console.error("Error fetching delivery stats:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}