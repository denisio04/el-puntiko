"use client";

import { useCallback } from "react";
import { useCartStore, type CartItem } from "@/stores/useCartStore";

export function useCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const getTotal = useCartStore((state) => state.getTotal);
  const getItemCount = useCartStore((state) => state.getItemCount);

  const addToCart = useCallback(
    (product: Omit<CartItem, "quantity">) => {
      addItem(product);
    },
    [addItem]
  );

  const removeFromCart = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem]
  );

  const updateCartQuantity = useCallback(
    (id: string, quantity: number) => {
      updateQuantity(id, quantity);
    },
    [updateQuantity]
  );

  return {
    items,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    getTotal,
    getItemCount,
  };
}