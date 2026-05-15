import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { affiliateCommissionRate, deliveryCommissionRate } = body;

    if (
      typeof affiliateCommissionRate !== "number" ||
      affiliateCommissionRate < 0 ||
      affiliateCommissionRate > 1
    ) {
      return NextResponse.json(
        { error: "Tasa de comisión de afiliado inválida (0-100%)" },
        { status: 400 }
      );
    }

    if (
      typeof deliveryCommissionRate !== "number" ||
      deliveryCommissionRate < 0 ||
      deliveryCommissionRate > 1
    ) {
      return NextResponse.json(
        { error: "Tasa de comisión de delivery inválida (0-100%)" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.affiliateProfile.updateMany({
        data: { commissionRate: affiliateCommissionRate },
      }),
      prisma.deliveryProfile.updateMany({
        data: { commissionRate: deliveryCommissionRate },
      }),
      prisma.settings.upsert({
        where: { id: "global" },
        update: {
          affiliateCommissionRate,
          deliveryCommissionRate,
        },
        create: {
          id: "global",
          affiliateCommissionRate,
          deliveryCommissionRate,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error applying commission rates:", error);
    return NextResponse.json(
      { error: "Error al aplicar comisiones" },
      { status: 500 }
    );
  }
}