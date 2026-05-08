import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const affiliates = await prisma.affiliateProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            wallet: true,
          },
        },
        orderItems: {
          select: { id: true, orderId: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedAffiliates = affiliates.map((affiliate) => ({
      id: affiliate.id,
      code: affiliate.code,
      commissionRate: affiliate.commissionRate,
      wallet: affiliate.user.wallet || 0,
      totalOrders: affiliate.orderItems.length,
      user: {
        id: affiliate.user.id,
        username: affiliate.user.username,
        name: affiliate.user.name,
      },
      createdAt: affiliate.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedAffiliates);
  } catch (error) {
    console.error("Error fetching affiliates:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}