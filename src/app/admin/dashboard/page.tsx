"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Eye,
} from "lucide-react";
import { StatsCard } from "@/components/admin/StatsCard";
import { TopProductsChart } from "@/components/admin/TopProductsChart";
import { SalesTrendChart } from "@/components/admin/SalesTrendChart";
import { LowStockProducts } from "@/components/admin/LowStockProducts";
import { TopAffiliatesList } from "@/components/admin/TopAffiliatesList";
import { TopProductsByViewsChart } from "@/components/admin/TopProductsByViewsChart";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getOrders,
  getDashboardStats,
  getTopProducts,
  getSalesTrend,
  getLowStockProducts,
  getTopAffiliates,
  getTopViewedProducts,
} from "../actions";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
}

interface TopProduct {
  productId: string;
  name: string;
  image?: string | null;
  totalSold: number;
}

interface SalesData {
  date: string;
  total: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  stock: number;
  price: number;
}

interface TopAffiliate {
  id: string;
  code: string;
  name: string;
  totalEarnings: number;
  totalOrders: number;
  commissionRate: number;
}

interface TopProductByView {
  productId: string;
  name: string;
  image?: string | null;
  views: number;
}

type DateFilter = "7" | "30" | "90";

export default function AdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesData[]>([]);
  const [salesSummary, setSalesSummary] = useState({
    totalRevenue: 0,
    avgDaily: 0,
    totalOrders: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>(
    [],
  );
  const [topAffiliates, setTopAffiliates] = useState<TopAffiliate[]>([]);
  const [topViewedProducts, setTopViewedProducts] = useState<
    TopProductByView[]
  >([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    cancelledOrders: 0,
    affiliates: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("30");

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted || !hydrated) return;
    if (!isAuthenticated || !user) {
      router.push("/login?from=/admin/dashboard");
    } else if (user?.role !== "ADMIN" && user?.role !== "AFFILIATE") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, mounted, hydrated]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        ordersData,
        statsData,
        productsData,
        trendData,
        lowStockData,
        affiliatesData,
        viewedData,
      ] = await Promise.all([
        getOrders(),
        getDashboardStats(),
        getTopProducts(),
        getSalesTrend(parseInt(dateFilter)),
        getLowStockProducts(),
        getTopAffiliates(),
        getTopViewedProducts(),
      ]);

      if (ordersData.orders) setOrders(ordersData.orders);
      if (statsData.stats) setStats(statsData.stats);
      if (productsData.topProducts) setTopProducts(productsData.topProducts);

      if (trendData.trend) {
        setSalesTrend(trendData.trend.data);
        setSalesSummary(trendData.trend.summary);
      }

      if (lowStockData.lowStock) setLowStockProducts(lowStockData.lowStock);
      if (affiliatesData.topAffiliates)
        setTopAffiliates(affiliatesData.topAffiliates);
      if (viewedData.topViewedProducts)
        setTopViewedProducts(viewedData.topViewedProducts);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    if (!mounted || !hydrated || !user) return;
    fetchDashboardData();
  }, [mounted, hydrated, user, fetchDashboardData]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (
    !mounted ||
    !hydrated ||
    !user ||
    (user?.role !== "ADMIN" && user?.role !== "AFFILIATE")
  ) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="border-b border-black pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black">DASHBOARD</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-black">
              <Calendar className="w-4 h-4 ml-2" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="bg-transparent border-none py-2 pr-2 text-sm focus:outline-none"
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-2 border border-black text-sm hover:bg-black hover:text-white"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatsCard
          title={
            <span className="block sm:inline">
              Pedidos
              <br className="sm:hidden" /> Totales
            </span>
          }
          value={stats.totalOrders}
          subtitle="Cantidad total"
          icon={<ShoppingCart className="w-5 h-5" />}
          isCurrency={false}
        />
        <StatsCard
          title={
            <span className="block sm:inline">
              Ventas
              <br className="sm:hidden" /> Totales
            </span>
          }
          value={stats.totalSales}
          subtitle="Ingresos generados"
          icon={<DollarSign className="w-5 h-5" />}
          isCurrency={true}
        />
        <StatsCard
          title={
            <span className="block sm:inline">
              Pedidos
              <br className="sm:hidden" /> Pendientes
            </span>
          }
          value={stats.pendingOrders}
          subtitle="Por confirmar"
          icon={<Package className="w-5 h-5" />}
          isCurrency={false}
        />
        <StatsCard
          title={
            <span className="block sm:inline">
              Afiliados
              <br className="sm:hidden" /> Activos
            </span>
          }
          value={stats.affiliates}
          subtitle="Total registrados"
          icon={<Users className="w-5 h-5" />}
          isCurrency={false}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tendencia de Ventas
            </h2>
            <span className="text-xs text-gray-500">
              Últimos {dateFilter} días
            </span>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : (
              <SalesTrendChart data={salesTrend} summary={salesSummary} />
            )}
          </div>
        </div>

        <div className="bg-white border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Bajo Stock
            </h2>
            <Link
              href="/admin/productos"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver inventario
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : (
              <LowStockProducts products={lowStockProducts} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 5 Productos Vendidos
            </h2>
            <Link
              href="/admin/productos"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : (
              <TopProductsChart products={topProducts} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Top 5 Productos Más Vistos
              </h2>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : (
                <TopProductsByViewsChart products={topViewedProducts} />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Afiliados
            </h2>
            <Link
              href="/admin/afiliados"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Cargando...</div>
            ) : (
              <TopAffiliatesList affiliates={topAffiliates} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Pedidos Recientes</h2>
          <Link
            href="/admin/pedidos"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay pedidos</div>
          ) : (
            orders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{order.orderNumber}</span>
                  <span
                    className={`text-xs px-2 py-1 border ${
                      order.status === "CONFIRMED"
                        ? "border-green-500 text-green-600"
                        : order.status === "PENDING"
                          ? "border-yellow-500 text-yellow-600"
                          : "border-red-500 text-red-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{order.customerName}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {order.customerPhone}
                  </span>
                  <span className="font-bold">
                    ${Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
