"use client";

interface TopProduct {
  productId: string;
  name: string;
  image?: string | null;
  totalSold: number;
}

interface TopProductsChartProps {
  products: TopProduct[];
}

export function TopProductsChart({ products }: TopProductsChartProps) {
  const maxSold = Math.max(...products.map((p) => p.totalSold), 1);

  if (products.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No hay datos de ventas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product, index) => (
        <div key={product.productId} className="flex items-center gap-4">
          <div className="w-8 text-sm font-bold text-gray-400">
            #{index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium truncate" title={product.name}>
                {product.name}
              </span>
              <span className="text-sm font-bold">
                {product.totalSold} uni.
              </span>
            </div>
            <div className="w-full bg-gray-200 h-4">
              <div
                className="bg-black h-4 transition-all duration-500"
                style={{ width: `${(product.totalSold / maxSold) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}