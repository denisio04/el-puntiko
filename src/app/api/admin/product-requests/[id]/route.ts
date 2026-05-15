import { NextRequest, NextResponse } from "next/server";
import { requireStaff, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
      const auth = await requireStaff();
    if (!auth) return adminUnauthorized();

    const body = await request.json();
    const { status } = body;

    if (!status || !["NOTIFIED", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json(
        {
          error:
            "Status inválido. Usar: NOTIFIED, COMPLETED, CANCELLED",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.productRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Solicitud no encontrada" },
        { status: 404 }
      );
    }

    const updated = await prisma.productRequest.update({
      where: { id: params.id },
      data: { status },
      include: {
        product: { select: { name: true } },
        user: { select: { name: true, phone: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product request:", error);
    return NextResponse.json(
      { error: "Error al actualizar la solicitud" },
      { status: 500 }
    );
  }
}
