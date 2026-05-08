"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/stores/useCartStore";

interface Product {
  id: string;
  name: string;
  price: number;
  purchasePrice: number | null;
  description: string | null;
  category: string | null;
  image: string | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        } else {
          setProduct(null);
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    if (params.slug) {
      fetchProduct();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-black mb-6">Producto no encontrado</h1>
        <button onClick={() => router.push("/")} className="px-6 py-3 bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black">
          Volver a EL PUNTIKO.
        </button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (added) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      purchasePrice: product.purchasePrice ?? undefined,
      image: product.image ?? undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="border-b border-black px-4 md:px-6 py-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 hover:bg-black hover:text-white px-2 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-gray-100 border-b lg:border-b-0 lg:border-r border-black min-h-[300px] flex items-center justify-center p-4">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={400}
              className="max-w-full max-h-[400px] object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-400 text-xl">Sin imagen</span>
            </div>
          )}
        </div>

        <div className="p-6 lg:p-12 lg:pl-16">
          <p className="text-sm mb-4">{product.category}</p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black uppercase mb-4 md:mb-6 break-words leading-tight">
            {product.name}
          </h1>
          <p className="text-2xl md:text-3xl mb-6 md:mb-8">${product.price.toFixed(2)}</p>
          <p className="text-base md:text-lg mb-8 md:mb-12 max-w-md">{product.description}</p>
          
          <button
            onClick={handleAddToCart}
            className={`w-full lg:w-auto px-8 py-4 text-lg font-medium flex items-center justify-center ${
              added 
                ? "bg-white text-black border-2 border-black" 
                : "bg-black text-white hover:bg-white hover:text-black hover:border-2 hover:border-black"
            }`}
          >
            <ShoppingCart className="w-5 h-5 mr-3" />
            {added ? "✓ AÑADIDO" : "AÑADIR AL CARRITO"}
          </button>
        </div>
      </div>
    </div>
  );
}