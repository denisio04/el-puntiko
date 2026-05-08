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
      select: { id: true, wallet: true, name: true, username: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: supplier.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      wallet: supplier.wallet,
      name: supplier.name,
      username: supplier.username,
      transactions: transactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching supplier wallet:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest();
  if (!auth || (auth.user.role !== "SUPPLIER" && auth.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    const supplier = await prisma.user.findFirst({
      where: { role: "SUPPLIER" },
      select: { id: true, wallet: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    }

    if (supplier.wallet < amount) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: supplier.id },
      data: { wallet: { decrement: amount } },
      select: { wallet: true },
    });

    await prisma.walletTransaction.create({
      data: {
        userId: supplier.id,
        amount: -amount,
        type: "WITHDRAW",
        description: "Retiro de wallet",
      },
    });

    return NextResponse.json({ wallet: updated.wallet });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}