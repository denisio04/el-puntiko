"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { getAffiliates } from "../actions";

interface Affiliate {
  id: string;
  code: string;
  commissionRate: number;
  wallet: number;
  totalOrders: number;
  user: {
    name: string | null;
    username: string | null;
  };
}

export default function AdminAffiliatesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || !user) {
      router.push("/login?from=/admin/afiliados");
    } else if (user?.role !== "ADMIN" && user?.role !== "AFFILIATE") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    getAffiliates()
      .then((data) => {
        if (data.affiliates) setAffiliates(data.affiliates);
      })
      .finally(() => setLoading(false));
  }, [mounted, user]);

  if (!mounted || !user || (user?.role !== "ADMIN" && user?.role !== "AFFILIATE")) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="border-b border-black pb-4 mb-8">
        <Link href="/admin" className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4">
          <ArrowLeft className="w-4 h-4" />Volver
        </Link>
        <h1 className="text-4xl font-black">GESTIÓN DE AFILIADOS</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : affiliates.length === 0 ? (
        <p className="text-gray-500">No hay afiliados</p>
      ) : (
        affiliates.map((aff) => (
          <div key={aff.id} className="border-2 border-black p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Código:</span>
                <code className="ml-2 font-mono">{aff.code.length > 5 ? aff.code.slice(0, 5) + "..." : aff.code}</code>
              </div>
              <div>
                <span className="text-gray-500">Nombre:</span>
                <span className="ml-2">{aff.user?.name || aff.user?.username || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500">Tasa:</span>
                <span className="ml-2">{(aff.commissionRate * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Pedidos:</span>
                <span className="ml-2">{aff.totalOrders}</span>
              </div>
              <div>
                <span className="text-gray-500">Billetera:</span>
                <span className="ml-2">{formatPrice(aff.wallet)}</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}