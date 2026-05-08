"use client";

import Image from "next/image";
import Link from "next/link";

interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  stock: number;
  price: number;
}

interface LowStockProductsProps {
  products: LowStockProduct[];
}

export function LowStockProducts({ products }: LowStockProductsProps) {
  if (products.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Todos los productos tienen stock suficiente
      </div>
    );
  }

  const getStockColor = (stock: number) => {
    if (stock === 0) return "bg-red-600 text-white";
    if (stock <= 2) return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div className="space-y-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex items-center gap-3 p-2 border border-gray-200 hover:border-gray-400"
        >
          <div className="w-12 h-12 relative bg-gray-100 flex-shrink-0">
            {product.image && (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/admin/productos?edit=${product.slug}`}
              className="text-sm font-medium hover:underline block truncate"
            >
              {product.name}
            </Link>
            <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
          </div>
          <div
            className={`px-2 py-1 text-xs font-bold ${getStockColor(product.stock)}`}
          >
            {product.stock === 0 ? "AGOTADO" : `${product.stock} uni.`}
          </div>
        </div>
      ))}
    </div>
  );
}