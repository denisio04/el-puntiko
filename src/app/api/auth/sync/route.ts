import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_COOKIE_NAME = "app-authenticated";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || !token.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  
  const response = NextResponse.json({ success: true });
  
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: `${token.id}|${token.role}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  
  return response;
}