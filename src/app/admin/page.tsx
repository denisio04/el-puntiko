"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSession, signOut } from "next-auth/react";
import { X } from "lucide-react";
import { getAdminWallet, withdrawFromWallet } from "./actions";

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const loggingOut = useAuthStore((state) => state.loggingOut);
  const setLoggingOut = useAuthStore((state) => state.setLoggingOut);
  const logout = useAuthStore((state) => state.logout);
  const [mounted, setMounted] = useState(false);
  const [wallet, setWallet] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const isAuthed =
    isAuthenticated ||
    (status === "authenticated" && session?.user?.role === "ADMIN");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthed && !loggingOut) {
      router.push("/login?from=/admin");
    }
  }, [isAuthed, router, mounted, loggingOut]);

  useEffect(() => {
    if (!user?.id || !mounted) return;
    getAdminWallet()
      .then((data) => {
        if (data.wallet !== undefined) {
          setWallet(data.wallet);
        }
      })
      .catch(console.error);
  }, [user?.id, mounted]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/" });
    logout();
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > wallet) {
      alert("Cantidad inválida");
      return;
    }

    setWithdrawing(true);
    try {
      const data = await withdrawFromWallet(amount);

      if (data.wallet !== undefined) {
        setWallet(data.wallet);
        setShowWithdraw(false);
        setWithdrawAmount("");
        setShowSuccess(true);
      } else {
        alert(data.error || "Error al retirar");
      }
    } catch {
      alert("Error al procesar retiro");
    } finally {
      setWithdrawing(false);
    }
  };

  if (!mounted || !isAuthed) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 md:px-6 md:py-12">
      <div className="border-2 border-black p-6 md:p-8 mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black mb-2">
              PANEL DE ADMINISTRADOR
            </h1>
            <p className="text-lg">Bienvenido, {user?.name || user?.email}</p>
          </div>
          <div className="w-full md:w-auto flex flex-col md:items-end gap-3">
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500">TU BILLETERA</p>
                <p className="text-2xl md:text-3xl font-black">
                  ${wallet.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setShowWithdraw(true)}
                disabled={wallet <= 0}
                className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <span className="font-bold">Retirar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <a
          href="/"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Ver EL PUNTIKO.</h2>
          <p className="text-sm">Ir a la página principal de EL PUNTIKO.</p>
        </a>

        <Link
          href="/admin/productos"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Productos / Categorías</h2>
          <p className="text-sm">
            Agregar, editar o eliminar categorías y productos
          </p>
        </Link>

        <Link
          href="/admin/pedidos"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Ver Pedidos</h2>
          <p className="text-sm">Consultar pedidos realizados</p>
        </Link>

        <Link
          href="/admin/dashboard"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Dashboard</h2>
          <p className="text-sm">Estadísticas y métricas</p>
        </Link>

        <Link
          href="/admin/afiliados"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Afiliados</h2>
          <p className="text-sm">Gestionar programa de afiliados</p>
        </Link>

        <Link
          href="/admin/trabajadores"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Pagos a Trabajadores</h2>
          <p className="text-sm">
            Pagar a afiliados, suppliers, delivery y staff
          </p>
        </Link>

        <Link
          href="/admin/usuarios"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Usuarios</h2>
          <p className="text-sm">Gestionar usuarios y roles</p>
        </Link>

        <Link
          href="/admin/bonos"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Bonos</h2>
          <p className="text-sm">Configurar bonificaciones</p>
        </Link>

        <Link
          href="/admin/settings"
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors"
        >
          <h2 className="text-xl font-bold mb-2">Configuración</h2>
          <p className="text-sm">
            Configutaciones de afiliados, delivery y staff
          </p>
        </Link>

        <button
          onClick={handleLogout}
          className="block border-2 border-black p-6 hover:bg-black hover:text-white transition-colors text-left"
        >
          <h2 className="text-xl font-bold mb-2">Cerrar Sesión</h2>
          <p className="text-sm">Salir del panel de administración</p>
        </button>
      </div>

      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b border-black">
              <h2 className="text-xl font-black">RETIRAR</h2>
              <button
                onClick={() => setShowWithdraw(false)}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Disponible</p>
                <p className="text-xl font-black">${wallet.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cantidad a retirar
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={wallet}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-black font-medium"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWithdraw(false)}
                  className="flex-1 py-3 border-2 border-black font-medium hover:bg-black hover:text-white"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={
                    withdrawing ||
                    !withdrawAmount ||
                    parseFloat(withdrawAmount) > wallet
                  }
                  className="flex-1 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {withdrawing ? "Procesando..." : "RETIRAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm text-center">
            <div className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-black text-white rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h2 className="text-2xl font-black mb-2">RETIRO PROCESADO</h2>
              <p className="text-gray-600 mb-6">
                Tu retiro ha sido procesado correctamente.
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
    </div>
  );
}
