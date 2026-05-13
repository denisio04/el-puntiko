"use client";

import { useSession } from "next-auth/react";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import type { CurrencyCode, ExchangeRates } from "@/lib/currency";

interface UseCurrencyReturn {
  preferredCurrency: CurrencyCode;
  rates: ExchangeRates;
}

export function useCurrency(): UseCurrencyReturn {
  const { data: session } = useSession();
  const storeCurrency = useCurrencyStore((state) => state.preferredCurrency);
  const rates = useCurrencyStore((state) => state.rates);

  const preferredCurrency: CurrencyCode =
    (session?.user?.preferredCurrency as CurrencyCode) || storeCurrency || "USD";

  return { preferredCurrency, rates };
}
