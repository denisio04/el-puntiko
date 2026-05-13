import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAffiliateCode } from "@/lib/affiliate";
import { getToken } from "next-auth/jwt";

async function getAuthFromRequest(request: NextRequest): Promise<{ userId: string; role: string } | null> {
  const nextAuthToken = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production"
  });
  
  if (nextAuthToken && nextAuthToken.id) {
    return { userId: nextAuthToken.id, role: nextAuthToken.role as string };
  }

  return null;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId") ?? auth.userId;

  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  if (userId !== auth.userId && auth.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

const profile = await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                total: true,
                status: true,
                orderNumber: true,
                customerName: true,
                customerPhone: true,
              },
            },
            product: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { id: "desc" },
        },
        user: { select: { wallet: true } },
      },
    });

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const orderMap = new Map<string, any>();
  for (const item of profile.orderItems) {
    const order = item.order;
    if (!orderMap.has(order.id)) {
      const providerCost = profile.orderItems
        .filter(i => i.orderId === order.id)
        .reduce((sum, i) => sum + (i.purchasePrice || 0) * i.quantity, 0);
      const profit = order.total - providerCost;
      orderMap.set(order.id, {
        id: order.id,
        total: order.total,
        status: order.status,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        expectedCommission: profit > 0 ? profit * profile.commissionRate : 0,
      });
    }
  }

  const ordersWithCommission = Array.from(orderMap.values());
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: profile.userId, type: { startsWith: "COMMISSION" } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    code: profile.code,
    commissionRate: profile.commissionRate,
    wallet: profile.user.wallet || 0,
    pendingBalance: profile.pendingBalance || 0,
    totalOrders: profile.orderItems.length,
    commissions: transactions,
    orders: ordersWithCommission,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username } = body;

    const auth = await getAuthFromRequest(request);
    if (!auth || (auth.role !== "ADMIN" && auth.userId !== userId)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!userId || !username) {
      return NextResponse.json(
        { error: "userId y username requeridos" },
        { status: 400 }
      );
    }

    const existingProfile = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return NextResponse.json(existingProfile);
    }

    let code = generateAffiliateCode(username);
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const profile = await prisma.affiliateProfile.create({
          data: {
            userId,
            code,
            commissionRate: 0.1,
          },
        });
        return NextResponse.json(profile);
      } catch (createError) {
        const errorMessage =
          createError instanceof Error ? createError.message : "";
        const isUniqueError =
          errorMessage.includes("Unique constraint") ||
          errorMessage.includes("code_");

        if (isUniqueError && attempts < maxAttempts - 1) {
          code = generateAffiliateCode(username + Date.now().toString(36));
          attempts++;
          continue;
        }
        throw createError;
      }
    }
  } catch (error) {
    console.error("Error creating affiliate profile:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}