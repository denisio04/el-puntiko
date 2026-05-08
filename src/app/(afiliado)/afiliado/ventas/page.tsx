"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/useAuthStore";
import { adminFetch } from "@/lib/adminFetch";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
  expectedCommission: number;
}

export default function AffiliateSalesPage() {
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
      router.push("/login?from=/afiliado");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function adminFetchOrders() {
      if (!user?.id || !mounted) return;
      try {
        const res = await adminFetch(`/api/afiliados?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Error adminFetching orders:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated && mounted) {
      adminFetchOrders();
    }
  }, [user?.id, isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  const statusVariant = (status: string): "success" | "warning" | "error" | "info" => {
    const map: Record<string, "success" | "warning" | "error" | "info"> = {
      DELIVERED: "success",
      SHIPPED: "info",
      CONFIRMED: "info",
      PENDING: "warning",
      CANCELLED: "error",
    };
    return map[status] || "info";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DELIVERED: "Entregado",
      SHIPPED: "Enviado",
      CONFIRMED: "Confirmado",
      PENDING: "Pendiente",
      CANCELLED: "Cancelado",
    };
    return labels[status] || status;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="hidden md:block border-b border-black pb-4 mb-6">
        <Link href="/afiliado" className="inline-flex text-sm mb-4 hover:underline">
          ← Volver
        </Link>
        <h1 className="text-3xl md:text-4xl font-black">MIS VENTAS</h1>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay ventas aún
        </div>
      ) : (
        <div className="md:hidden space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="border border-black p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-sm">{order.orderNumber}</span>
                <Badge variant={statusVariant(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <div className="mb-1">
                <span className="text-sm text-gray-500">Cliente: </span>
                {order.customerName}
              </div>
              <div className="mb-1">
                <span className="text-sm text-gray-500">Teléfono: </span>
                {order.customerPhone}
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-lg font-medium">{formatPrice(order.total)}</div>
                <div className="text-sm font-bold">
                  Comisión: {formatPrice(order.expectedCommission)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {orders.length > 0 && (
        <div className="hidden md:block border border-black">
          <div className="grid grid-cols-6 bg-black text-white font-bold p-4">
            <div className="col-span-1">Pedido</div>
            <div className="col-span-1">Cliente</div>
            <div className="col-span-1">Teléfono</div>
            <div className="col-span-1">Total</div>
            <div className="col-span-1">Comisión</div>
            <div className="col-span-1 text-right">Estado</div>
          </div>

          {orders.map((order) => (
            <div
              key={order.id}
              className="grid grid-cols-6 p-4 border-b border-black items-center hover:bg-gray-50"
            >
              <div className="col-span-1 font-mono text-sm">
                {order.orderNumber}
              </div>
              <div className="col-span-1">
                {order.customerName}
              </div>
              <div className="col-span-1 text-sm">
                {order.customerPhone}
              </div>
              <div className="col-span-1 font-medium">
                {formatPrice(order.total)}
              </div>
              <div className="col-span-1 font-bold">
                {formatPrice(order.expectedCommission)}
              </div>
              <div className="col-span-1 text-right">
                <Badge variant={statusVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}