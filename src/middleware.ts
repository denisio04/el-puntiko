import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const REFERRAL_COOKIE_NAME = "referral_code";
const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const ADMIN_ROUTES = ["/admin", "/admin/"];
const AFILIADO_ROUTES = ["/afiliado", "/afiliado/"];
const STAFF_ROUTES = ["/staff", "/staff/"];
const DELIVERY_ROUTES = ["/repartidor", "/repartidor/"];
const SUPPLIER_ROUTES = ["/supplier", "/supplier/ventas", "/supplier/inventario"];
const PERFIL_ROUTES = ["/perfil", "/perfil/"];
const PUBLIC_ROUTES = ["/login", "/registro", "/login-admin"];

async function getSession(request: NextRequest): Promise<{ role: string } | null> {
  try {
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
    if (!token) return null;
    
    return { role: token.role as string };
  } catch (error) {
    console.error("Middleware getToken error:", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const refCode = request.nextUrl.searchParams.get("ref");
  const isProductPage = /^\/productos\/[^/]+$/.test(pathname);
  
  if (refCode && isProductPage) {
    const sanitized = refCode
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 20);
    
    // Solo establecer cookie si el código sanitizado tiene contenido válido
    if (sanitized.length > 0) {
      response.cookies.set({
        name: REFERRAL_COOKIE_NAME,
        value: sanitized,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: REFERRAL_COOKIE_MAX_AGE,
        path: "/",
      });
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    const session = await getSession(request);
    if (session && pathname.startsWith("/login")) {
      const dashboard = session.role === "ADMIN" ? "/admin" : "/afiliado";
      return NextResponse.redirect(new URL(dashboard, request.url));
    }
    return response;
  }

  const session = await getSession(request);

  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  if (isAdminRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const isAfiliadoRoute = AFILIADO_ROUTES.some(route => pathname.startsWith(route));
  if (isAfiliadoRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "AFFILIATE") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const isStaffRoute = STAFF_ROUTES.some(route => pathname.startsWith(route));
  if (isStaffRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "STAFF" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const isDeliveryRoute = DELIVERY_ROUTES.some(route => pathname.startsWith(route));
  if (isDeliveryRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "DELIVERY" && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const isSupplierRoute = SUPPLIER_ROUTES.some(route => pathname.startsWith(route));
  if (isSupplierRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "SUPPLIER") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const isPerfilRoute = PERFIL_ROUTES.some(route => pathname.startsWith(route));
  if (isPerfilRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt).*)",
  ],
};