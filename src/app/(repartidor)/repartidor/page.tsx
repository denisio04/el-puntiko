"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatPrice } from "@/lib/utils";

interface DeliveryStats {
  wallet: number;
  pendingBalance: number;
  totalDeliveries: number;
  commissionRate: number;
  pendingOrders: number;
}

async function fetchDeliveryStats(
  userId: string,
): Promise<DeliveryStats | null> {
  try {
    const res = await fetch(`/api/delivery/stats?userId=${userId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("Error fetching delivery stats:", error);
  }
  return null;
}

export default function DeliveryDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/repartidor");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function loadStats() {
      if (!user?.id || !mounted) return;
      const data = await fetchDeliveryStats(user.id);
      setStats(data);
      setLoading(false);
    }
    if (isAuthenticated && mounted) {
      loadStats();
    }
  }, [user?.id, isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6">
        Panel de Repartidor
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
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
        <div className="border-2 border-black p-4">
          <div className="font-bold mb-2">Pedidos Pendientes</div>
          <div className="text-2xl md:text-3xl font-black">
            {stats?.pendingOrders || 0}
          </div>
        </div>
        <Link
          href="/repartidor/entregas"
          className="border-2 border-black p-4 md:p-6 hover:bg-gray-100 transition-colors"
        >
          <h3 className="font-bold mb-2">Mis Entregas</h3>
          <p className="text-2xl md:text-3xl font-black">
            {stats?.totalDeliveries || 0} entregas
          </p>
        </Link>
      </div>
    </div>
  );
}
