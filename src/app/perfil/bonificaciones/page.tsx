"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BonusProgress {
  confirmedOrders: number;
  requiredOrders: number;
  discountPercent: number;
  targetType: string;
  isActive: boolean;
  hasReached: boolean;
  productsAffected: number;
  bonusProductsUsed?: number;
  requiredProducts?: number;
  canUseBonus?: boolean;
}

export default function PerfilBonificacionesPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<BonusProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bonus/progress");

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (!res.ok) {
        throw new Error("Error al cargar progreso");
      }

      const data = await res.json();
      setProgress(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CU", {
      style: "currency",
      currency: "CUP",
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-black p-8 text-center">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-red-600 p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/login")}
              className="border-2 border-black px-6 py-2 hover:bg-black hover:text-white"
            >
              Ir a Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="border-2 border-black p-8 text-center">
            <p>No hay bonificaciones disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  const isBonoUsed = progress.isActive && !progress.canUseBonus && progress.hasReached === false;
  const percentage = progress.isActive
    ? Math.min((progress.confirmedOrders / progress.requiredOrders) * 100, 100)
    : 0;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-8">
          BONIFICACIONES
        </h1>

        {!progress.isActive ? (
          <div className="border-2 border-black p-8 text-center">
            <p className="text-gray-500 mb-2">No hay bonificaciones activas</p>
            <p className="text-sm text-gray-400">
              Vuelve más tarde para ver nuevas ofertas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border-2 border-black p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black">TU PROGRESO</h2>
                <span className="text-2xl font-black">
                  {Math.round(percentage)}%
                </span>
              </div>

              <div className="w-full h-4 border-2 border-black relative">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-4 flex justify-between text-sm">
                <span>
                  {progress.confirmedOrders} pedido(s) confirmado(s)
                </span>
                <span>
                  {progress.requiredOrders} pedidos necesarios
                </span>
              </div>
            </div>

            <div className="border-2 border-black p-6">
              <h2 className="text-xl font-black mb-4">DETALLES</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Descuento</span>
                  <span className="font-bold">
                    {Math.round(progress.discountPercent * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Productos elegibles</span>
                  <span className="font-bold">
                    {progress.targetType === "ALL"
                      ? "Todos los productos"
                      : `${progress.productsAffected} producto(s)`}
                  </span>
                </div>
              </div>
            </div>

            {isBonoUsed && (
              <div className="border-2 border-black p-6 text-center">
                <h2 className="text-2xl font-black mb-2">
                  ¡BONO APLICADO!
                </h2>
                <p className="mb-4">
                  Has usado tu descuento del {Math.round(progress.discountPercent * 100)}%.
                  Necesitas hacer {progress.requiredOrders} pedido(s) más para volver a desbloquearlo.
                </p>
                <a
                  href="/"
                  className="inline-block border-2 border-black px-6 py-2 hover:bg-black hover:text-white"
                >
                  Seguir comprando
                </a>
              </div>
            )}
            {!isBonoUsed && progress.hasReached && (
              <div className="border-2 border-black bg-black text-white p-6 text-center">
                <h2 className="text-2xl font-black mb-2">
                  ¡DESCUENTO DESBLOQUEADO!
                </h2>
                <p className="mb-4">
                  Has alcanzado el requisito de pedidos. Ahora puedes
                  disfrutar de {Math.round(progress.discountPercent * 100)}%
                  de descuento en tus compras.
                </p>
                <a
                  href="/productos"
                  className="inline-block border-2 border-white px-6 py-2 hover:bg-white hover:text-black"
                >
                  Ver productos con descuento
                </a>
              </div>
            )}
            {!isBonoUsed && !progress.hasReached && (
              <div className="border-2 border-black p-6 text-center">
                <h2 className="text-xl font-black mb-2">
                  ¡SEGUÍ COMPRANDO!
                </h2>
                <p className="text-gray-600 mb-2">
                  Necesitas {progress.requiredOrders - progress.confirmedOrders}{" "}
                  pedido(s) más para desbloquear tu descuento de{" "}
                  {Math.round(progress.discountPercent * 100)}%
                </p>
                <a
                  href="/"
                  className="inline-block border-2 border-black px-6 py-2 hover:bg-black hover:text-white"
                >
                  Seguir comprando
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}