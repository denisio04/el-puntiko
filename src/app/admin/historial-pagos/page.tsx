"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { getPaymentHistory } from "../actions";

interface PaymentTransaction {
  id: string;
  userId: string | null;
  userName: string;
  userUsername: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export default function AdminHistorialPagosPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || !user) {
      router.push("/login?from=/admin/historial-pagos");
    } else if (user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    getPaymentHistory()
      .then((data) => {
        if (data.transactions) setTransactions(data.transactions);
      })
      .finally(() => setLoading(false));
  }, [mounted, user]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!mounted || !user || user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 md:px-6 md:py-12">
      <div className="border-b-2 border-black pb-4 mb-6 md:mb-8">
        <Link
          href="/admin/trabajadores"
          className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <h1 className="text-2xl md:text-4xl font-black">HISTORIAL DE PAGOS</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : transactions.length === 0 ? (
        <div className="border-2 border-black p-6 md:p-8 text-center">
          <Receipt className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No hay pagos registrados</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block border-2 border-black">
            <div className="grid grid-cols-12 gap-2 p-4 bg-black text-white font-bold border-b-2 border-black">
              <div className="col-span-3">Fecha</div>
              <div className="col-span-3">Trabajador</div>
              <div className="col-span-3">Descripción</div>
              <div className="col-span-3 text-right">Cantidad</div>
            </div>

            {transactions.map((tx, index) => (
              <div
                key={tx.id}
                className={`grid grid-cols-12 gap-2 p-4 border-b-2 border-black ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <div className="col-span-3 text-sm">
                  {formatDate(tx.createdAt)}
                </div>
                <div className="col-span-3">
                  <span className="font-medium">{tx.userName}</span>
                  {tx.userUsername && (
                    <span className="text-gray-500 text-sm ml-1">
                      (@{tx.userUsername})
                    </span>
                  )}
                </div>
                <div className="col-span-3 text-sm text-gray-600">
                  {tx.description || "-"}
                </div>
                <div className="col-span-3 text-right font-black text-lg">
                  -{formatPrice(tx.amount)}
                </div>
              </div>
            ))}
          </div>

          <div className="md:hidden space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="border-2 border-black p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold">{tx.userName}</p>
                    {tx.userUsername && (
                      <p className="text-gray-500 text-sm">@{tx.userUsername}</p>
                    )}
                  </div>
                  <p className="font-black text-lg">-{formatPrice(tx.amount)}</p>
                </div>
                <p className="text-sm text-gray-600 mb-1">{tx.description || "-"}</p>
                <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}