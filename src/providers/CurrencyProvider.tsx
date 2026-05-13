"use client";

import { useEffect, useRef } from "react";
import { useCurrencyStore } from "@/stores/useCurrencyStore";

export function CurrencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setRates = useCurrencyStore((state) => state.setRates);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/exchange-rates")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.usdToCup > 0 && data.zelleToCup > 0) {
          setRates({
            usdToCup: data.usdToCup,
            zelleToCup: data.zelleToCup,
          });
        }
      })
      .catch(() => {
        // Silently fail - rates will use defaults from store
      });
  }, [setRates]);

  return <>{children}</>;
}
