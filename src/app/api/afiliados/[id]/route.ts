import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const profile = await prisma.affiliateProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      orderItems: {
        orderBy: { id: "desc" },
        take: 20,
      },
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Afiliado no encontrado" },
      { status: 404 },
    );
  }

  if (profile.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(profile);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const { commissionRate } = body;

  if (commissionRate !== undefined) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo admins pueden cambiar la tasa" },
        { status: 403 },
      );
    }
    await prisma.affiliateProfile.update({
      where: { id },
      data: { commissionRate },
    });
  }

  return NextResponse.json({ success: true });
}
