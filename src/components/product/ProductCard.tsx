"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Info } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";
import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  purchasePrice?: number | null;
  image?: string | null;
}

interface ProductCardProps {
  product: Product;
  discountPercent?: number;
  canUseBonus?: boolean;
  isEligible?: boolean;
}

export function ProductCard({
  product,
  discountPercent,
  canUseBonus,
  isEligible,
}: ProductCardProps) {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const addBonusItem = useCartStore((state) => state.addBonusItem);
  const hasBonusProduct = useCartStore((state) => state.hasBonusProduct);
  const [added, setAdded] = useState(false);
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

  const handleAddToCart = (e: React.MouseEvent) => {
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
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const discountedPrice = discountPercent
    ? product.price * (1 - discountPercent)
    : null;
  const discountLabel = discountPercent
    ? `${Math.round(discountPercent * 100)}%`
    : null;

  let buttonLabel = "AÑADIR";
  if (thisHasBonus) buttonLabel = "EN CARRO";
  else if (isEligible) {
    if (hasBonusInCart) buttonLabel = "SOLO 1";
    else buttonLabel = added ? "✓" : "AÑADIR";
  } else if (hasBonusInCart) {
    buttonLabel = "YA TIENES";
  }

  return (
    <div className="border border-black flex flex-col">
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
                ${product.price.toFixed(2)}
              </span>
              <span className="text-base md:text-lg font-bold">
                ${discountedPrice.toFixed(2)}
              </span>
            </div>
          ) : (
            <p className="text-base md:text-lg">${product.price.toFixed(2)}</p>
          )}
        </div>
      </Link>
      <div className="p-3 border-t border-black flex flex-col gap-2">
        <button
          onClick={handleAddToCart}
          disabled={isDisabled}
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
