"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { adminFetch } from "@/lib/adminFetch";
import { formatPrice } from "@/lib/utils";

interface AffiliateStats {
  code: string;
  wallet: number;
  pendingBalance: number;
  totalOrders: number;
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/afiliado");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function adminFetchStats() {
      if (!user?.id || !mounted) return;
      try {
        const res = await adminFetch(`/api/afiliados?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error adminFetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated && mounted) {
      adminFetchStats();
    }
  }, [user?.id, isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}?ref=${stats?.code}`;

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = referralLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-99px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6">
        Panel de Afiliado
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="border-2 border-black p-4">
          <div className="text-sm text-gray-600 mb-1">Balance Pendiente</div>
          <div className="text-xl md:text-2xl font-black">
            {formatPrice(stats?.pendingBalance || 0)}
          </div>
        </div>
        <div className="border-2 border-black p-4">
          <div className="text-sm text-gray-600 mb-1">Mi Billetera</div>
          <div className="text-xl md:text-2xl font-black">
            {formatPrice(stats?.wallet || 0)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Link
          href="/afiliado/ventas"
          className="border-2 border-black p-4 md:p-6 hover:bg-gray-100 transition-colors"
        >
          <h3 className="font-bold mb-2">Mis Ventas</h3>
          <p className="text-2xl md:text-3xl font-black">
            {stats?.totalOrders || 0} pedidos
          </p>
        </Link>
      </div>
    </div>
  );
}
