"use client";

import { useState, useCallback } from "react";
import { useCartStore } from "@/stores/useCartStore";

interface OrderData {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  subtotal: number;
  total: number;
}

export function useOrder() {
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearCart = useCartStore((state) => state.clearCart);

  const createOrder = useCallback(
    async (data: OrderData) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) {
          throw new Error("Error al crear el pedido");
        }

        const result = await res.json();
        setOrder(result);
        clearCart();
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [clearCart]
  );

  const getOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching order:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    order,
    error,
    createOrder,
    getOrder,
  };
}