import { NextResponse } from "next/server";
import { getCachedCategories } from "@/lib/cache";

export async function GET() {
  try {
    const categories = await getCachedCategories();
    const response = NextResponse.json(categories);
    response.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    return response;
  } catch {
    return NextResponse.json(
      { error: "Error fetching categories" },
      { status: 500 }
    );
  }
}
