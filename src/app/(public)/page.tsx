import { prisma } from "@/lib/db";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

import type { Product } from "@/types";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const searchQuery = params?.search || "";

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(searchQuery
        ? {
            OR: [
              { name: { contains: searchQuery } },
              { description: { contains: searchQuery } },
              { category: { contains: searchQuery } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const productsByCategory = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    acc[cat.name] = products.filter((p) => p.category === cat.name);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto">
      <section className="py-12 md:py-20 lg:py-24 px-4 md:px-6 border-b border-black">
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
      </section>

      <section className="py-8 md:py-12 px-4 md:px-6">
        {searchQuery ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">Resultados: &ldquo;{searchQuery}&rdquo;</h2>
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
                    <h3 className="font-bold text-xs md:text-base line-clamp-2">{product.name}</h3>
                    <p className="font-black mt-1">${product.price.toFixed(2)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {categories.map((cat) => {
              const category = cat as { id: string; name: string; slug: string; image?: string | null };
              const catProducts = productsByCategory[category.name] || [];
              return (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="flex flex-row h-20 md:h-auto md:block border-2 border-black hover:bg-black hover:text-white transition-colors"
                >
                  <div className="w-1/2 md:w-auto md:bg-transparent bg-black text-white md:text-black flex flex-col justify-center items-start px-2 py-4 md:p-0">
                    <h2 className="font-black uppercase text-center text-lg md:text-xl leading-tight">
                      {category.name}
                    </h2>
                    <p className="text-xs text-center mt-1 md:mt-0 md:text-xs">
                      {catProducts.length} productos
                    </p>
                  </div>
                  <div className="w-1/2 md:w-auto relative md:aspect-square bg-gray-100">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-200" />
                  )}
                  <div className="p-3 md:p-4">
                    <h2 className="text-sm md:text-xl md:text-2xl font-black uppercase leading-tight">
                      {category.name}
                    </h2>
                    <p className="text-xs md:text-sm mt-1">{catProducts.length} productos</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}