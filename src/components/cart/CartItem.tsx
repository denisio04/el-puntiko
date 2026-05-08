"use client";

import * as React from "react";
import Image from "next/image";
import { CartItem as CartItemType } from "@/stores/useCartStore";
import { formatPrice } from "@/lib/utils";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemComponent({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex items-center gap-4 py-4 border-b">
      {item.image && (
        <Image
          src={item.image}
          alt={item.name}
          width={64}
          height={64}
          className="w-16 h-16 object-cover rounded"
        />
      )}
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        <p className="text-gray-600">{formatPrice(item.price)}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
          className="w-8 h-8 border rounded"
        >
          -
        </button>
        <span className="w-8 text-center">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          className="w-8 h-8 border rounded"
        >
          +
        </button>
      </div>
      <div className="text-right">
        <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
        <button
          onClick={() => onRemove(item.id)}
          className="text-red-500 text-sm"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}