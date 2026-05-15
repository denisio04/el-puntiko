import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { rateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rl = rateLimit(`withdraw:${getRateLimitKey(request)}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rl.retryAfter} segundos.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

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

    await prisma.walletTransaction.create({
      data: {
        userId: adminId,
        amount: -amount,
        type: "WITHDRAWAL",
        description: "Retiro de wallet",
      },
    });

    logSecurityEvent("withdrawal", { adminId, amount });
    return NextResponse.json({ wallet: updated.wallet });
  } catch (error) {
    console.error("Error withdrawing:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}