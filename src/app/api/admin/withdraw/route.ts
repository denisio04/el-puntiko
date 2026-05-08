import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();

  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }

    const adminId = auth.user.id;

    const admin = await prisma.user.findFirst({
      where: { id: adminId, role: "ADMIN" },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });
    }

    if (admin.wallet < amount) {
      return NextResponse.json({ error: "Fondos insuficientes" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: admin.id },
      data: { wallet: admin.wallet - amount },
    });

    return NextResponse.json({ wallet: updated.wallet });
  } catch (error) {
    console.error("Error withdrawing:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}