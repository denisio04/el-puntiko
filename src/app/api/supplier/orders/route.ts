import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getToken } from "next-auth/jwt";
import type { NextApiRequest } from "next";

async function getAuthFromRequest(): Promise<{ user: { id: string; role: string } } | null> {
  const headersList = await import("next/headers").then((m) => m.headers());
  const cookieHeader = headersList.get("cookie") || "";

  if (!cookieHeader) {
    return null;
  }

  try {
    const token = await getToken({
      req: {
        headers: new Headers({ cookie: cookieHeader }),
      } as unknown as NextApiRequest,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (token?.id && (token.role === "SUPPLIER" || token.role === "ADMIN")) {
      return { user: { id: token.id, role: token.role as string } };
    }
  } catch (e) {
    console.error("getToken error:", e);
  }

  return null;
}

export async function GET() {
  const auth = await getAuthFromRequest();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const supplier = await prisma.user.findFirst({
      where: { role: "SUPPLIER" },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        userId: supplier.id,
        type: "PURCHASE_ORDERS",
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    const ordersMap = new Map<string, typeof transactions[0]>();
    for (const tx of transactions) {
      if (tx.order && tx.orderId && !ordersMap.has(tx.orderId)) {
        ordersMap.set(tx.orderId, tx);
      }
    }

    const orders = Array.from(ordersMap.values()).map((tx) => ({
      id: tx.order!.id,
      orderNumber: tx.order!.orderNumber,
      total: tx.order!.total,
      status: tx.order!.status,
      createdAt: tx.order!.createdAt.toISOString(),
      amount: tx.amount,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching supplier orders:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}