"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getSuppliers,
} from "../actions";

type ModalMode =
  | "create-product"
  | "edit-product"
  | "create-category"
  | "edit-category"
  | "add-stock"
  | null;
type TabView = "products" | "categories";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  purchasePrice: number | null;
  comparePrice: number | null;
  image: string | null;
  stock: number;
  category: string | null;
  supplierId: string | null;
  supplierName: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string | null;
  username: string | null;
}

export default function ProductosPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<TabView>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockSort, setStockSort] = useState<"asc" | "desc" | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingStockId, setAddingStockId] = useState<string | null>(null);
  const [stockToAdd, setStockToAdd] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    purchasePrice: 0,
    comparePrice: 0,
    stock: 0,
    category: "",
    image: "",
    isActive: true,
    supplierId: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    image: "",
    isActive: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/admin/productos");
    } else {
      adminFetchData();
    }
  }, [isAuthenticated, router, mounted]);

  const adminFetchData = async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData, suppliersData] = await Promise.all([
        getAdminProducts(),
        getAdminCategories(),
        getSuppliers(),
      ]);
      if (productsData.products) setProducts(productsData.products);

      if (categoriesData.categories) setCategories(categoriesData.categories);

      if (suppliersData.suppliers) setSuppliers(suppliersData.suppliers);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products
    .filter((p) => {
      if (!searchQuery) return true;
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (!stockSort) return 0;
      return stockSort === "asc" ? a.stock - b.stock : b.stock - a.stock;
    });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateProduct = async () => {
    const slug = productForm.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const result = await createProduct({ 
      ...productForm, 
      slug,
      supplierId: productForm.supplierId || undefined,
    });
    if (result.error) throw new Error(result.error);
    return true;
  };

  const handleUpdateProduct = async (id: string) => {
    const slug = productForm.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const result = await updateProduct(id, { 
      ...productForm, 
      slug,
      supplierId: productForm.supplierId || null,
    });
    if (result.error) throw new Error(result.error);
    return true;
  };

  const handleDeleteProduct = async (id: string) => {
    const result = await deleteProduct(id);
    if (result.error) throw new Error(result.error);
    return true;
  };

  const addStock = async () => {
    if (!addingStockId || !stockToAdd) return;
    const quantity = parseInt(stockToAdd);
    if (quantity <= 0) return;

    setSaving(true);
    try {
      const result = await updateProduct(addingStockId, {
        stock: { increment: quantity } as unknown as undefined,
      });
      if (result.error) throw new Error(result.error);
      showToast("Stock agregado correctamente", "success");
      closeModal();
      await adminFetchData();
    } catch {
      showToast("Error al agregar stock", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    const slug = categoryForm.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const result = await createCategory({ ...categoryForm, slug });
    if (result.error) throw new Error(result.error);
    return true;
  };

  const handleUpdateCategory = async (id: string) => {
    const slug = categoryForm.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const result = await updateCategory(id, { ...categoryForm, slug });
    if (result.error) throw new Error(result.error);
    return true;
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.error) throw new Error(result.error);
    return true;
  };

  const openProductModal = (mode: "create" | "edit", product?: Product) => {
    if (mode === "create") {
      setProductForm({
        name: "",
        description: "",
        price: 0,
        purchasePrice: 0,
        comparePrice: 0,
        stock: 0,
        category: "",
        image: "",
        isActive: true,
        supplierId: "",
      });
    } else if (product) {
      setProductForm({
        name: product.name,
        description: product.description || "",
        price: product.price,
        purchasePrice: product.purchasePrice || 0,
        comparePrice: product.comparePrice || 0,
        stock: product.stock,
        category: product.category || "",
        image: product.image || "",
        isActive: product.isActive,
        supplierId: product.supplierId || "",
      });
      setEditingId(product.id);
    }
    setModalMode(mode === "create" ? "create-product" : "edit-product");
  };

  const openCategoryModal = (mode: "create" | "edit", category?: Category) => {
    if (mode === "create") {
      setCategoryForm({ name: "", image: "", isActive: true });
    } else if (category) {
      setCategoryForm({
        name: category.name,
        image: category.image || "",
        isActive: category.isActive,
      });
      setEditingId(category.id);
    }
    setModalMode(mode === "create" ? "create-category" : "edit-category");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setAddingStockId(null);
    setStockToAdd("");
    setProductForm({
      name: "",
      description: "",
      price: 0,
      purchasePrice: 0,
      comparePrice: 0,
      stock: 0,
      category: "",
      image: "",
      isActive: true,
      supplierId: "",
    });
    setCategoryForm({ name: "", image: "", isActive: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "create-product") await handleCreateProduct();
      else if (modalMode === "edit-product" && editingId)
        await handleUpdateProduct(editingId);
      else if (modalMode === "create-category") await handleCreateCategory();
      else if (modalMode === "edit-category" && editingId)
        await handleUpdateCategory(editingId);
      showToast("Guardado correctamente", "success");
      closeModal();
      await adminFetchData();
    } catch {
      showToast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      if (view === "products") await handleDeleteProduct(deletingId);
      else await handleDeleteCategory(deletingId);
      showToast("Eliminado correctamente", "success");
      setDeletingId(null);
      await adminFetchData();
    } catch {
      showToast("Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || !isAuthenticated) return null;

  const getModalTitle = () => {
    if (modalMode === "create-product") return "NUEVO PRODUCTO";
    if (modalMode === "edit-product") return "EDITAR PRODUCTO";
    if (modalMode === "create-category") return "NUEVA CATEGORÍA";
    if (modalMode === "edit-category") return "EDITAR CATEGORÍA";
    if (modalMode === "add-stock") return "AGREGAR STOCK";
    return "";
  };

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 md:px-6 md:py-12">
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 font-medium border-2 border-black ${
            toast.type === "success"
              ? "bg-black text-white"
              : "bg-white text-black"
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="border-b border-black pb-4 mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <h1 className="text-4xl font-black">GESTIÓN DE PRODUCTOS</h1>
      </div>

      <div className="flex flex-wrap justify-around items-center gap-2 mb-8">
        <button
          onClick={() => setView("products")}
          className={`px-6 py-3 font-black uppercase transition-colors ${
            view === "products"
              ? "bg-black text-white"
              : "bg-white text-black border-2 border-black"
          }`}
        >
          PRODUCTOS
        </button>
        <button
          onClick={() => setView("categories")}
          className={`px-6 py-3 font-black uppercase transition-colors ${
            view === "categories"
              ? "bg-black text-white"
              : "bg-white text-black border-2 border-black"
          }`}
        >
          CATEGORÍAS
        </button>
        <button
          onClick={() =>
            view === "products"
              ? openProductModal("create")
              : openCategoryModal("create")
          }
          className="w-full md:w-auto md:ml-auto px-6 py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {view === "products" ? "CREAR PRODUCTO" : "CREAR CATEGORÍA"}
        </button>
      </div>

      {view === "products" && (
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border-2 border-black pl-10"
            />
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStockSort(stockSort === "asc" ? "desc" : "asc")}
              className={`px-4 py-2 border-2 border-black flex items-center gap-2 ${
                stockSort ? "bg-black text-white" : "hover:bg-gray-100"
              }`}
            >
              Stock{" "}
              {stockSort === "asc" ? "↑" : stockSort === "desc" ? "↓" : ""}
            </button>
            {stockSort && (
              <button
                onClick={() => setStockSort(null)}
                className="px-4 py-2 border-2 border-black hover:bg-gray-100"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center">Cargando...</div>
      ) : view === "products" ? (
        <>
          <div className="hidden md:block border border-black">
            <div className="grid grid-cols-12 bg-black text-white font-bold p-4">
              <div className="col-span-3">Producto</div>
              <div className="col-span-2">Categoría</div>
              <div className="col-span-2">Precio</div>
              <div className="col-span-2">Stock</div>
              <div className="col-span-1">Estado</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">No hay productos</div>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid grid-cols-12 p-4 border-b border-black items-center hover:bg-gray-50"
                >
                  <div className="col-span-3 flex items-center gap-3">
                    {product.image && (
                      <div className="w-12 h-12 relative flex-shrink-0">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <span className="font-medium truncate">{product.name}</span>
                  </div>
                  <div className="col-span-2 text-sm">
                    {product.category || "-"}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.comparePrice && product.comparePrice > 0 && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ${product.comparePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">{product.stock}</div>
                  <div className="col-span-1">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium ${product.isActive ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                    >
                      {product.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setAddingStockId(product.id);
                        setModalMode("add-stock");
                      }}
                      className="p-2 hover:bg-black hover:text-white border border-black"
                      title="Agregar stock"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openProductModal("edit", product)}
                      className="p-2 hover:bg-black hover:text-white border border-black"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(product.id)}
                      className="p-2 hover:bg-black hover:text-white border border-black"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">No hay productos</div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="border-2 border-black p-4">
                  <div className="flex gap-4">
                    {product.image && (
                      <div className="w-20 h-20 relative flex-shrink-0">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold">{product.name}</h3>
                      <p className="text-sm text-gray-500">
                        {product.category || "Sin categoría"}
                      </p>
                      <p className="font-black mt-1">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setAddingStockId(product.id);
                          setModalMode("add-stock");
                        }}
                        className="p-2 hover:bg-black hover:text-white border border-black"
                        title="Agregar stock"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openProductModal("edit", product)}
                        className="p-2 hover:bg-black hover:text-white border border-black"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(product.id)}
                        className="p-2 hover:bg-black hover:text-white border border-black"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-black">
                    <span className="text-sm">Stock: {product.stock}</span>
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium ${product.isActive ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                    >
                      {product.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="hidden md:block border border-black">
            <div className="grid grid-cols-12 bg-black text-white font-bold p-4">
              <div className="col-span-6">Categoría</div>
              <div className="col-span-3">Productos</div>
              <div className="col-span-1">Estado</div>
              <div className="col-span-2 text-right">Acciones</div>
            </div>
            {categories.length === 0 ? (
              <div className="p-8 text-center">No hay categorías</div>
            ) : (
              categories.map((category) => {
                const count = products.filter(
                  (p) => p.category === category.name,
                ).length;
                return (
                  <div
                    key={category.id}
                    className="grid grid-cols-12 p-4 border-b border-black items-center hover:bg-gray-50"
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <span className="font-black uppercase text-sm md:text-base">
                        {category.name}
                      </span>
                    </div>
                    <div className="col-span-3">{count} productos</div>
                    <div className="col-span-1">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium ${category.isActive ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                      >
                        {category.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => openCategoryModal("edit", category)}
                        className="p-2 hover:bg-black hover:text-white border border-black"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(category.id)}
                        className="p-2 hover:bg-black hover:text-white border border-black"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="md:hidden grid grid-cols-1 gap-4">
            {categories.length === 0 ? (
              <div className="p-8 text-center">No hay categorías</div>
            ) : (
              categories.map((category) => {
                const count = products.filter(
                  (p) => p.category === category.name,
                ).length;
                return (
                  <div key={category.id} className="border-2 border-black p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-base md:text-lg uppercase">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {count} productos
                        </p>
                      </div>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium ${category.isActive ? "bg-black text-white" : "bg-gray-200 text-black"}`}
                      >
                        {category.isActive ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-4 pt-3 border-t border-black">
                      <button
                        onClick={() => openCategoryModal("edit", category)}
                        className="flex-1 p-2 hover:bg-black hover:text-white border border-black flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => setDeletingId(category.id)}
                        className="flex-1 p-2 hover:bg-black hover:text-white border border-black flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Eliminar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {modalMode && modalMode !== "add-stock" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white border-2 border-black w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-black">
              <h2 className="text-lg md:text-xl font-black">
                {getModalTitle()}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              {modalMode === "create-product" ||
              modalMode === "edit-product" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none resize-none text-base md:text-lg"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Costo ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.purchasePrice}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            purchasePrice: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Venta ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={productForm.price}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          stock: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Categoría
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Proveedor
                    </label>
                    <select
                      value={productForm.supplierId}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          supplierId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                    >
                      <option value="">Sin proveedor</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name || sup.username || "Proveedor"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Imagen (URL)
                    </label>
                    <div className="flex flex-col gap-3 md:gap-4">
                      <input
                        type="url"
                        value={productForm.image}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            image: e.target.value,
                          })
                        }
                        placeholder="https://..."
                        className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                      />
                      {productForm.image && (
                        <div className="w-full max-w-[150px] md:max-w-[200px] h-[150px] md:h-[200px] relative border border-black bg-gray-50 mx-auto">
                          <Image
                            src={productForm.image}
                            alt="Preview"
                            fill
                            className="object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setProductForm({ ...productForm, image: "" })
                            }
                            className="absolute -top-2 -right-2 bg-black text-white w-6 h-6 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActiveProduct"
                      checked={productForm.isActive}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          isActive: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="isActiveProduct"
                      className="text-sm font-medium"
                    >
                      Producto activo
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Imagen (URL)
                    </label>
                    <input
                      type="url"
                      value={categoryForm.image}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          image: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActiveCategory"
                      checked={categoryForm.isActive}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          isActive: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="isActiveCategory"
                      className="text-sm font-medium"
                    >
                      Categoría activa
                    </label>
                  </div>
                </>
              )}
              <div className="flex gap-2 md:gap-4 pt-3 md:pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-2 md:py-3 border-2 border-black font-medium hover:bg-black hover:text-white transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 md:py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  {saving ? "GUARDANDO..." : "CONFIRMAR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMode === "add-stock" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm md:max-w-md">
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-black">
              <h2 className="text-lg md:text-xl font-black">AGREGAR STOCK</h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <p className="mb-4 text-sm md:text-base">
                Ingresa la cantidad de stock que quieres agregar:
              </p>
              <input
                type="number"
                min="1"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                placeholder="Cantidad"
                className="w-full px-3 py-2 md:px-4 md:py-3 border border-black focus:outline-none text-base md:text-lg mb-4"
                autoFocus
              />
              <div className="flex gap-2 md:gap-4">
                <button
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 py-2 md:py-3 border-2 border-black font-medium hover:bg-black hover:text-white transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  onClick={addStock}
                  disabled={saving}
                  className="flex-1 py-2 md:py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  {saving ? "AGREGANDO..." : "AGREGAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white border-2 border-black w-full max-w-sm md:max-w-md">
            <div className="flex justify-between items-center p-3 md:p-4 border-b border-black">
              <h2 className="text-lg md:text-xl font-black">ELIMINAR</h2>
              <button
                onClick={() => setDeletingId(null)}
                className="p-1 hover:bg-black hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <p className="mb-4 md:mb-6 text-sm md:text-base">
                ¿Estás seguro de eliminar esto? Esta acción no se puede
                deshacer.
              </p>
              <div className="flex gap-2 md:gap-4">
                <button
                  onClick={() => setDeletingId(null)}
                  disabled={saving}
                  className="flex-1 py-2 md:py-3 border-2 border-black font-medium hover:bg-black hover:text-white transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 py-2 md:py-3 bg-black text-white font-medium hover:bg-white hover:text-black hover:border-2 hover:border-black transition-colors text-sm md:text-base disabled:opacity-50"
                >
                  {saving ? "ELIMINANDO..." : "ELIMINAR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
