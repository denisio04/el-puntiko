import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { type UserRole } from "./constants";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Usuario y contraseña son requeridos");
        }

        const user = await prisma.user.findFirst({
          where: { username: credentials.username },
        });

        if (!user || !user.password) {
          throw new Error("Credenciales inválidas");
        }

        const isValidPassword = await compare(credentials.password, user.password);

        if (!isValidPassword) {
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