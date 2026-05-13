import Link from "next/link";
import Image from "next/image";

interface CategoryCardProps {
  name: string;
  slug: string;
  image?: string | null;
  productCount: number;
}

export function CategoryCard({ name, slug, image, productCount }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${slug}`}
      className="relative flex items-center md:items-end md:pb-4 md:justify-center h-20 md:h-auto md:aspect-square border border-black overflow-hidden group"
    >
      {image ? (
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}

      {/* Overlay oscuro para legibilidad del texto */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#454745]/90 via-[#454745]/50 to-transparent md:bg-gradient-to-t md:from-black/70 md:via-black/40 md:to-transparent" />

      {/* Hover overlay: oscurece toda la tarjeta */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/70 transition-colors" />

      {/* Texto superpuesto */}
      <div className="relative z-10 flex items-center px-4 md:items-end md:pb-2 md:justify-center md:text-center w-full md:w-auto min-w-[40%]">
        <div className="md:w-full">
          <h2 className="font-black uppercase text-lg leading-tight md:text-xl text-white">
            {name}
          </h2>
          <p className="text-xs mt-1 text-white/80">
            {productCount} {productCount === 1 ? "producto" : "productos"}
          </p>
        </div>
      </div>
    </Link>
  );
}
