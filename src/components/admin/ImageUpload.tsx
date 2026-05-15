"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  currentImage?: string | null;
  onImageUrl: (url: string) => void;
}

export function ImageUpload({ currentImage, onImageUrl }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [optimizedInfo, setOptimizedInfo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setOptimizedInfo(null);

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no debe superar los 10MB");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al subir");
      }

      URL.revokeObjectURL(localPreview);
      setPreview(data.url);
      onImageUrl(data.url);

      if (data.optimized) {
        const saved = data.optimized.savingPercent;
        if (saved > 0) {
          setOptimizedInfo(`Optimizada: ${data.optimized.width}×${data.optimized.height}px · WebP · ${saved}% más ligera`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setOptimizedInfo(null);
    setError("");
    onImageUrl("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">Imagen</label>

      {preview ? (
        <div className="relative w-full max-w-[200px] h-[200px] border border-black bg-gray-50 mx-auto">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-contain"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={uploading}
            className="absolute -top-2 -right-2 bg-black text-white w-6 h-6 flex items-center justify-center disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-black cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6 gap-2">
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <p className="text-sm text-gray-500">
                {uploading ? "Optimizando y subiendo..." : "Haz clic para seleccionar imagen"}
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleFile}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      )}

      {error && <p className="text-red-600 text-xs">{error}</p>}
      {optimizedInfo && <p className="text-green-700 text-xs">{optimizedInfo}</p>}
    </div>
  );
}
