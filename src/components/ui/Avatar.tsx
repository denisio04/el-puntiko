import * as React from "react";
import Image from "next/image";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

export function Avatar({ src, name = "", size = "md", className = "" }: AvatarProps) {
  const [error, setError] = React.useState(false);

  if (src && !error) {
    return (
      <Image
        src={src}
        alt={name}
        fill
        onError={() => setError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}