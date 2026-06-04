import { prisma } from "./db";

export async function getCachedCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getCachedProducts(search?: string, category?: string) {
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
}

export async function getCachedExchangeRates() {
  return prisma.settings.findUnique({ where: { id: "global" } });
}
