import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      await prisma.settings.create({
        data: {
          id: "global",
          affiliateCommissionRate: 0.10,
          deliveryCommissionRate: 0.20,
        },
      });
    }

    const result = await prisma.settings.findUnique({
      where: { id: "global" },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { affiliateCommissionRate, deliveryCommissionRate, contactStaffId, contactPhone } = body;

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

    const updateData: Record<string, unknown> = {
      affiliateCommissionRate,
      deliveryCommissionRate,
    };

    if (contactStaffId !== undefined) updateData.contactStaffId = contactStaffId || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;

    const settings = await prisma.settings.upsert({
      where: { id: "global" },
      update: updateData,
      create: {
        id: "global",
        affiliateCommissionRate,
        deliveryCommissionRate,
        contactStaffId: contactStaffId || null,
        contactPhone: contactPhone || null,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}