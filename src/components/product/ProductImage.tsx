import * as React from "react";
import Image from "next/image";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  if (!src || error) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
      >
        <span className="text-gray-400">Sin imagen</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      onError={() => setError(true)}
      onLoad={() => setLoading(false)}
      className={`${className} ${loading ? "opacity-0" : "opacity-100"} transition-opacity`}
    />
  );
}