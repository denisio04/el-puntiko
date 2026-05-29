import { NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { optimizeImage } from "@/lib/imageOptimizer";
import fs from "fs/promises";
import path from "path";

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const isDev = process.env.NODE_ENV === "development";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Archivo muy grande (máx 10MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);

    const optimized = await optimizeImage(originalBuffer);

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

    if (isDev) {
      // Local: guardar en public/uploads/
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, optimized.buffer);
      const url = `/uploads/${fileName}`;

      return NextResponse.json({
        success: true,
        url,
        optimized: {
          format: optimized.format,
          width: optimized.width,
          height: optimized.height,
          originalSize: file.size,
          optimizedSize: optimized.size,
          savingPercent: Math.round((1 - optimized.size / file.size) * 100),
        },
      });
    }

    // Producción: subir a Supabase
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, optimized.buffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    const url = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url,
      optimized: {
        format: optimized.format,
        width: optimized.width,
        height: optimized.height,
        originalSize: file.size,
        optimizedSize: optimized.size,
        savingPercent: Math.round((1 - optimized.size / file.size) * 100),
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Error uploading file" }, { status: 500 });
  }
}