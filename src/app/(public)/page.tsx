"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CategoryCard } from "@/components/category/CategoryCard";
import { ProductCard } from "@/components/product/ProductCard";
import { useCurrency } from "@/hooks/useCurrency";
import { convertPrice, formatConvertedPrice } from "@/lib/currency";

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  purchasePrice?: number | null;
  image?: string | null;
  salesCount?: number;
  category: string | null;
}

async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch("/api/categories");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchProducts(searchQuery?: string): Promise<Product[]> {
  try {
    const url = searchQuery
      ? `/api/products?search=${encodeURIComponent(searchQuery)}`
      : "/api/products";
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchBestSellers(): Promise<Product[]> {
  try {
    const res = await fetch("/api/products/best-sellers");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchNewestProducts(): Promise<Product[]> {
  try {
    const res = await fetch("/api/products?sort=newest");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

type TabId = "categories" | "best-sellers" | "newest";

const TABS: { id: TabId; label: string }[] = [
  { id: "categories", label: "CATEGORÍAS" },
  { id: "best-sellers", label: "MÁS VENDIDOS" },
  { id: "newest", label: "NUEVOS" },
];

export default function HomePage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const { preferredCurrency, rates } = useCurrency();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tabProducts, setTabProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("categories");

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchProducts(searchQuery)]).then(
      ([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
        setLoading(false);
      },
    );
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === "categories") {
      setTabProducts([]);
      setTabLoading(false);
      return;
    }

    setTabLoading(true);

    let promise: Promise<Product[]>;
    switch (activeTab) {
      case "best-sellers":
        promise = fetchBestSellers();
        break;
      case "newest":
        promise = fetchNewestProducts();
        break;
      default:
        promise = Promise.resolve([]);
    }

    promise.then((prods) => {
      setTabProducts(prods);
      setTabLoading(false);
    });
  }, [activeTab]);

  const productsByCategory: Record<string, Product[]> = {};
  categories.forEach((cat) => {
    productsByCategory[cat.name] = products.filter(
      (p) => p.category === cat.name,
    );
  });

  const isLoading = loading || tabLoading;

  return (
    <div className="max-w-7xl mx-auto">
      <section className="py-12 md:py-16 lg:py-20 px-4 md:px-6 border-b border-black">
        <div className="flex items-center justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-4 md:mb-6 leading-tight">
              DISPONIBLE
              <br />
              <span className="text-blue-900">AHORA</span>
            </h1>
            <p className="text-md md:text-xl max-w-lg md:max-w-xl">
              {searchQuery
                ? `Resultados para: "${searchQuery}"`
                : "Objetos seleccionados por su diseño y utilidad. Compra online, gestiona por WhatsApp y paga en casa."}
            </p>
          </div>
          <div className="hidden md:block w-48 lg:w-64 flex-shrink-0">
            <img
              src="/logo-app.png"
              alt="EL PUNTIKO."
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </section>

      {!searchQuery && (
        //cambiar el grid-cols-... segun numero de tabs
        <div className="grid grid-cols-3 border-b border-black">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 md:px-6 py-3 font-bold text-sm border-r border-l border-black first:border-r-0 last:border-l-0 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <section className="py-8 md:py-12 px-4 md:px-6">
        {isLoading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : searchQuery ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              Resultados: &ldquo;{searchQuery}&rdquo;
            </h2>
            {products.length === 0 ? (
              <p className="text-gray-500">No se encontraron productos</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/productos/${product.slug}`}
                    className="block border-2 border-black p-4 hover:bg-black hover:text-white transition-colors"
                  >
                    {product.image && (
                      <div className="aspect-square relative mb-3 bg-gray-100">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <h3 className="font-bold text-xs md:text-base line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="font-black mt-1">
                      {formatConvertedPrice(
                        convertPrice(product.price, preferredCurrency, rates),
                        preferredCurrency,
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "categories" ? (
          <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat) => {
              const catProducts = productsByCategory[cat.name] || [];
              return (
                <CategoryCard
                  key={cat.id}
                  name={cat.name}
                  slug={cat.slug}
                  image={cat.image}
                  productCount={catProducts.length}
                />
              );
            })}
          </div>
        ) : (
          <div>
            {tabProducts.length === 0 ? (
              <p className="text-gray-500">
                {activeTab === "best-sellers"
                  ? "Sin ventas aún"
                  : "No hay productos disponibles"}
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {tabProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    showSalesBadge={activeTab === "best-sellers"}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
