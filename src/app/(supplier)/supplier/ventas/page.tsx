"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { adminFetch } from "@/lib/adminFetch";
import { formatPrice } from "@/lib/utils";

interface ProductStat {
  productId: string;
  productName: string;
  totalSold: number;
  revenue: number;
}

interface OrderStat {
  date: string;
  orders: number;
  revenue: number;
}

export default function SupplierStatsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
  const [ordersByDate, setOrdersByDate] = useState<OrderStat[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/supplier/ventas");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function fetchStats() {
      if (!mounted) return;
      try {
        const res = await adminFetch("/api/supplier/stats");
        if (res.ok) {
          const data = await res.json();
          setTopProducts(data.topProducts || []);
          setOrdersByDate(data.ordersByDate || []);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated && mounted) {
      fetchStats();
    }
  }, [isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6">
        Estadísticas de Ventas
      </h1>

      <div className="border-2 border-black mb-6">
        <div className="border-b-2 border-black p-4 bg-black text-white">
          <h2 className="font-bold">Productos Más Vendidos</h2>
        </div>
        {topProducts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No hay datos suficientes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead className="border-b border-black bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-bold border-r border-black">Producto</th>
                  <th className="text-right p-3 font-bold border-r border-black">Vendidos</th>
                  <th className="text-right p-3 font-bold">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-black hover:bg-gray-50">
                    <td className="p-3 border-r border-black">{p.productName}</td>
                    <td className="p-3 text-right border-r border-black font-medium">{p.totalSold}</td>
                    <td className="p-3 text-right font-bold">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border-2 border-black">
        <div className="border-b-2 border-black p-4 bg-black text-white">
          <h2 className="font-bold">Ventas por Día</h2>
        </div>
        {ordersByDate.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No hay datos suficientes
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm md:text-base">
              <thead className="border-b border-black bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-bold border-r border-black">Fecha</th>
                  <th className="text-right p-3 font-bold border-r border-black">Pedidos</th>
                  <th className="text-right p-3 font-bold">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {ordersByDate.map((o, i) => (
                  <tr key={i} className="border-b border-black hover:bg-gray-50">
                    <td className="p-3 border-r border-black">{o.date}</td>
                    <td className="p-3 text-right border-r border-black font-medium">{o.orders}</td>
                    <td className="p-3 text-right font-bold">{formatPrice(o.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}