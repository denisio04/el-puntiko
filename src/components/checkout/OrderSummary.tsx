"use client";

import * as React from "react";
import { useCartStore } from "@/stores/useCartStore";
import { formatPrice } from "@/lib/utils";

interface OrderSummaryProps {
  showCheckoutButton?: boolean;
  onCheckout?: () => void;
}

export function OrderSummary({ showCheckoutButton = true, onCheckout }: OrderSummaryProps) {
  const items = useCartStore((state) => state.items);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold mb-4">Resumen del pedido</h3>
      
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600">
              {item.quantity}x {item.name}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal ({itemCount} productos)</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Envío</span>
          <span>Gratis</span>
        </div>
        <div className="flex justify-between font-bold text-lg pt-2 border-t">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {showCheckoutButton && onCheckout && (
        <button
          onClick={onCheckout}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium mt-4 hover:bg-blue-700"
        >
          Proceder al checkout
        </button>
      )}
    </div>
  );
}