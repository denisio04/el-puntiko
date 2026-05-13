import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CurrencyCode, ExchangeRates } from "@/lib/currency";

interface CurrencyState {
  preferredCurrency: CurrencyCode;
  rates: ExchangeRates;
  setPreferredCurrency: (currency: CurrencyCode) => void;
  setRates: (rates: ExchangeRates) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      preferredCurrency: "USD" as CurrencyCode,
      rates: { usdToCup: 325, zelleToCup: 325 },
      setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),
      setRates: (rates) => set({ rates }),
    }),
    {
      name: "currency-preference",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferredCurrency: state.preferredCurrency,
      }),
    }
  )
);
