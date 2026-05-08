"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/useAuthStore";
import { getOrders } from "../actions";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string | null;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  customer?: {
    name: string | null;
    phone: string | null;
    address: string | null;
    ci: string | null;
  } | null;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/admin/pedidos");
    } else if (user?.role !== "ADMIN" && user?.role !== "AFFILIATE") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, mounted]);

  useEffect(() => {
    async function adminFetchOrders() {
      try {
        const data = await getOrders();
        if (data.orders) {
          const sorted = [...data.orders].sort((a, b) => {
            const statusOrder: Record<string, number> = {
              PENDING: 0,
              CONFIRMED: 1,
              CANCELLED: 2,
            };
            return statusOrder[a.status] - statusOrder[b.status];
          });
          setOrders(sorted);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }
    adminFetchOrders();
  }, []);

  const filteredOrders = statusFilter
    ? orders.filter((o) => o.status === statusFilter)
    : orders;

  const statusVariant = (status: string) => {
    const map: Record<string, "success" | "warning" | "error" | "info"> = {
      CONFIRMED: "success",
      PENDING: "warning",
      CANCELLED: "error",
    };
    return map[status] || "info";
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: "Pendiente",
      CONFIRMED: "Confirmado",
      CANCELLED: "Cancelado",
    };
    return labels[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 md:px-6 md:py-12">
      <div className="border-b border-black pb-4 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <h1 className="text-3xl md:text-4xl font-black">GESTIÓN DE PEDIDOS</h1>
      </div>

      {loading ? (
        <div className="p-8 text-center">Cargando...</div>
      ) : (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-4 py-2 border-2 border-black ${statusFilter === "" ? "bg-black text-white" : "hover:bg-gray-100"}`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter("PENDING")}
              className={`px-4 py-2 border-2 border-black ${statusFilter === "PENDING" ? "bg-black text-white" : "hover:bg-gray-100"}`}
            >
              Pendiente ({orders.filter((o) => o.status === "PENDING").length})
            </button>
            <button
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`px-4 py-2 border-2 border-black ${statusFilter === "CONFIRMED" ? "bg-black text-white" : "hover:bg-gray-100"}`}
            >
              Confirmado (
              {orders.filter((o) => o.status === "CONFIRMED").length})
            </button>
            <button
              onClick={() => setStatusFilter("CANCELLED")}
              className={`px-4 py-2 border-2 border-black ${statusFilter === "CANCELLED" ? "bg-black text-white" : "hover:bg-gray-100"}`}
            >
              Cancelado ({orders.filter((o) => o.status === "CANCELLED").length}
              )
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center">No hay pedidos</div>
          ) : (
            <>
              <div className="hidden md:block border border-black mb-8">
                <div className="grid grid-cols-12 bg-black text-white font-bold p-4">
                  <div className="col-span-2">Número</div>
                  <div className="col-span-3">Cliente</div>
                  <div className="col-span-2">Total</div>
                  <div className="col-span-2">Estado</div>
                  <div className="col-span-3 text-right">Acción</div>
                </div>
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="grid grid-cols-12 p-4 border-b border-black items-center hover:bg-gray-50"
                  >
                    <div className="col-span-2 font-mono text-sm">
                      {order.orderNumber}
                    </div>
                    <div className="col-span-3">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-sm text-gray-500">
                        {order.customerPhone}
                      </div>
                    </div>
                    <div className="col-span-2 font-black">
                      ${order.total.toFixed(2)}
                    </div>
                    <div className="col-span-2">
                      <Badge variant={statusVariant(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-3 py-1 border border-black hover:bg-black hover:text-white text-sm"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="md:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border-2 border-black p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-mono text-sm">
                          {order.orderNumber}
                        </span>
                        <h3 className="font-bold">{order.customerName}</h3>
                        <p className="text-sm text-gray-500">
                          {order.customerPhone}
                        </p>
                      </div>
                      <Badge variant={statusVariant(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t border-black">
                      <span className="font-black text-xl">
                        ${order.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 border-2 border-black hover:bg-black hover:text-white"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-black">
              <h2 className="text-lg md:text-xl font-black">
                {selectedOrder.orderNumber}
              </h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">CLIENTE</h3>
                  <p className="font-medium">
                    {selectedOrder.customer?.name ||
                      selectedOrder.customerName ||
                      "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    TELÉFONO
                  </h3>
                  <p className="font-medium">
                    {selectedOrder.customer?.phone ||
                      selectedOrder.customerPhone ||
                      "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    DIRECCIÓN
                  </h3>
                  <p className="font-medium">
                    {selectedOrder.customer?.address ||
                      selectedOrder.customerAddress ||
                      "—"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    CARNET DE IDENTIDAD
                  </h3>
                  <p className="font-medium">
                    {selectedOrder.customer
                      ? selectedOrder.customer.ci || "—"
                      : "No disponible"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  PRODUCTOS
                </h3>
                <div className="border border-black">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between p-3 border-b border-black last:border-b-0"
                    >
                      <div>
                        <p className="font-medium">
                          {item.product?.name || "Producto"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <p className="font-black">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="p-3 border-t border-black bg-black text-white flex justify-between font-black">
                    <span>TOTAL</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">ESTADO</h3>
                <div className="mt-1">
                  <Badge variant={statusVariant(selectedOrder.status)}>
                    {statusLabel(selectedOrder.status)}
                  </Badge>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-3 bg-black text-white font-medium hover:bg-gray-800"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
