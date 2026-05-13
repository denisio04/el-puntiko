"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { Product } from "@/types";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

async function fetchCategories(): Promise<CategoryData[]> {
  try {
    const res = await fetch("/api/categories");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchProductsByCategory(categoryName: string): Promise<Product[]> {
  try {
    const res = await fetch(
      `/api/products?category=${encodeURIComponent(categoryName)}`
    );
    if (!res.ok) return [];
    return await res.json() as Product[];
  } catch {
    return [];
  }
}

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;

  const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug) return;

    setLoading(true);
    fetchCategories()
      .then((categories) => {
        const found = categories.find((c) => c.slug === categorySlug) || null;
        setCategoryData(found);
        if (found) {
          return fetchProductsByCategory(found.name);
        }
        return [];
      })
      .then((prods) => {
        setProducts(prods);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!categoryData) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Link href="/" className="inline-flex mb-6 hover:underline">
          ← Volver
        </Link>
        <h1 className="text-3xl font-black">Categoría no encontrada</h1>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <Link href="/" className="inline-flex mb-6 hover:underline">
        ← Volver
      </Link>
      <h1 className="text-3xl font-black mb-8">{categoryData.name}</h1>
      <ProductGrid products={products} />
    </div>
  );
}
