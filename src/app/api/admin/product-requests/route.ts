import { NextResponse } from "next/server";
import { requireStaff, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const auth = await requireStaff();
    if (!auth) return adminUnauthorized();

    const requests = await prisma.productRequest.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            stock: true,
            image: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
          },
        },
      },
      orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching product requests:", error);
    return NextResponse.json(
      { error: "Error al obtener solicitudes" },
      { status: 500 }
    );
  }
}
