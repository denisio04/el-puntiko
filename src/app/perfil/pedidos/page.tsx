"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    image: string | null;
    price: number;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string | null;
  subtotal: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

const statusBadgeVariant: Record<string, "warning" | "success" | "error"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "error",
};

export default function PerfilPedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const ordersRes = await fetch("/api/profile/orders");

      if (ordersRes.status === 401) {
        router.push("/login");
        return;
      }

      if (!ordersRes.ok) {
        throw new Error("Error al cargar pedidos");
      }

      const ordersData = await ordersRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency: "CUP",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CU", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-black p-8 text-center">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-red-600 p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="border-2 border-black px-6 py-2 hover:bg-black hover:text-white"
            >
              Ir a Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
          MIS PEDIDOS
        </h1>

        {orders.length === 0 ? (
          <div className="border-2 border-black p-8 text-center">
            <p className="text-gray-500 mb-4">Aún no tienes pedidos</p>
            <a
              href="/"
              className="border-2 border-black px-6 py-2 hover:bg-black hover:text-white inline-block"
            >
              Ir a comprar
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border-2 border-black p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant[order.status] || "default"}>
                    {order.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {order.items?.length || 0} producto(s)
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="font-bold">{formatCurrency(order.total)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}