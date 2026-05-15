import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();

  try {
    const staff = await prisma.user.findMany({
      where: { role: "STAFF" },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Error fetching staff" }, { status: 500 });
  }
}