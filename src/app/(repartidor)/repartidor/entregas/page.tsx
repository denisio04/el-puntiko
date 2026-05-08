"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatPrice } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  total: number;
  status: string;
  createdAt: string;
}

async function fetchDeliveryOrders(userId: string): Promise<Order[]> {
  try {
    const res = await fetch(`/api/delivery/orders?userId=${userId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
  }
  return [];
}

export default function DeliveryOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/repartidor/entregas");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function loadOrders() {
      if (!user?.id || !mounted) return;
      const data = await fetchDeliveryOrders(user.id);
      setOrders(data);
      setLoading(false);
    }
    if (isAuthenticated && mounted) {
      loadOrders();
    }
  }, [user?.id, isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6">
        Mis Entregas
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No tienes entregas aún</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-2 border-black p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold">#{order.orderNumber}</span>
                  <span className="ml-2 text-sm px-2 py-0.5 bg-black text-white">
                    {order.status === "CONFIRMED" ? "ENTREGADO" : order.status}
                  </span>
                </div>
                <span className="font-black text-lg">
                  {formatPrice(order.total)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <p>{order.customerName}</p>
                <p>{order.customerPhone}</p>
                <p className="text-xs mt-1">{order.customerAddress}</p>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(order.createdAt).toLocaleDateString("es-CU")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}