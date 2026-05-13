import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, phone, ci, address, preferredCurrency } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "El usuario debe tener entre 3 y 30 caracteres" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "El usuario solo puede contener letras, números y guiones bajos" },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 409 }
      );
    }

    if (ci) {
      const existingCi = await prisma.user.findUnique({
        where: { ci },
      });

      if (existingCi) {
        return NextResponse.json(
          { error: "El CI ya está registrado" },
          { status: 409 }
        );
      }
    }

    const validCurrencies = ["USD", "CUP", "ZELLE"];
    const userCurrency = preferredCurrency && validCurrencies.includes(preferredCurrency)
      ? preferredCurrency
      : "USD";

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: name || username,
        phone: phone || null,
        ci: ci || null,
        address: address || null,
        preferredCurrency: userCurrency,
        role: "CUSTOMER",
        wallet: 0,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}