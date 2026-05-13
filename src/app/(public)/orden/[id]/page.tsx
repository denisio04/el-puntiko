"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrency } from "@/hooks/useCurrency";
import { convertPrice, formatConvertedPrice } from "@/lib/currency";
import { Badge } from "@/components/ui/Badge";

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
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: { name: string };
  }>;
}

export default function OrderPage() {
  const params = useParams();
  const router = useRouter();
  const { preferredCurrency, rates } = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24">
        <h1 className="text-2xl font-bold mb-4">Pedido no encontrado</h1>
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 hover:underline"
        >
          Volver a EL PUNTIKO.
        </button>
      </div>
    );
  }

  const statusVariant = {
    PENDING: "warning",
    CONFIRMED: "info",
    SHIPPED: "info",
    DELIVERED: "success",
    CANCELLED: "error",
  }[order.status] as "warning" | "info" | "success" | "error";

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <button
        onClick={() => router.back()}
        className="text-gray-600 hover:text-black mb-6"
      >
        ← Volver
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black">Pedido #{order.orderNumber}</h1>
        <Badge variant={statusVariant}>{order.status}</Badge>
      </div>

      <div className="border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Datos del cliente</h2>
        <p><strong>Nombre:</strong> {order.customerName}</p>
        <p><strong>Teléfono:</strong> {order.customerPhone}</p>
        <p><strong>Dirección:</strong> {order.customerAddress}</p>
        {order.notes && (
          <p><strong>Notas:</strong> {order.notes}</p>
        )}
      </div>

      <div className="border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Productos</h2>
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
            <span>{item.product.name} x{item.quantity}</span>
            <span>
              {formatConvertedPrice(
                convertPrice(item.price * item.quantity, preferredCurrency, rates),
                preferredCurrency
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-6">
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>
            {formatConvertedPrice(
              convertPrice(order.total, preferredCurrency, rates),
              preferredCurrency
            )}
          </span>
        </div>
      </div>
    </div>
  );
}