"use client";

import { useEffect, useState, useRef } from "react";

export function useStockRealtime() {
  const [stockMap, setStockMap] = useState<Map<string, number>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/stock/stream");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const { productId, availableStock } = JSON.parse(event.data);
          setStockMap((prev) => {
            const next = new Map(prev);
            next.set(productId, availableStock);
            return next;
          });
        } catch {}
      };

      es.onerror = () => {
        es.close();
        retryRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, []);

  return stockMap;
}
