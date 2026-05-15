import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    let config = await prisma.bonusConfig.findUnique({
      where: { id: "global" },
    });

    if (!config) {
      config = await prisma.bonusConfig.create({
        data: {
          id: "global",
          requiredOrders: 5,
          discountPercent: 0.1,
          targetType: "ALL",
          targetIds: "[]",
          isActive: false,
        },
      });
    }

    const targetIds = JSON.parse(config.targetIds || "[]");

    return NextResponse.json({
      requiredOrders: config.requiredOrders,
      discountPercent: config.discountPercent,
      targetType: config.targetType,
      targetIds: targetIds,
      isActive: config.isActive,
    });
  } catch (error) {
    console.error("Error fetching bonus config:", error);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { requiredOrders, discountPercent, targetType, targetIds, isActive } = body;

    if (requiredOrders !== undefined) {
      if (typeof requiredOrders !== "number" || requiredOrders < 1) {
        return NextResponse.json({ error: "Pedidos mínimos debe ser al menos 1" }, { status: 400 });
      }
    }

    if (discountPercent !== undefined) {
      if (typeof discountPercent !== "number" || discountPercent < 0 || discountPercent > 1) {
        return NextResponse.json({ error: "Porcentaje debe estar entre 0 y 1" }, { status: 400 });
      }
    }

    if (targetType !== undefined) {
      if (!["ALL", "PRODUCTS", "CATEGORIES"].includes(targetType)) {
        return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
      }
    }

    if (targetIds !== undefined) {
      if (!Array.isArray(targetIds)) {
        return NextResponse.json({ error: "targetIds debe ser array" }, { status: 400 });
      }
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: "isActive debe ser booleano" }, { status: 400 });
      }
    }

    const configData: Record<string, unknown> = {};
    if (requiredOrders !== undefined) configData.requiredOrders = requiredOrders;
    if (discountPercent !== undefined) configData.discountPercent = discountPercent;
    if (targetType !== undefined) configData.targetType = targetType;
    if (targetIds !== undefined) configData.targetIds = JSON.stringify(targetIds);
    if (isActive !== undefined) configData.isActive = isActive;

    const config = await prisma.bonusConfig.upsert({
      where: { id: "global" },
      update: configData,
      create: {
        id: "global",
        requiredOrders: requiredOrders ?? 5,
        discountPercent: discountPercent ?? 0.1,
        targetType: targetType ?? "ALL",
        targetIds: JSON.stringify(targetIds ?? []),
        isActive: isActive ?? false,
      },
    });

    const targetIdsParsed = JSON.parse(config.targetIds || "[]");

    return NextResponse.json({
      requiredOrders: config.requiredOrders,
      discountPercent: config.discountPercent,
      targetType: config.targetType,
      targetIds: targetIdsParsed,
      isActive: config.isActive,
    });
  } catch (error) {
    console.error("Error updating bonus config:", error);
    return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
  }
}