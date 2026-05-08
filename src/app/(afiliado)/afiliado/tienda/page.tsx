"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { adminFetch } from "@/lib/adminFetch";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface AffiliateProductCardProps {
  product: Product;
  affiliateCode: string;
}

function AffiliateProductCard({
  product,
  affiliateCode,
}: AffiliateProductCardProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const productUrl = mounted
    ? `${window.location.origin}/productos/${product.slug}?ref=${affiliateCode}`
    : "";

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!affiliateCode) {
      alert("Código de afiliado no disponible");
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(productUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = productUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  return (
    <div className="border border-black flex flex-col">
      <Link
        href={`/productos/${product.slug}`}
        className="flex-1"
        target="_blank"
      >
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Sin imagen</span>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-black">
          <h3 className="font-bold text-sm mb-1 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-lg">{formatPrice(product.price)}</p>
        </div>
      </Link>
      <div className="p-2 border-t border-black flex flex-col gap-2">
        <button
          onClick={handleCopyLink}
          disabled={!affiliateCode}
          className={`w-full px-3 py-2 font-medium text-xs sm:text-sm focus:outline-none focus:ring-0 flex items-center justify-center h-10 sm:h-12 disabled:opacity-50 disabled:cursor-not-allowed ${
            copied
              ? "bg-green-600 text-white"
              : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              COPIADO
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              COPIAR ENLACE
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AffiliateTiendaPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliateCode, setAffiliateCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push("/login?from=/afiliado");
    }
  }, [isAuthenticated, router, mounted]);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id || !mounted) return;

      try {
        const res = await adminFetch(`/api/afiliados?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setAffiliateCode(data.code || "");
        }
      } catch (error) {
        console.error("Error fetching affiliate:", error);
      }

      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && mounted) {
      fetchData();
    }
  }, [user?.id, isAuthenticated, mounted]);

  if (!mounted || !isAuthenticated || loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="min-h-screen">
      <div className="p-4 md:p-6">
        <div className="hidden md:flex items-center justify-between border-b border-black pb-4 mb-6">
          <Link href="/afiliado" className="text-sm hover:underline mr-4">
            ← Volver al Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-black">EL PUNTIKO.</h1>
          <div className="w-32" />
        </div>

        <p className="text-gray-600 mb-6 text-sm md:text-base">
          Copia el enlace de cada producto para compartirlo y ganar comisiones
        </p>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <AffiliateProductCard
                key={product.id}
                product={product}
                affiliateCode={affiliateCode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
