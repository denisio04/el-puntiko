import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const topAffiliates = await prisma.affiliateProfile.findMany({
      take: 5,
      include: {
        user: {
          select: {
            username: true,
            name: true,
            wallet: true,
          },
        },
        orderItems: {
          select: { id: true },
        },
      },
    });

    const sorted = topAffiliates.sort((a, b) => (b.user.wallet || 0) - (a.user.wallet || 0));

    const result = sorted.map((aff) => ({
      id: aff.id,
      code: aff.code,
      name: aff.user.name || aff.user.username,
      totalEarnings: aff.user.wallet || 0,
      totalOrders: aff.orderItems.length,
      commissionRate: aff.commissionRate,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching top affiliates:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}