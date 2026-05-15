import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

async function getAuthUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) return session.user.id as string;
  } catch {}
  return null;
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  try {
    await prisma.cartReservation.deleteMany({
      where: { userId, expiresAt: { gte: new Date() } },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al liberar reservas" }, { status: 500 });
  }
}
