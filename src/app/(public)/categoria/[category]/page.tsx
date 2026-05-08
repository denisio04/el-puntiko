import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/product/ProductGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { category: categorySlug } = await params;

  const categoryData = await prisma.category.findUnique({
    where: { slug: categorySlug },
  });

  if (!categoryData) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Link href="/" className="inline-flex mb-6 hover:underline">
          ← Volver
        </Link>
        <h1 className="text-3xl font-black">Categoría no encontrada</h1>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: categoryData.name,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <Link href="/" className="inline-flex mb-6 hover:underline">
        ← Volver
      </Link>
      <h1 className="text-3xl font-black mb-8">{categoryData.name}</h1>
      <ProductGrid products={products} />
    </div>
  );
}