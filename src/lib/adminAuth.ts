import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function requireAdmin(): Promise<{ user: { id: string; role: string } } | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id && session.user.role === "ADMIN") {
      return { user: { id: session.user.id as string, role: session.user.role as string } };
    }
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return null;
}

export async function requireStaff(): Promise<{ user: { id: string; role: string } } | null> {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id && (session.user.role === "ADMIN" || session.user.role === "STAFF")) {
      return { user: { id: session.user.id as string, role: session.user.role as string } };
    }
  } catch (e) {
    console.error("getServerSession error:", e);
  }
  return null;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}