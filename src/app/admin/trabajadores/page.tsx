"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { getWorkers, payWorker, payAllWorkers } from "../actions";

interface Worker {
  id: string;
  username: string | null;
  name: string | null;
  role: string;
  wallet: number;
}

const roleLabels: Record<string, string> = {
  AFFILIATE: "Afiliado",
  SUPPLIER: "Proveedor",
  DELIVERY: "Delivery",
  STAFF: "Personal",
};

export default function AdminTrabajadoresPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paying, setPaying] = useState(false);

  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
  const [payingAll, setPayingAll] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated || !user) {
      router.push("/login?from=/admin/trabajadores");
    } else if (user?.role !== "ADMIN") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, mounted]);

  useEffect(() => {
    if (!mounted || !user) return;
    getWorkers()
      .then((data) => {
        if (data.workers) setWorkers(data.workers);
      })
      .finally(() => setLoading(false));
  }, [mounted, user]);

  const handleOpenPayModal = (worker: Worker) => {
    setSelectedWorker(worker);
    setPayAmount("");
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!selectedWorker) return;

    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0 || amount > selectedWorker.wallet) {
      alert("Cantidad inválida");
      return;
    }

    setPaying(true);
    try {
      const data = await payWorker(selectedWorker.id, amount);
      if (data.success) {
        setShowPayModal(false);
        setSuccessMessage(`Pago de ${formatPrice(amount)} realizado a ${selectedWorker.name || selectedWorker.username}`);
        setShowSuccess(true);
        const updatedData = await getWorkers();
        if (updatedData.workers) setWorkers(updatedData.workers);
      } else {
        alert(data.error || "Error al procesar pago");
      }
    } catch {
      alert("Error al procesar pago");
    } finally {
      setPaying(false);
    }
  };

  const handlePayAll = async () => {
    setPayingAll(true);
    try {
      const data = await payAllWorkers();
      if (data.success) {
        setShowPayAllConfirm(false);
        setSuccessMessage(`${data.processed} trabajador(es) pagado(s). Total: ${formatPrice(data.totalAmount)}`);
        setShowSuccess(true);
        const updatedData = await getWorkers();
        if (updatedData.workers) setWorkers(updatedData.workers);
      } else {
        alert(data.error || "Error al procesar pagos");
      }
    } catch {
      alert("Error al procesar pagos");
    } finally {
      setPayingAll(false);
    }
  };

  const hasWorkersWithBalance = workers.some((w) => w.wallet > 0);

  if (!mounted || !user || user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 md:px-6 md:py-12">
      <div className="border-b-2 border-black pb-4 mb-6 md:mb-8">
        <Link href="/admin" className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4">
          <ArrowLeft className="w-4 h-4" />Volver
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-4xl font-black">PAGOS A TRABAJADORES</h1>
          <button
            onClick={() => router.push("/admin/historial-pagos")}
            className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors text-sm md:text-base"
          >
            Ver Historial
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : workers.length === 0 ? (
        <div className="border-2 border-black p-6 md:p-8 text-center">
          <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No hay trabajadores registrados</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPayAllConfirm(true)}
              disabled={!hasWorkersWithBalance}
              className="w-full sm:w-auto px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Vaciar Todas
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block border-2 border-black">
            <div className="grid grid-cols-12 gap-2 p-4 bg-black text-white font-bold border-b-2 border-black">
              <div className="col-span-3">Nombre</div>
              <div className="col-span-2">Usuario</div>
              <div className="col-span-2">Rol</div>
              <div className="col-span-3">Billetera</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>

            {workers.map((worker, index) => (
              <div
                key={worker.id}
                className={`grid grid-cols-12 gap-2 p-4 border-b-2 border-black ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <div className="col-span-3 font-medium">
                  {worker.name || "Sin nombre"}
                </div>
                <div className="col-span-2 text-gray-600">
                  {worker.username || "-"}
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 border border-black text-xs">
                    {roleLabels[worker.role] || worker.role}
                  </span>
                </div>
                <div className="col-span-3 font-black text-lg">
                  {formatPrice(worker.wallet)}
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <button
                    onClick={() => handleOpenPayModal(worker)}
                    disabled={worker.wallet <= 0}
                    className="px-3 py-1 border-2 border-black hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Pagar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWorker(worker);
                      setPayAmount(worker.wallet.toString());
                      setShowPayModal(true);
                    }}
                    disabled={worker.wallet <= 0}
                    className="px-3 py-1 bg-black text-white border-2 border-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Todo
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="border-2 border-black p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-lg">{worker.name || "Sin nombre"}</p>
                    <p className="text-gray-500 text-sm">@{worker.username || "-"}</p>
                  </div>
                  <span className="px-2 py-1 border border-black text-xs shrink-0">
                    {roleLabels[worker.role] || worker.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="font-black text-xl">{formatPrice(worker.wallet)}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenPayModal(worker)}
                      disabled={worker.wallet <= 0}
                      className="px-3 py-2 border-2 border-black hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                      Pagar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWorker(worker);
                        setPayAmount(worker.wallet.toString());
                        setShowPayModal(true);
                      }}
                      disabled={worker.wallet <= 0}
                      className="px-3 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                      Todo
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pay Modal */}
      {showPayModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b-2 border-black sticky top-0 bg-white">
              <h2 className="text-lg md:text-xl font-black">PAGAR</h2>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Trabajador</p>
                <p className="text-lg font-bold">{selectedWorker.name || selectedWorker.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Disponible</p>
                <p className="text-xl font-black">{formatPrice(selectedWorker.wallet)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cantidad a pagar
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedWorker.wallet}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-black font-medium"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handlePay}
                  disabled={
                    paying ||
                    !payAmount ||
                    parseFloat(payAmount) <= 0 ||
                    parseFloat(payAmount) > selectedWorker.wallet
                  }
                  className="flex-1 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {paying ? "..." : "PAGAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay All Confirmation */}
      {showPayAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 space-y-4">
              <p className="text-lg font-bold">¿Vaciar todas las billeteras?</p>
              <p className="text-gray-600 text-sm">
                Se pagarán {workers.filter((w) => w.wallet > 0).length} trabajador(es) con un total de{" "}
                <span className="font-black">{formatPrice(workers.reduce((sum, w) => sum + w.wallet, 0))}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPayAllConfirm(false)}
                  className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handlePayAll}
                  disabled={payingAll}
                  className="flex-1 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {payingAll ? "..." : "CONFIRMAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-8 text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 bg-black text-white rounded-full flex items-center justify-center">
                <span className="text-2xl md:text-3xl">✓</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black mb-2">PAGO PROCESADO</h2>
              <p className="text-gray-600 mb-6 text-sm">{successMessage}</p>
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
    </div>
  );
}