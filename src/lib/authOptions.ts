import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { type UserRole } from "./constants";
import { rateLimit } from "./rateLimit";
import { logSecurityEvent } from "./securityLog";

function extractIP(headers: Record<string, string | undefined> | undefined): string {
  if (!headers) return "127.0.0.1";
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers["x-real-ip"];
  if (realIp) return realIp;
  return "127.0.0.1";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Usuario y contraseña son requeridos");
        }

        const ip = extractIP((req as { headers?: Record<string, string | undefined> })?.headers);
        const rl = rateLimit(`login:${ip}`, 5, 60000);
        if (!rl.allowed) {
          logSecurityEvent("rate_limited_login", {
            username: credentials.username,
            ip,
            retryAfter: rl.retryAfter,
          });
          throw new Error(
            `Demasiados intentos. Intenta de nuevo en ${rl.retryAfter} segundos.`
          );
        }

        const user = await prisma.user.findFirst({
          where: { username: credentials.username },
        });

        if (!user || !user.password) {
          logSecurityEvent("failed_login", {
            username: credentials.username,
            reason: "user_not_found",
          });
          throw new Error("Credenciales inválidas");
        }

        const isValidPassword = await compare(credentials.password, user.password);

        if (!isValidPassword) {
          logSecurityEvent("failed_login", {
            username: credentials.username,
            reason: "invalid_password",
          });
          throw new Error("Credenciales inválidas");
        }

        return {
          id: user.id,
          email: user.username || "",
          name: user.name || user.username || null,
          role: user.role as UserRole,
          wallet: user.wallet,
          phone: user.phone || null,
          address: user.address || null,
          preferredCurrency: user.preferredCurrency || "USD",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.phone = user.phone || null;
        token.address = user.address || null;
        token.preferredCurrency = user.preferredCurrency || "USD";
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { phone: true, address: true, preferredCurrency: true },
        });
        if (dbUser) {
          token.phone = dbUser.phone;
          token.address = dbUser.address;
          token.preferredCurrency = dbUser.preferredCurrency || "USD";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.phone = token.phone || null;
        session.user.address = token.address || null;
        session.user.preferredCurrency = token.preferredCurrency || "USD";
      }
      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};