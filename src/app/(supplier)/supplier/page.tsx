"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { adminFetch } from "@/lib/adminFetch";
import { formatPrice } from "@/lib/utils";

interface SupplierStats {
  wallet: number;
  pendingBalance: number;
  totalSales: number;
  totalEarned: number;
}

export default function SupplierDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/supplier");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function fetchStats() {
      if (!user?.id || !mounted) return;
      try {
        const res = await adminFetch("/api/supplier/stats");
        console.log("Supplier stats response:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("Supplier data:", data);
          setStats(data);
        } else {
          const err = await res.json();
          console.error("Error:", err);
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
  }, [user?.id, isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6">
        Panel de Proveedor
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="border-2 border-black p-4">
          <div className="text-sm text-gray-600 mb-1">Balance Pendiente</div>
          <div className="text-xl md:text-2xl font-black">
            {formatPrice(stats?.pendingBalance || 0)}
          </div>
        </div>
        <div className="border-2 border-black p-4">
          <div className="text-sm text-gray-600 mb-1">Mi Billetera</div>
          <div className="text-xl md:text-2xl font-black">
            {formatPrice(stats?.wallet || 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="border-2 border-black p-4 md:p-6">
          <h3 className="font-bold mb-2">Total Vendido</h3>
          <p className="text-2xl md:text-3xl font-black">
            {stats?.totalSales || 0} pedidos
          </p>
        </div>
        <div className="border-2 border-black p-4 md:p-6">
          <h3 className="font-bold mb-2">Total Ganado</h3>
          <p className="text-2xl md:text-3xl font-black">
            {formatPrice(stats?.totalEarned || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
