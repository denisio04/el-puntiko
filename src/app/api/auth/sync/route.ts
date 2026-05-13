import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token || !token.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  
  return NextResponse.json({ success: true });
}