"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatPrice } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice: number | null;
  stock: number;
  category: string | null;
}

export default function SupplierInventoryPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockSort, setStockSort] = useState<"asc" | "desc" | null>(null);

  const sortedProducts = [...products].sort((a, b) => {
    if (!stockSort) return 0;
    return stockSort === "asc" ? a.stock - b.stock : b.stock - a.stock;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/supplier/inventario");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function fetchProducts() {
      if (!mounted) return;
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data || []);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated && mounted) {
      fetchProducts();
    }
  }, [isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  const getStockClass = (stock: number) => {
    if (stock === 0) return "bg-red-100 border-red-500";
    if (stock < 5) return "bg-yellow-50 border-yellow-500";
    return "bg-white";
  };

  const getStockText = (stock: number) => {
    if (stock === 0) return "text-red-600";
    if (stock < 5) return "text-yellow-600";
    return "";
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6">Inventario</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStockSort(stockSort === "asc" ? "desc" : "asc")}
          className={`px-4 py-2 border-2 border-black flex items-center gap-2 ${
            stockSort ? "bg-black text-white" : "hover:bg-gray-100"
          }`}
        >
          Stock {stockSort === "asc" ? "↑" : stockSort === "desc" ? "↓" : ""}
        </button>
        {stockSort && (
          <button
            onClick={() => setStockSort(null)}
            className="px-4 py-2 border-2 border-black hover:bg-gray-100"
          >
            ×
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center text-gray-500 p-8">No hay productos</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProducts.map((p) => (
            <div
              key={p.id}
              className={`border-2 border-black p-4 ${getStockClass(p.stock)}`}
            >
              <div className="font-bold mb-2">{p.name}</div>
              <div className="text-sm text-gray-600 mb-1">
                Categoría: {p.category || "-"}
              </div>
              <div className="text-sm text-gray-600 mb-1">
                Precio: {formatPrice(p.purchasePrice || 0)}
              </div>
              <div className={`text-xl font-bold ${getStockText(p.stock)}`}>
                Stock: {p.stock}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
