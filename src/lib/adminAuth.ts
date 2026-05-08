import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextApiRequest } from "next";

const AUTH_COOKIE_NAME = "app-authenticated";

export async function requireAdmin(): Promise<{ user: { id: string; role: string } } | null> {
  const h = headers();
  const cookieHeader = h.get("cookie") || "";
  
  if (!cookieHeader) {
    return null;
  }
  
  const cookies = cookieHeader.split(";").map(c => c.trim());
  
  const sessionCookie = cookies.find(c => c.startsWith("next-auth.session-token="));
  
  if (sessionCookie) {
    try {
      const cookieValue = sessionCookie.substring("next-auth.session-token=".length);
      
      const token = await getToken({ 
        req: { 
          headers: new Headers({ cookie: `next-auth.session-token=${cookieValue}` }) 
        } as unknown as NextApiRequest,
        secret: process.env.NEXTAUTH_SECRET!,
      });
      
      if (token?.id && token.role === "ADMIN") {
        return { user: { id: token.id, role: token.role as string } };
      }
    } catch (e) {
      console.error("getToken error:", e);
    }
  }
  
  const authCookie = cookies.find(c => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  
  if (authCookie) {
    const cookieValue = authCookie.substring(AUTH_COOKIE_NAME.length + 1);
    const [userId, role] = cookieValue.split("|");
    
    if (userId && role === "ADMIN") {
      return { user: { id: userId, role: "ADMIN" } };
    }
  }
  
  return null;
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}