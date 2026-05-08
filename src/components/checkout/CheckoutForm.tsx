"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { createOrder } from "@/app/actions";
import { formatPrice } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const order = await createOrder({
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        notes: formData.notes,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          purchasePrice: item.purchasePrice,
          quantity: item.quantity,
        })),
        subtotal: getTotal(),
        total: getTotal(),
      });

      if (order) {
        clearCart();
        router.push(`/checkout/gracias?order=${order.orderNumber}`);
      }
    } catch {
      setError("Error al procesar el pedido. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded">
          {error}
        </div>
      )}

      <Input
        name="customerName"
        label="Nombre completo"
        value={formData.customerName}
        onChange={handleChange}
        required
      />

      <Input
        name="customerPhone"
        label="Teléfono"
        type="tel"
        value={formData.customerPhone}
        onChange={handleChange}
        required
      />

      <Input
        name="customerAddress"
        label="Dirección de entrega"
        value={formData.customerAddress}
        onChange={handleChange}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas adicionales (opcional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Instrucciones especiales para la entrega..."
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Procesando..." : `Pedir por ${formatPrice(getTotal())}`}
      </Button>
    </form>
  );
}