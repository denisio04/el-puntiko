"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/useAuthStore";

interface ProductRequestItem {
  id: string;
  productId: string;
  userId: string;
  status: "PENDING" | "NOTIFIED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    stock: number;
    image: string | null;
  };
  user: {
    id: string;
    name: string | null;
    username: string | null;
    phone: string | null;
  };
}

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  NOTIFIED: "Notificado",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  NOTIFIED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSolicitudesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { user: authUser, isAuthenticated: authIsAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<ProductRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [updating, setUpdating] = useState<string | null>(null);

  const isAuthed = authIsAuthenticated || status === "authenticated";
  const userRole = authUser?.role || (session?.user?.role as string | undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthed) {
      router.push("/login?from=/admin/solicitudes");
    } else if (userRole !== "ADMIN") {
      router.push("/");
    }
  }, [isAuthed, userRole, router, mounted]);

  useEffect(() => {
    if (!mounted || !isAuthed || userRole !== "ADMIN") return;

    async function fetchRequests() {
      try {
        const res = await fetch("/api/admin/product-requests");
        if (res.ok) {
          const data = await res.json();
          setRequests(data);
        } else {
          console.error("API error:", res.status, await res.text());
        }
      } catch (error) {
        console.error("Error fetching product requests:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [mounted, isAuthed, userRole]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);

    if (newStatus === "NOTIFIED") {
      const req = requests.find((r) => r.id === id);
      if (req?.user?.phone) {
        const phone = req.user.phone.replace(/[^0-9]/g, "");
        const productName = req.product.name;
        const message = encodeURIComponent(
          `Hola ${req.user.name || "cliente"}, el producto "${productName}" que solicitaste ya está disponible en EL PUNTIKO. Puedes comprarlo ahora.`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
      }
    }

    try {
      const res = await fetch(`/api/admin/product-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: newStatus as ProductRequestItem["status"] }
              : r
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "Error al actualizar");
      }
    } catch {
      alert("Error al actualizar la solicitud");
    } finally {
      setUpdating(null);
    }
  };

  const filteredRequests = statusFilter
    ? requests.filter((r) => r.status === statusFilter)
    : requests;

  if (!mounted || !isAuthed || userRole !== "ADMIN") {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 md:px-6 md:py-12">
      <div className="border-b border-black pb-4 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <h1 className="text-3xl md:text-4xl font-black">
          SOLICITUDES DE PRODUCTOS
        </h1>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-4 py-2 border-2 border-black ${
                statusFilter === ""
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              Todas ({requests.length})
            </button>
            {Object.entries(statusLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-2 border-2 border-black ${
                  statusFilter === key
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                {label} ({requests.filter((r) => r.status === key).length})
              </button>
            ))}
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay solicitudes
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block border border-black mb-8">
                <div className="grid grid-cols-12 bg-black text-white font-bold p-4">
                  <div className="col-span-3">Producto</div>
                  <div className="col-span-3">Solicitante</div>
                  <div className="col-span-2">Fecha</div>
                  <div className="col-span-2">Estado</div>
                  <div className="col-span-2 text-right">Acción</div>
                </div>
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="grid grid-cols-12 p-4 border-b border-black items-center hover:bg-gray-50"
                  >
                    <div className="col-span-3">
                      <div className="font-medium">{req.product.name}</div>
                      {req.product.stock > 0 && (
                        <div className="text-xs text-green-600 font-bold mt-1">
                          Stock: {req.product.stock}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3">
                      <div className="font-medium">
                        {req.user.name || req.user.username || "-"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {req.user.phone || "Sin teléfono"}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-gray-500">
                      {formatDate(req.createdAt)}
                    </div>
                    <div className="col-span-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-bold ${statusColors[req.status]}`}
                      >
                        {statusLabels[req.status]}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      {req.status === "PENDING" && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => updateStatus(req.id, "NOTIFIED")}
                            disabled={updating === req.id}
                            className="px-3 py-1 text-xs border border-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Notificar
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "CANCELLED")}
                            disabled={updating === req.id}
                            className="px-3 py-1 text-xs border border-black bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                      {req.status === "NOTIFIED" && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => updateStatus(req.id, "COMPLETED")}
                            disabled={updating === req.id}
                            className="px-3 py-1 text-xs border border-black bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "CANCELLED")}
                            disabled={updating === req.id}
                            className="px-3 py-1 text-xs border border-black bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-4">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="border-2 border-black p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-bold">{req.product.name}</div>
                      <span
                        className={`px-2 py-1 text-xs font-bold ${statusColors[req.status]}`}
                      >
                        {statusLabels[req.status]}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Solicitante:</span>{" "}
                      {req.user.name || req.user.username || "-"} -{" "}
                      {req.user.phone || "Sin teléfono"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(req.createdAt)}
                    </div>
                    {req.product.stock > 0 && (
                      <div className="text-xs text-green-600 font-bold">
                        Stock: {req.product.stock}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {req.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => updateStatus(req.id, "NOTIFIED")}
                            disabled={updating === req.id}
                            className="flex-1 px-3 py-2 text-sm border border-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Notificar
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "CANCELLED")}
                            disabled={updating === req.id}
                            className="flex-1 px-3 py-2 text-sm border border-black bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      {req.status === "NOTIFIED" && (
                        <>
                          <button
                            onClick={() => updateStatus(req.id, "COMPLETED")}
                            disabled={updating === req.id}
                            className="flex-1 px-3 py-2 text-sm border border-black bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Completar
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, "CANCELLED")}
                            disabled={updating === req.id}
                            className="flex-1 px-3 py-2 text-sm border border-black bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
