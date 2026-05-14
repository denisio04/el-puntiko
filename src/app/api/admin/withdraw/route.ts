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

    const updated = await prisma.$transaction(async (tx) => {
      const admin = await tx.user.findFirst({
        where: { id: adminId, role: "ADMIN" },
      });

      if (!admin) {
        throw new Error("Admin no encontrado");
      }

      if (admin.wallet < amount) {
        throw new Error("Fondos insuficientes");
      }

      return tx.user.update({
        where: { id: adminId },
        data: { wallet: { decrement: amount } },
        select: { wallet: true },
      });
    });

    return NextResponse.json({ wallet: updated.wallet });
  } catch (error) {
    console.error("Error withdrawing:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}