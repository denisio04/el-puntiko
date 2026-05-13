import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("search") || "";
    const categoryName = searchParams.get("category") || "";
    const sort = searchParams.get("sort") || "";
    const filter = searchParams.get("filter") || "";

    const where: Record<string, unknown> = { isActive: true };

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery } },
        { description: { contains: searchQuery } },
        { category: { contains: searchQuery } },
      ];
    }

    if (categoryName) {
      where.category = categoryName;
    }

    if (filter === "sale") {
      where.comparePrice = { not: null };
    }

    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };

    if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy,
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json(
      { error: "Error fetching products" },
      { status: 500 }
    );
  }
}
