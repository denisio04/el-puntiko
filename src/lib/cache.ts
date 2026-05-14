import { cache } from "react";
import { prisma } from "./db";

export const getCachedCategories = cache(async () => {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
});

export const getCachedProducts = cache(async (search?: string, category?: string) => {
  const where: Record<string, unknown> = { isActive: true };
  if (search) {
    const isPostgres = process.env.DATABASE_URL?.startsWith("postgresql");
    const searchFilter = (field: string, query: string) => {
      if (isPostgres) return { [field]: { contains: query, mode: "insensitive" as const } };
      return { [field]: { contains: query } };
    };
    where.OR = [
      searchFilter("name", search),
      searchFilter("description", search),
    ];
  }
  if (category) where.category = category;
  return prisma.product.findMany({ where, orderBy: { createdAt: "desc" } });
});

export const getCachedExchangeRates = cache(async () => {
  return prisma.settings.findUnique({ where: { id: "global" } });
});
