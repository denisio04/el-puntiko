import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

interface DeliveryStats {
  wallet: number;
  pendingBalance: number;
  totalDeliveries: number;
  commissionRate: number;
  pendingOrders: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user.role !== "DELIVERY" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

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