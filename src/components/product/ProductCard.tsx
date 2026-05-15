"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Info } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useState, useEffect } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { convertPrice, formatConvertedPrice } from "@/lib/currency";
import { useSession } from "next-auth/react";
import { useStockRealtime } from "@/hooks/useStockRealtime";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  availableStock?: number;
  purchasePrice?: number | null;
  image?: string | null;
  salesCount?: number;
}

interface ProductCardProps {
  product: Product;
  discountPercent?: number;
  canUseBonus?: boolean;
  isEligible?: boolean;
  showSalesBadge?: boolean;
}

export function ProductCard({
  product,
  discountPercent,
  canUseBonus,
  isEligible,
  showSalesBadge,
}: ProductCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const addBonusItem = useCartStore((state) => state.addBonusItem);
  const hasBonusProduct = useCartStore((state) => state.hasBonusProduct);
  const { preferredCurrency, rates } = useCurrency();
  const [added, setAdded] = useState(false);
  const [requested, setRequested] = useState(false);
  const [showDupError, setShowDupError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasBonusInCart = hasBonusProduct();
  const bonusItemInCart = items.find((item) => item.isBonusProduct);
  const thisHasBonus = bonusItemInCart?.id === product.id;

  const canAddBonus = canUseBonus && isEligible && !hasBonusInCart;
  const otherHasBonus = hasBonusInCart && isEligible && !thisHasBonus;
  const isDisabled =
    otherHasBonus || (!isEligible && hasBonusInCart) || thisHasBonus;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added || isDisabled) return;

    if (canUseBonus && isEligible) {
      addBonusItem({
        id: product.id,
        name: product.name,
        price: product.price,
        purchasePrice: product.purchasePrice ?? undefined,
        image: product.image ?? undefined,
      });
    } else {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        purchasePrice: product.purchasePrice ?? undefined,
        image: product.image ?? undefined,
      });
    }

    if (session?.user?.id) {
      fetch("/api/cart/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }] }),
      }).catch(() => {});
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleRequestProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (requested) return;

    if (!session?.user?.id) {
      router.push(`/login?from=/productos/${product.slug}`);
      return;
    }

    try {
      const res = await fetch(`/api/products/${product.slug}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setRequested(true);
        setTimeout(() => setRequested(false), 2000);
      } else if (res.status === 409) {
        setShowDupError(true);
        setTimeout(() => setShowDupError(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "Error al solicitar el producto");
      }
    } catch {
      alert("Error al solicitar el producto");
    }
  };

  const displayPrice = convertPrice(product.price, preferredCurrency, rates);
  const discountedPrice = discountPercent
    ? displayPrice * (1 - discountPercent)
    : null;
  const discountLabel = discountPercent
    ? `${Math.round(discountPercent * 100)}%`
    : null;

  const stockMap = useStockRealtime();
  const liveStock = stockMap.get(product.id);
  const displayStock = liveStock ?? product.availableStock ?? product.stock;
  const isOutOfStock = displayStock === 0;

  let buttonLabel = "AÑADIR";
  if (isOutOfStock) {
    buttonLabel = requested ? "✓" : "SOLICITAR PRODUCTO";
  } else if (thisHasBonus) buttonLabel = "EN CARRO";
  else if (isEligible) {
    if (hasBonusInCart) buttonLabel = "SOLO 1";
    else buttonLabel = added ? "✓" : "AÑADIR";
  } else if (hasBonusInCart) {
    buttonLabel = "YA TIENES";
  }

  return (
    <div className="border border-black flex flex-col relative">
      {showDupError && (
        <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black p-4 text-center max-w-[90%]">
            <p className="text-sm font-bold text-red-600">YA SOLICITADO</p>
            <p className="text-xs mt-1">Ya solicitaste este producto. Estás en la lista de espera.</p>
          </div>
        </div>
      )}
      <Link href={`/productos/${product.slug}`} className="flex-1">
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
          {showSalesBadge && product.salesCount !== undefined && product.salesCount > 0 && (
            <span className="absolute top-2 left-2 bg-black text-white text-xs font-bold px-2 py-1 z-10">
              {product.salesCount} vendido{product.salesCount !== 1 ? "s" : ""}
            </span>
          )}
          {displayStock === 0 ? (
            <span className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-2 py-1 z-10">
              SIN STOCK
            </span>
          ) : displayStock <= 5 && (
            <span className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-2 py-1 z-10">
              QUEDAN {displayStock}
            </span>
          )}
        </div>
        <div className="p-3 border-t border-black">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm md:text-base line-clamp-2 flex-1">
              {product.name}
            </h3>
            {discountLabel && (
              <span className="bg-black text-white text-xs px-2 py-0.5 font-bold">
                -{discountLabel}
              </span>
            )}
          </div>
          {discountedPrice ? (
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg line-through text-gray-400">
                {formatConvertedPrice(displayPrice, preferredCurrency)}
              </span>
              <span className="text-base md:text-lg font-bold">
                {formatConvertedPrice(discountedPrice, preferredCurrency)}
              </span>
            </div>
          ) : (
            <p className="text-base md:text-lg">
              {formatConvertedPrice(displayPrice, preferredCurrency)}
            </p>
          )}
        </div>
      </Link>
      <div className="p-3 border-t border-black flex flex-col gap-2">
        <button
          onClick={isOutOfStock ? handleRequestProduct : handleAddToCart}
          disabled={isOutOfStock ? false : isDisabled}
          className={`w-full px-3 py-2 font-medium text-sm focus:outline-none focus:ring-0 flex items-center justify-center h-12 ${
            isDisabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : added
                ? "bg-white text-black"
                : "bg-black text-white"
          }`}
        >
          <ShoppingCart className="w-4 h-4 mr-1" />
          {buttonLabel}
        </button>
        <Link
          href={`/productos/${product.slug}`}
          className="w-full px-3 py-2 font-medium text-sm bg-white text-black border-2 border-black hover:bg-black hover:text-white flex items-center justify-center h-12 text-center"
        >
          <Info className="w-4 h-4 mr-1" />
          INFO
        </Link>
      </div>
    </div>
  );
}

export default ProductCard;
