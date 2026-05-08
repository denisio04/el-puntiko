import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  purchasePrice?: number;
  quantity: number;
  image?: string;
  affiliateCode?: string;
  isBonusProduct?: boolean;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity"> & { affiliateCode?: string; isBonusProduct?: boolean }) => void;
  addBonusItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  hasBonusProduct: () => boolean;
}

function getReferralCodeFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  return ref || undefined;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const items = get().items;
        const existing = items.find((item) => item.id === product.id);
        const hasBonusItem = items.some((item) => item.isBonusProduct);
        
        if (hasBonusItem && !product.isBonusProduct) {
          return;
        }
        
        const affiliateCode = product.affiliateCode || getReferralCodeFromUrl();
        
        if (existing) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { ...product, affiliateCode, quantity: 1 }] });
        }
      },
      addBonusItem: (product) => {
        const items = get().items;
        const nonBonusItems = items.filter((item) => !item.isBonusProduct);
        set({ items: [...nonBonusItems, { ...product, isBonusProduct: true, quantity: 1, affiliateCode: product.affiliateCode || getReferralCodeFromUrl() }] });
      },
      hasBonusProduct: () => {
        return get().items.some((item) => item.isBonusProduct);
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((item) => item.id !== id) });
        } else {
          set({
            items: get().items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          });
        }
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "shopping-cart",
      storage: createJSONStorage(() => localStorage),
    }
  )
);