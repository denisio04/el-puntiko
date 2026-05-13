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
  getStaffWalletUsers,
  getUserWalletTransactions,
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
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "orders" | "solicitudes" | "wallets"
  >("dashboard");
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(true);
  const [solicitudesFilter, setSolicitudesFilter] = useState("");
  const [solicitudesUpdating, setSolicitudesUpdating] = useState<string | null>(
    null,
  );
  const [showConfirmSuccess, setShowConfirmSuccess] = useState<string | null>(
    null,
  );
  const [showStockError, setShowStockError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [selectedWalletUser, setSelectedWalletUser] = useState<any | null>(
    null,
  );
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [walletTxsLoading, setWalletTxsLoading] = useState(false);

  const handleSelectWallet = async (userId: string) => {
    const user = wallets.find((w) => w.id === userId);
    if (!user) return;
    setSelectedWalletUser(user);
    setWalletTxsLoading(true);
    try {
      const data = await getUserWalletTransactions(userId);
      if (data.transactions) {
        setWalletTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
    } finally {
      setWalletTxsLoading(false);
    }
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Admin",
      AFFILIATE: "Afiliado",
      SUPPLIER: "Proveedor",
      DELIVERY: "Delivery",
      STAFF: "Staff",
    };
    return labels[role] || role;
  };

  const txTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      COMMISSION: "Comisión de afiliado",
      PROFIT: "Ganancia",
      DELIVERY_COMMISSION: "Comisión de delivery",
      PURCHASE_ORDERS: "Pago a proveedor",
    };
    return labels[type] || type;
  };

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
        const [walletRes, ordersRes, deliveriesRes, walletsRes] =
          await Promise.all([
            getStaffWallet(),
            getStaffOrders(),
            getDeliveryPersons(),
            getStaffWalletUsers(),
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
        if (walletsRes.users) {
          setWallets(walletsRes.users);
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

  // Solicitudes (product requests)
  useEffect(() => {
    if (!mounted || !isAuthenticated || user?.role !== "STAFF") return;
    async function fetchSolicitudes() {
      try {
        const res = await fetch("/api/admin/product-requests");
        if (res.ok) {
          const data = await res.json();
          setSolicitudes(data);
        }
      } catch (error) {
        console.error("Error fetching product requests:", error);
      } finally {
        setSolicitudesLoading(false);
      }
    }
    if (activeTab === "solicitudes") {
      fetchSolicitudes();
    }
  }, [mounted, isAuthenticated, user?.role, activeTab]);

  const updateSolicitudStatus = async (id: string, newStatus: string) => {
    setSolicitudesUpdating(id);

    if (newStatus === "NOTIFIED") {
      const req = solicitudes.find((r: any) => r.id === id);
      if (req?.user?.phone) {
        const phone = req.user.phone.replace(/[^0-9]/g, "");
        const productName = req.product.name;
        const message = encodeURIComponent(
          `Hola ${req.user.name || "cliente"}, el producto "${productName}" que solicitaste ya está disponible en EL PUNTIKO. Puedes comprarlo ahora.`,
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
        setSolicitudes((prev: any[]) =>
          prev.map((r: any) => (r.id === id ? { ...r, status: newStatus } : r)),
        );
      } else {
        const data = await res.json();
        alert(data.error || "Error al actualizar");
      }
    } catch {
      alert("Error al actualizar la solicitud");
    } finally {
      setSolicitudesUpdating(null);
    }
  };

  const confirmSolicitud = async (id: string) => {
    setSolicitudesUpdating(id);
    try {
      const res = await fetch("/api/staff/confirm-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSolicitudes((prev: any[]) =>
          prev.map((r: any) =>
            r.id === id ? { ...r, status: "COMPLETED" } : r,
          ),
        );
        setShowConfirmSuccess(data.orderNumber);
      } else {
        const msg = data.error || "Error al confirmar";
        if (msg.toLowerCase().includes("stock")) {
          setShowStockError(msg);
        } else {
          alert(msg);
        }
      }
    } catch {
      alert("Error al confirmar la solicitud");
    } finally {
      setSolicitudesUpdating(null);
    }
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

      <div className="flex gap-2 mb-6 border-b-2 border-black overflow-x-auto hide-scrollbar">
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
        <button
          onClick={() => setActiveTab("solicitudes")}
          className={`px-4 py-2 font-medium ${activeTab === "solicitudes" ? "bg-black text-white" : "hover:bg-gray-100"}`}
        >
          Solicitudes
        </button>
        <button
          onClick={() => setActiveTab("wallets")}
          className={`px-4 py-2 font-medium ${activeTab === "wallets" ? "bg-black text-white" : "hover:bg-gray-100"}`}
        >
          Billeteras
        </button>
      </div>

      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="border-2 border-black p-4 overflow-hidden">
            <div className="text-sm text-gray-600 mb-1">Mi Billetera</div>
            <div className="text-xl md:text-2xl font-black break-words">
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
                        <span>
                          -
                          {formatPrice(
                            selectedOrder.subtotal - selectedOrder.total,
                          )}
                        </span>
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

      {activeTab === "solicitudes" && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { key: "", label: "Todas" },
              { key: "PENDING", label: "Pendiente" },
              { key: "NOTIFIED", label: "Notificado" },
              { key: "COMPLETED", label: "Completado" },
              { key: "CANCELLED", label: "Cancelado" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSolicitudesFilter(key)}
                className={`px-4 py-2 border-2 border-black ${
                  solicitudesFilter === key
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                {label} (
                {key === ""
                  ? solicitudes.length
                  : solicitudes.filter((r: any) => r.status === key).length}
                )
              </button>
            ))}
          </div>

          {solicitudesLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : solicitudes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay solicitudes
            </div>
          ) : (
            <>
              {[
                ...(solicitudesFilter
                  ? solicitudes.filter(
                      (r: any) => r.status === solicitudesFilter,
                    )
                  : solicitudes),
              ].length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No hay solicitudes con ese estado
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
                    {(solicitudesFilter
                      ? solicitudes.filter(
                          (r: any) => r.status === solicitudesFilter,
                        )
                      : solicitudes
                    ).map((req: any) => (
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
                          {new Date(req.createdAt).toLocaleDateString("es-CU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="col-span-2">
                          <span
                            className={`inline-block px-2 py-1 text-xs font-bold ${
                              (
                                {
                                  PENDING: "bg-yellow-100 text-yellow-800",
                                  NOTIFIED: "bg-blue-100 text-blue-800",
                                  COMPLETED: "bg-green-100 text-green-800",
                                  CANCELLED: "bg-gray-100 text-gray-800",
                                } as Record<string, string>
                              )[req.status]
                            }`}
                          >
                            {
                              (
                                {
                                  PENDING: "Pendiente",
                                  NOTIFIED: "Notificado",
                                  COMPLETED: "Completado",
                                  CANCELLED: "Cancelado",
                                } as Record<string, string>
                              )[req.status]
                            }
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          {req.status === "PENDING" && (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() =>
                                  updateSolicitudStatus(req.id, "NOTIFIED")
                                }
                                disabled={solicitudesUpdating === req.id}
                                className="px-3 py-1 text-xs border border-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Notificar
                              </button>
                              <button
                                onClick={() =>
                                  updateSolicitudStatus(req.id, "CANCELLED")
                                }
                                disabled={solicitudesUpdating === req.id}
                                className="px-3 py-1 text-xs border border-black bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                          {req.status === "NOTIFIED" && (
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => confirmSolicitud(req.id)}
                                disabled={solicitudesUpdating === req.id}
                                className="px-3 py-1 text-xs border border-black bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Confirmar Pedido
                              </button>
                              <button
                                onClick={() =>
                                  updateSolicitudStatus(req.id, "CANCELLED")
                                }
                                disabled={solicitudesUpdating === req.id}
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
                    {(solicitudesFilter
                      ? solicitudes.filter(
                          (r: any) => r.status === solicitudesFilter,
                        )
                      : solicitudes
                    ).map((req: any) => (
                      <div
                        key={req.id}
                        className="border-2 border-black p-4 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="font-bold">{req.product.name}</div>
                          <span
                            className={`px-2 py-1 text-xs font-bold ${
                              (
                                {
                                  PENDING: "bg-yellow-100 text-yellow-800",
                                  NOTIFIED: "bg-blue-100 text-blue-800",
                                  COMPLETED: "bg-green-100 text-green-800",
                                  CANCELLED: "bg-gray-100 text-gray-800",
                                } as Record<string, string>
                              )[req.status]
                            }`}
                          >
                            {
                              (
                                {
                                  PENDING: "Pendiente",
                                  NOTIFIED: "Notificado",
                                  COMPLETED: "Completado",
                                  CANCELLED: "Cancelado",
                                } as Record<string, string>
                              )[req.status]
                            }
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Solicitante:</span>{" "}
                          {req.user.name || req.user.username || "-"} -{" "}
                          {req.user.phone || "Sin teléfono"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(req.createdAt).toLocaleDateString("es-CU", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                                onClick={() =>
                                  updateSolicitudStatus(req.id, "NOTIFIED")
                                }
                                disabled={solicitudesUpdating === req.id}
                                className="flex-1 px-3 py-2 text-sm border border-black bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Notificar
                              </button>
                              <button
                                onClick={() =>
                                  updateSolicitudStatus(req.id, "CANCELLED")
                                }
                                disabled={solicitudesUpdating === req.id}
                                className="flex-1 px-3 py-2 text-sm border border-black bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {req.status === "NOTIFIED" && (
                            <>
                              <button
                                onClick={() => confirmSolicitud(req.id)}
                                disabled={solicitudesUpdating === req.id}
                                className="flex-1 px-3 py-2 text-sm border border-black bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                Confirmar Pedido
                              </button>
                              <button
                                onClick={() =>
                                  updateSolicitudStatus(req.id, "CANCELLED")
                                }
                                disabled={solicitudesUpdating === req.id}
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
        </>
      )}

      {activeTab === "wallets" && (
        <>
          {walletsLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : wallets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay billeteras disponibles
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block border border-black mb-8">
                <div className="grid grid-cols-12 bg-black text-white font-bold p-4">
                  <div className="col-span-3">Nombre</div>
                  <div className="col-span-2">Usuario</div>
                  <div className="col-span-2">Rol</div>
                  <div className="col-span-2">Saldo</div>
                  <div className="col-span-2">Último Mov.</div>
                  <div className="col-span-1 text-right">Acción</div>
                </div>
                {wallets.map((w, i) => (
                  <div
                    key={w.id}
                    className={`grid grid-cols-12 p-4 border-b border-black items-center hover:bg-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <div className="col-span-3 font-medium">
                      {w.name || "Sin nombre"}
                    </div>
                    <div className="col-span-2 text-gray-600">
                      {w.username || "-"}
                    </div>
                    <div className="col-span-2">
                      <span className="px-2 py-1 border border-black text-xs">
                        {roleLabel(w.role)}
                      </span>
                    </div>
                    <div className="col-span-2 font-black break-words">
                      {formatPrice(w.wallet)}
                    </div>
                    <div className="col-span-2 text-sm">
                      {w.lastTransaction ? (
                        <div>
                          <span className="text-green-600 font-bold">
                            +{formatPrice(w.lastTransaction.amount)}
                          </span>
                          <span className="text-gray-500 text-xs block">
                            {txTypeLabel(w.lastTransaction.type)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => handleSelectWallet(w.id)}
                        className="px-3 py-1 border border-black hover:bg-black hover:text-white text-sm"
                      >
                        Ver
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-4">
                {wallets.map((w) => (
                  <div key={w.id} className="border-2 border-black p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg">
                          {w.name || "Sin nombre"}
                        </p>
                        <p className="text-gray-500 text-sm">
                          @{w.username || "-"}
                        </p>
                      </div>
                      <span className="px-2 py-1 border border-black text-xs shrink-0">
                        {roleLabel(w.role)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500 shrink-0 mr-2">
                        Saldo
                      </span>
                      <span className="font-black text-xl text-right break-words">
                        {formatPrice(w.wallet)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-500">Último Mov.</span>
                      {w.lastTransaction ? (
                        <div className="text-right">
                          <span className="text-green-600 font-bold text-sm">
                            +{formatPrice(w.lastTransaction.amount)}
                          </span>
                          <span className="text-gray-500 text-xs block">
                            {txTypeLabel(w.lastTransaction.type)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectWallet(w.id)}
                      className="w-full py-2 border-2 border-black hover:bg-black hover:text-white text-sm font-medium"
                    >
                      Ver Detalle
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Wallet Detail Modal */}
      {selectedWalletUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white border-2 border-black w-full max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-black sticky top-0 bg-white">
              <h2 className="text-lg md:text-xl font-black">
                {selectedWalletUser.name ||
                  selectedWalletUser.username ||
                  "Usuario"}
              </h2>
              <button
                onClick={() => {
                  setSelectedWalletUser(null);
                  setWalletTransactions([]);
                }}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div className="flex justify-between items-center border-2 border-black p-4">
                <div>
                  <p className="text-sm text-gray-500">Saldo Actual</p>
                  <p className="text-2xl md:text-3xl font-black">
                    {formatPrice(selectedWalletUser.wallet)}
                  </p>
                </div>
                <span className="px-3 py-1 border border-black text-sm">
                  {roleLabel(selectedWalletUser.role)}
                </span>
              </div>

              {selectedWalletUser.lastTransaction && (
                <div className="border border-black p-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Último Movimiento
                  </p>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-green-600 font-bold text-lg">
                        +
                        {formatPrice(selectedWalletUser.lastTransaction.amount)}
                      </span>
                      <span className="text-gray-500 text-sm ml-2">
                        {txTypeLabel(selectedWalletUser.lastTransaction.type)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(
                        selectedWalletUser.lastTransaction.createdAt,
                      ).toLocaleDateString("es-CU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {selectedWalletUser.lastTransaction.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedWalletUser.lastTransaction.description}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Historial de Transacciones
                </h3>
                {walletTxsLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    Cargando...
                  </div>
                ) : walletTransactions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 border border-black">
                    Sin transacciones
                  </div>
                ) : (
                  <>
                    {/* Desktop transaction table */}
                    <div className="hidden md:block border border-black">
                      <div className="grid grid-cols-12 bg-black text-white font-bold p-3 text-sm">
                        <div className="col-span-3">Fecha</div>
                        <div className="col-span-2">Orden</div>
                        <div className="col-span-3">Tipo</div>
                        <div className="col-span-2 text-right">Monto</div>
                        <div className="col-span-2">Detalle</div>
                      </div>
                      {walletTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="grid grid-cols-12 p-3 border-b border-black items-center text-sm hover:bg-gray-50"
                        >
                          <div className="col-span-3 text-gray-600">
                            {new Date(tx.createdAt).toLocaleDateString(
                              "es-CU",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </div>
                          <div className="col-span-2 font-mono text-xs">
                            {tx.orderNumber || "—"}
                          </div>
                          <div className="col-span-3">
                            <span className="px-2 py-0.5 border border-black text-xs">
                              {txTypeLabel(tx.type)}
                            </span>
                          </div>
                          <div className="col-span-2 text-right font-bold text-green-600">
                            +{formatPrice(tx.amount)}
                          </div>
                          <div className="col-span-2 text-xs text-gray-500 truncate">
                            {tx.description || ""}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile transaction cards */}
                    <div className="md:hidden space-y-2">
                      {walletTransactions.map((tx) => (
                        <div key={tx.id} className="border border-black p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-500">
                              {new Date(tx.createdAt).toLocaleDateString(
                                "es-CU",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                            {tx.orderNumber && (
                              <span className="text-xs font-mono">
                                {tx.orderNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 border border-black text-xs">
                              {txTypeLabel(tx.type)}
                            </span>
                            <span className="font-bold text-green-600">
                              +{formatPrice(tx.amount)}
                            </span>
                          </div>
                          {tx.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {tx.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedWalletUser(null);
                  setWalletTransactions([]);
                }}
                className="w-full py-3 bg-black text-white font-medium hover:bg-gray-800"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm text-center">
            <div className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-black text-white flex items-center justify-center">
                <span className="text-3xl font-black">✓</span>
              </div>
              <h2 className="text-2xl font-black mb-2">PEDIDO CREADO</h2>
              <p className="text-gray-600 mb-2">
                El pedido se ha creado correctamente.
              </p>
              <p className="text-lg font-bold mb-6">#{showConfirmSuccess}</p>
              <button
                onClick={() => setShowConfirmSuccess(null)}
                className="w-full py-3 bg-black text-white font-medium hover:bg-gray-800"
              >
                ACEPTAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showStockError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm text-center">
            <div className="p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-600 text-white flex items-center justify-center">
                <span className="text-3xl font-black">✕</span>
              </div>
              <h2 className="text-2xl font-black mb-2">STOCK NO DISPONIBLE</h2>
              <p className="text-gray-600 mb-6">{showStockError}</p>
              <button
                onClick={() => setShowStockError(null)}
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
