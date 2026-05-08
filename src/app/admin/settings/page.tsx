"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSession } from "next-auth/react";
import { X, Settings as SettingsIcon, Percent } from "lucide-react";

interface Settings {
  id: string;
  affiliateCommissionRate: number;
  deliveryCommissionRate: number;
}

async function getSettings(): Promise<Settings | null> {
  try {
    const res = await fetch("/api/admin/settings");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function updateSettings(
  affiliateCommissionRate: number,
  deliveryCommissionRate: number
): Promise<Settings> {
  const res = await fetch("/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ affiliateCommissionRate, deliveryCommissionRate }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al guardar");
  }
  return await res.json();
}

async function applyToAll(
  affiliateCommissionRate: number,
  deliveryCommissionRate: number
): Promise<{ success: boolean }> {
  const res = await fetch("/api/admin/settings/apply-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ affiliateCommissionRate, deliveryCommissionRate }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al aplicar");
  }
  return await res.json();
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmApply, setShowConfirmApply] = useState(false);
  const [error, setError] = useState("");

  const [affiliateRate, setAffiliateRate] = useState("10");
  const [deliveryRate, setDeliveryRate] = useState("20");

  const isAuthed =
    isAuthenticated || (status === "authenticated" && session?.user?.role === "ADMIN");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthed) {
      router.push("/login?from=/admin/settings");
    }
  }, [isAuthed, router, mounted]);

  useEffect(() => {
    if (!user?.id || !mounted) return;
    getSettings().then((data) => {
      if (data) {
        setSettings(data);
        setAffiliateRate((data.affiliateCommissionRate * 100).toString());
        setDeliveryRate((data.deliveryCommissionRate * 100).toString());
      }
    });
  }, [user?.id, mounted]);

  const handleSave = async () => {
    setError("");
    const affiliateNum = parseFloat(affiliateRate);
    const deliveryNum = parseFloat(deliveryRate);

    if (isNaN(affiliateNum) || affiliateNum < 0 || affiliateNum > 100) {
      setError("Comisión de afiliado debe ser 0-100");
      return;
    }

    if (isNaN(deliveryNum) || deliveryNum < 0 || deliveryNum > 100) {
      setError("Comisión de delivery debe ser 0-100");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings(affiliateNum / 100, deliveryNum / 100);
      setSettings(updated);
      setShowSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = async () => {
    setError("");
    const affiliateNum = parseFloat(affiliateRate);
    const deliveryNum = parseFloat(deliveryRate);

    if (isNaN(affiliateNum) || affiliateNum < 0 || affiliateNum > 100) {
      setError("Comisión de afiliado debe ser 0-100");
      return;
    }

    if (isNaN(deliveryNum) || deliveryNum < 0 || deliveryNum > 100) {
      setError("Comisión de delivery debe ser 0-100");
      return;
    }

    setSaving(true);
    try {
      await applyToAll(affiliateNum / 100, deliveryNum / 100);
      setShowConfirmApply(false);
      setShowSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al aplicar");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !isAuthed) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-2 py-6 md:px-6 md:py-12">
      <div className="border-2 border-black p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6" />
          <h1 className="text-2xl font-black">CONFIGURACIÓN</h1>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-black p-4">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5" />
              <h2 className="text-lg font-bold">COMISIONES</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Comisión de Afiliado (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={affiliateRate}
                    onChange={(e) => setAffiliateRate(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-black font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Porcentaje que recibe el afiliado por cada venta
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Comisión de Delivery (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={deliveryRate}
                    onChange={(e) => setDeliveryRate(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-black font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Porcentaje que recibe el delivery por cada entrega
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="border-2 border-red-500 bg-red-50 p-4">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/admin")}
              className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white"
            >
              VOLVER
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "GUARDAR"}
            </button>
          </div>

          <button
            onClick={() => setShowConfirmApply(true)}
            disabled={saving}
            className="w-full py-3 border-2 border-black font-medium hover:bg-black hover:text-white disabled:opacity-50"
          >
            {saving ? "Aplicando..." : "APLICAR A TODOS LOS EXISTENTES"}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm text-center">
            <div className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-black text-white rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-black mb-2">CONFIGURACIÓN GUARDADA</h2>
              <p className="text-gray-600 mb-6">
                Los cambios se han aplicado correctamente.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="w-full py-3 bg-black text-white font-medium hover:bg-gray-800"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmApply && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-xl font-black mb-4">CONFIRMAR</h2>
              <p className="text-gray-600 mb-6">
                Esto aplicará las tasas configuradas a TODOS los afiliados y delivery existentes.
                ¿Continuar?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmApply(false)}
                  className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleApplyToAll}
                  disabled={saving}
                  className="flex-1 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Aplicando..." : "APLICAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}