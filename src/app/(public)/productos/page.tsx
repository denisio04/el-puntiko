"use client";

import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/product/ProductGrid";
import type { Product } from "@/types";

interface BonusProgress {
  hasReached: boolean;
  discountPercent: number;
  isActive: boolean;
  canUseBonus?: boolean;
  targetType?: string;
  targetIds?: string;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bonus, setBonus] = useState<BonusProgress | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/bonus/progress").then((r) => r.json()).catch(() => null),
    ]).then(([productsData, bonusData]) => {
      let allProducts = productsData.products || productsData || [];
      
      if (bonusData && bonusData.isActive && bonusData.hasReached && bonusData.targetType && bonusData.targetIds) {
        const targetIds = JSON.parse(bonusData.targetIds || "[]") as string[];
        
        if (bonusData.targetType === "PRODUCTS" && targetIds.length > 0) {
          allProducts = allProducts.filter((p: Product) => targetIds.includes(p.id));
        } else if (bonusData.targetType === "CATEGORIES" && targetIds.length > 0) {
          allProducts = allProducts.filter((p: Product) => targetIds.includes(p.category || ""));
        }
      }
      
      setProducts(allProducts);
      setBonus(bonusData);
      setLoading(false);
    });
  }, []);

  const discountPercent = bonus?.isActive ? bonus.discountPercent : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black">Catálogo</h1>
        {bonus?.isActive && (
          <span className="bg-black text-white px-4 py-2 font-bold">
            {Math.round(bonus.discountPercent * 100)}% DESCUENTO
          </span>
        )}
      </div>
      <ProductGrid 
        products={products} 
        loading={loading} 
        discountPercent={discountPercent}
        canUseBonus={bonus?.isActive && bonus?.hasReached ? true : false}
        eligibleProductIds={bonus?.isActive && bonus?.hasReached ? JSON.parse(bonus.targetIds || "[]") : []}
      />
    </div>
  );
}