import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

async function getAuthFromRequest() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      return { user: { id: session.user.id as string, role: session.user.role as string } };
    }
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return null;
}

// GET /api/profile - Obtener datos del usuario autenticado
export async function GET() {
  const auth = await getAuthFromRequest();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        address: true,
        ci: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

// PUT /api/profile - Actualizar datos del usuario autenticado
export async function PUT(request: Request) {
  const auth = await getAuthFromRequest();
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, address, ci } = body;

    // Validaciones
    const errors: Record<string, string> = {};
    if (name !== undefined && typeof name !== "string") {
      errors.name = "Nombre debe ser texto";
    }
    if (phone !== undefined && typeof phone !== "string") {
      errors.phone = "Teléfono debe ser texto";
    }
    if (address !== undefined && typeof address !== "string") {
      errors.address = "Dirección debe ser texto";
    }
    if (ci !== undefined && typeof ci !== "string") {
      errors.ci = "CI debe ser texto";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const updateData: Record<string, string | null> = {};
    if (name !== undefined) updateData.name = name || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (address !== undefined) updateData.address = address || null;
    if (ci !== undefined) updateData.ci = ci || null;

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        address: true,
        ci: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}