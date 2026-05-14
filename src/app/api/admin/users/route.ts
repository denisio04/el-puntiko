import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        wallet: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error fetching users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const body = await request.json();
    const { username, password, name, role, wallet } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF"];
    const userRole = validRoles.includes(role) ? role : "AFFILIATE";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: name || username,
        role: userRole,
        wallet: typeof wallet === "number" && wallet >= 0 ? wallet : 0,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        wallet: true,
        createdAt: true,
      },
    });

    if (userRole === "AFFILIATE") {
      const affiliateCode = `AF${username.toUpperCase().replace(/[^A-Z0-9]/g, "")}${Date.now().toString(36).toUpperCase()}`;
      await prisma.affiliateProfile.create({
        data: {
          userId: user.id,
          code: affiliateCode,
          commissionRate: 0.10,
        },
      });
    }

    if (userRole === "DELIVERY") {
      await prisma.deliveryProfile.create({
        data: {
          userId: user.id,
          commissionRate: 0.10,
          pendingBalance: 0,
          totalDeliveries: 0,
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error creating user" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const body = await request.json();
    const { id, name, role, wallet, password } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined && ["ADMIN", "AFFILIATE", "SUPPLIER", "DELIVERY", "STAFF"].includes(role)) updateData.role = role;
    if (typeof wallet === "number" && wallet >= 0) updateData.wallet = wallet;

    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const currentUser = await prisma.user.findUnique({ where: { id } });
    const previousRole = currentUser?.role;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        wallet: true,
        createdAt: true,
      },
    });

    if (role === "DELIVERY" && previousRole !== "DELIVERY") {
      const existingProfile = await prisma.deliveryProfile.findUnique({
        where: { userId: id },
      });
      if (!existingProfile) {
        await prisma.deliveryProfile.create({
          data: {
            userId: id,
            commissionRate: 0.10,
            pendingBalance: 0,
            totalDeliveries: 0,
          },
        });
      }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error updating user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (userToDelete.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "No se puede eliminar el último administrador" }, { status: 400 });
      }
    }

    await prisma.affiliateProfile.deleteMany({ where: { userId: id } });
    await prisma.deliveryProfile.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}