import Link from "next/link";
import Image from "next/image";

interface CategoryCardProps {
  name: string;
  slug: string;
  image?: string | null;
  productCount: number;
}

export function CategoryCard({
  name,
  slug,
  image,
  productCount,
}: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${slug}`}
      className="relative flex items-center h-20 border border-black overflow-hidden group"
    >
      {image ? (
        <Image src={image} alt={name} fill className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}

      {/* Overlay semitransparente */}
      <div className="absolute inset-0" />

      {/* Hover overlay: oscurece toda la tarjeta */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* Texto superpuesto */}
      <div className="relative z-10 flex items-center px-4 w-full min-w-[40%]">
        <div>
          <h2 className="font-black uppercase text-xl leading-tight text-black">
            {name}
          </h2>
          <p className="text-xs mt-1 text-black">
            {productCount} {productCount === 1 ? "producto" : "productos"}
          </p>
        </div>
      </div>
    </Link>
  );
}
