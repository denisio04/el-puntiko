"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Send, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAuthStore } from "@/stores/useAuthStore";
import { signOut } from "next-auth/react";
import {
  getStaffWallet,
  getStaffOrders,
  updateOrderStatus,
  getDeliveryPersons,
  assignDeliveryPerson,
} from "./actions";
import { formatPrice } from "@/lib/utils";
import { generateWhatsAppLink } from "@/lib/whatsapp";

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
  subtotal: number;
  total: number;
  discountAmount?: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  delivery: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
}

interface DeliveryPerson {
  id: string;
  name: string | null;
  phone: string | null;
}

interface StaffStats {
  wallet: number;
}

export default function StaffPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "orders">(
    "dashboard",
  );

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/staff");
    } else if (user?.role !== "STAFF") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, mounted]);

  useEffect(() => {
    async function fetchData() {
      if (!mounted) return;
      try {
        const [walletRes, ordersRes, deliveriesRes] = await Promise.all([
          getStaffWallet(),
          getStaffOrders(),
          getDeliveryPersons(),
        ]);

        if (walletRes.wallet !== undefined) {
          setStats({ wallet: walletRes.wallet });
        }
        if (ordersRes.orders) {
          setOrders(ordersRes.orders);
        }
        if (deliveriesRes.deliveries) {
          setDeliveries(deliveriesRes.deliveries);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated && mounted && user?.role === "STAFF") {
      fetchData();
    }
  }, [isAuthenticated, mounted, user?.role]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const result = await updateOrderStatus(orderId, status);
      if ("order" in result && result.order) {
        setOrders((prev) => {
          const updated = prev.map((o) =>
            o.id === orderId
              ? { ...o, status, delivery: result.order?.delivery || o.delivery }
              : o,
          );
          return updated;
        });
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                status,
                delivery: result.order?.delivery || prev.delivery,
              }
            : null,
        );
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const assignDelivery = async (orderId: string, deliveryId: string) => {
    try {
      const result = await assignDeliveryPerson(orderId, deliveryId);
      if ("order" in result && result.order) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, delivery: result.order?.delivery || null }
              : o,
          ),
        );
        setSelectedOrder((prev) =>
          prev ? { ...prev, delivery: result.order?.delivery || null } : prev,
        );
      }
    } catch (error) {
      console.error("Error assigning delivery:", error);
    }
  };

  const sendToDelivery = (order: Order) => {
    if (!order.delivery?.phone || !order.delivery.name) return;

    const itemsList = order.items
      .map((item) => `${item.quantity}x ${item.product.name}`)
      .join(", ");

    const message = `📦 PEDIDO #${order.orderNumber}

👤 Cliente: ${order.customerName}
📱 Teléfono: ${order.customerPhone}
📍 Dirección: ${order.customerAddress}

🛒 Productos: ${itemsList}

💰 Total: ${formatPrice(order.total)}

📝 Notas: ${order.notes || "Sin notas"}`;

    const waLink = generateWhatsAppLink(order.delivery.phone, message);
    window.open(waLink, "_blank");
  };

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

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl md:text-3xl font-black">Panel de Staff</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 border-2 border-black hover:bg-black hover:text-white text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b-2 border-black">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 font-medium ${activeTab === "dashboard" ? "bg-black text-white" : "hover:bg-gray-100"}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 font-medium ${activeTab === "orders" ? "bg-black text-white" : "hover:bg-gray-100"}`}
        >
          Pedidos
        </button>
      </div>

      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="border-2 border-black p-4">
            <div className="text-sm text-gray-600 mb-1">Mi Billetera</div>
            <div className="text-xl md:text-2xl font-black">
              {formatPrice(stats?.wallet || 0)}
            </div>
          </div>
          <div className="border-2 border-black p-4">
            <div className="text-sm text-gray-600 mb-1">
              Pedidos Confirmados
            </div>
            <div className="text-xl md:text-2xl font-black">
              {orders.filter((o) => o.status === "CONFIRMED").length}
            </div>
          </div>
          <div className="border-2 border-black p-4">
            <div className="text-sm text-gray-600 mb-1">Pedidos Pendientes</div>
            <div className="text-xl md:text-2xl font-black">
              {orders.filter((o) => o.status === "PENDING").length}
            </div>
          </div>
          <div className="border-2 border-black p-4">
            <div className="text-sm text-gray-600 mb-1">Pedidos Cancelados</div>
            <div className="text-xl md:text-2xl font-black">
              {orders.filter((o) => o.status === "CANCELLED").length}
            </div>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
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
                      {formatPrice(order.total)}
                      {order.subtotal > order.total && (
                        <span className="text-xs text-green-600 ml-1 block">
                          (-{formatPrice(order.subtotal - order.total)})
                        </span>
                      )}
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
                        {formatPrice(order.total)}
                        {order.subtotal > order.total && (
                          <span className="text-xs text-green-600 ml-1">
                            (-{formatPrice(order.subtotal - order.total)})
                          </span>
                        )}
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
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    TELÉFONO
                  </h3>
                  <p className="font-medium">{selectedOrder.customerPhone}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">
                    DIRECCIÓN
                  </h3>
                  <p className="font-medium">{selectedOrder.customerAddress}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">NOTAS</h3>
                    <p className="font-medium">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  PRODUCTOS
                </h3>
                <div className="border border-black p-3 space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-black pt-2 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.subtotal > selectedOrder.total && (
                      <div className="flex justify-between text-green-600">
                        <span>Descuento</span>
                        <span>-{formatPrice(selectedOrder.subtotal - selectedOrder.total)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  REPARTIDOR
                </h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedOrder.delivery?.id || ""}
                    onChange={(e) => {
                      assignDelivery(selectedOrder.id, e.target.value);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-black font-medium"
                  >
                    <option value="">Seleccionar repartidor</option>
                    {deliveries.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedOrder.delivery && (
                    <button
                      onClick={() => sendToDelivery(selectedOrder)}
                      className="px-4 py-3 bg-green-600 text-white font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  ESTADO
                </h3>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    updateStatus(selectedOrder.id, e.target.value);
                    setSelectedOrder({
                      ...selectedOrder,
                      status: e.target.value,
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-black font-medium"
                >
                  <option value="PENDING">Pendiente</option>
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
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
