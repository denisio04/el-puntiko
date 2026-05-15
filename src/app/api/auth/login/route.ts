import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { logSecurityEvent } from "@/lib/securityLog";

export async function POST(request: Request) {
  const rl = rateLimit(`login:${getRateLimitKey(request)}`, 5, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter} segundos.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    const user = await prisma.user.findFirst({
      where: {
        username,
      },
    });

    if (!user) {
      logSecurityEvent("failed_login", { username, reason: "user_not_found" });
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logSecurityEvent("failed_login", { username, reason: "invalid_password" });
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}