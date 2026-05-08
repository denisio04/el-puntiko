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

// GET /api/bonus/progress - Obtener progreso del cliente
export async function GET() {
  const auth = await getAuthFromRequest();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const config = await prisma.bonusConfig.findUnique({
      where: { id: "global" },
    });

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { lastBonusUsedAt: true, bonusProductsUsed: true },
    });

    if (!config || !config.isActive) {
      return NextResponse.json({
        confirmedOrders: 0,
        requiredOrders: config?.requiredOrders ?? 5,
        discountPercent: config?.discountPercent ?? 0.1,
        targetType: config?.targetType ?? "ALL",
        targetIds: config?.targetIds ?? "[]",
        isActive: false,
        productsAffected: 0,
        hasUsedBonus: false,
        canUseBonus: true,
        bonusProductsUsed: 0,
        requiredProducts: 1,
      });
    }

    const pendingWithBonus = await prisma.order.count({
      where: {
        customerId: auth.user.id,
        status: "PENDING",
        usedBonus: true,
      },
    });

    const hasExistingBonusOrder = pendingWithBonus > 0;

    const bonusProductsUsed = user?.bonusProductsUsed ?? 0;
    console.log("bonusProductsUsed:", bonusProductsUsed, "user:", user);
    const hasReached = bonusProductsUsed >= config.requiredOrders;
    const canUseBonus = !hasExistingBonusOrder && !hasReached;

    const confirmedOrders = bonusProductsUsed;

    let productsAffected = 0;
    if (config.targetType === "ALL") {
      productsAffected = await prisma.product.count({
        where: { isActive: true },
      });
    } else if (config.targetType === "PRODUCTS") {
      const targetIds = JSON.parse(config.targetIds || "[]") as string[];
      productsAffected = targetIds.length;
    } else if (config.targetType === "CATEGORIES") {
      const targetIds = JSON.parse(config.targetIds || "[]") as string[];
      productsAffected = await prisma.product.count({
        where: {
          category: { in: targetIds },
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      confirmedOrders,
      requiredOrders: config.requiredOrders,
      discountPercent: config.discountPercent,
      targetType: config.targetType,
      targetIds: config.targetIds,
      isActive: config.isActive,
      hasReached,
      productsAffected,
      hasUsedBonus: user?.bonusProductsUsed !== undefined && user.bonusProductsUsed > 0,
      canUseBonus,
      bonusProductsUsed: user?.bonusProductsUsed ?? 0,
      requiredProducts: config.requiredProducts ?? 1,
    });
  } catch (error) {
    console.error("Error fetching bonus progress:", error);
    return NextResponse.json({ error: "Error al obtener progreso" }, { status: 500 });
  }
}