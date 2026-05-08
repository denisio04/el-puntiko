"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSession } from "next-auth/react";
import { X, Gift, Package, Folder } from "lucide-react";
import { getBonusConfig, updateBonusConfig as updateBonusConfigAction, getProductsAdmin, getCategoriesAdmin } from "../actions";

interface BonusConfig {
  requiredOrders: number;
  discountPercent: number;
  targetType: string;
  targetIds: string[];
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function AdminBonosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<BonusConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const [requiredOrders, setRequiredOrders] = useState("5");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [targetType, setTargetType] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);

  const isAuthed =
    isAuthenticated || (status === "authenticated" && session?.user?.role === "ADMIN");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthed) {
      router.push("/login?from=/admin/bonos");
    }
  }, [isAuthed, router, mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadData();
  }, [mounted]);

  async function loadData() {
    const [cfg, prods, cats] = await Promise.all([
      getBonusConfig(),
      getProductsAdmin(),
      getCategoriesAdmin(),
    ]);

    if (cfg && typeof cfg === 'object' && "requiredOrders" in cfg && typeof cfg.requiredOrders === 'number') {
      const validCfg = cfg as BonusConfig;
      setConfig(validCfg);
      setRequiredOrders(validCfg.requiredOrders.toString());
      setDiscountPercent((validCfg.discountPercent * 100).toString());
      setTargetType(validCfg.targetType);
      setSelectedIds(validCfg.targetIds);
      setIsActive(validCfg.isActive);
    }
    setProducts((prods as Product[]).filter((p: Product) => p.isActive));
    setCategories((cats as Category[]).filter((c: Category) => c.isActive));
  }

  const handleToggleProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setError("");
    const ordersNum = parseInt(requiredOrders);
    const percentNum = parseFloat(discountPercent);

    if (isNaN(ordersNum) || ordersNum < 1) {
      setError("Pedidos necesarios debe ser al menos 1");
      return;
    }

    if (isNaN(percentNum) || percentNum < 0 || percentNum > 100) {
      setError("Descuento debe ser 0-100");
      return;
    }

    if (targetType !== "ALL" && selectedIds.length === 0) {
      setError("Selecciona al menos un elemento");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateBonusConfigAction({
        requiredOrders: ordersNum,
        discountPercent: percentNum / 100,
        targetType,
        targetIds: selectedIds,
        isActive,
      });
      if (updated && "requiredOrders" in updated) {
        setConfig(updated as BonusConfig);
        setShowSuccess(true);
      } else {
        setError("Error al guardar");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
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
          <Gift className="w-6 h-6" />
          <h1 className="text-2xl font-black">GESTIÓN DE BONOS</h1>
        </div>

        <div className="space-y-6">
          <div className="border-2 border-black p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">ESTADO</h2>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`px-4 py-2 border-2 border-black font-medium ${
                  isActive
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-black hover:text-white"
                }`}
              >
                {isActive ? "ACTIVO" : "INACTIVO"}
              </button>
            </div>
            <p className="text-sm text-gray-500">
              {isActive
                ? "Los clientes ven bonificaciones activas"
                : "Los clientes no ven bonificaciones"}
            </p>
          </div>

          <div className="border-2 border-black p-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold">REQUISITOS</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Pedidos necesarios
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={requiredOrders}
                  onChange={(e) => setRequiredOrders(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-black font-medium"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Pedidos confirmados necesarios para desbloquear descuento
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descuento (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border-2 border-black font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-2 border-black p-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold">PRODUCTOS ELEGIBLES</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTargetType("ALL");
                    setSelectedIds([]);
                  }}
                  className={`px-4 py-2 border-2 border-black font-medium ${
                    targetType === "ALL"
                      ? "bg-black text-white"
                      : "bg-white hover:bg-black hover:text-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setTargetType("PRODUCTS")}
                  className={`px-4 py-2 border-2 border-black font-medium ${
                    targetType === "PRODUCTS"
                      ? "bg-black text-white"
                      : "bg-white hover:bg-black hover:text-white"
                  }`}
                >
                  Productos específicos
                </button>
                <button
                  onClick={() => setTargetType("CATEGORIES")}
                  className={`px-4 py-2 border-2 border-black font-medium ${
                    targetType === "CATEGORIES"
                      ? "bg-black text-white"
                      : "bg-white hover:bg-black hover:text-white"
                  }`}
                >
                  Categorías específicas
                </button>
              </div>

              {targetType === "PRODUCTS" && (
                <div className="max-h-60 overflow-y-auto border-2 border-black p-2">
                  {products.length === 0 ? (
                    <p className="text-gray-500 p-2">No hay productos</p>
                  ) : (
                    <div className="space-y-1">
                      {products.map((product) => (
                        <label
                          key={product.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product.id)}
                            onChange={() => handleToggleProduct(product.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{product.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {targetType === "CATEGORIES" && (
                <div className="max-h-60 overflow-y-auto border-2 border-black p-2">
                  {categories.length === 0 ? (
                    <p className="text-gray-500 p-2">No hay categorías</p>
                  ) : (
                    <div className="space-y-1">
                      {categories.map((category) => (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(category.slug)}
                            onChange={() => handleToggleProduct(category.slug)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{category.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
}