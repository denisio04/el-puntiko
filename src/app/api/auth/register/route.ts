import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { sanitizeText } from "@/lib/sanitize";
import { rateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(`register:${getRateLimitKey(request)}`, 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter} segundos.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta en 15 minutos." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { username, password, name, phone, ci, address, preferredCurrency } =
      body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 },
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "El usuario debe tener entre 3 y 30 caracteres" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "El usuario solo puede contener letras, números y guiones bajos",
        },
        { status: 400 },
      );
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "El usuario ya existe" },
        { status: 409 },
      );
    }

    if (ci) {
      const existingCi = await prisma.user.findUnique({
        where: { ci },
      });

      if (existingCi) {
        return NextResponse.json(
          { error: "El CI ya está registrado" },
          { status: 409 },
        );
      }
    }

    const validCurrencies = ["USD", "CUP", "ZELLE"];
    const userCurrency =
      preferredCurrency && validCurrencies.includes(preferredCurrency)
        ? preferredCurrency
        : "USD";

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: sanitizeText(name || username),
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

    logSecurityEvent("user_registered", {
      userId: user.id,
      username: user.username,
    });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 },
    );
  }
}
