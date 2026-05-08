"use client";

import { useState, useCallback } from "react";

interface AffiliateStats {
  wallet: number;
  totalClicks: number;
  totalOrders: number;
}

export function useAffiliate() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(false);

  const generateLink = useCallback((affiliateCode: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}?ref=${affiliateCode}`;
  }, []);

  const getAffiliateStats = useCallback(async (affiliateId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/afiliados?userId=${affiliateId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching affiliate stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const copyLink = useCallback(async (affiliateCode: string) => {
    const link = generateLink(affiliateCode);
    await navigator.clipboard.writeText(link);
    return link;
  }, [generateLink]);

  return {
    stats,
    loading,
    generateLink,
    getAffiliateStats,
    copyLink,
  };
}