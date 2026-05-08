import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { USER_ROLES, type UserRole } from "./constants";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

export function getUserRole(role: string): UserRole {
  const validRoles = Object.values(USER_ROLES) as string[];
  if (validRoles.includes(role)) {
    return role as UserRole;
  }
  return USER_ROLES.CUSTOMER;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ id: string; username: string; name: string; role: string } | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      password: true,
    },
  });

  if (!user) return null;

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username || "",
    name: user.name || "",
    role: user.role,
  };
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== USER_ROLES.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return session;
}