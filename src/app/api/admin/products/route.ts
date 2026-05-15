import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, adminUnauthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/db";
import { rateLimit, getRateLimitKey } from "@/lib/rateLimit";

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Error fetching products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = rateLimit(`admin-products:${getRateLimitKey(request)}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rl.retryAfter} segundos.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const body = await request.json();
    const { name, slug, description, price, purchasePrice, comparePrice, image, stock, category, isActive } = body;

    if (!name || !slug || price === undefined) {
      return NextResponse.json({ error: "Nombre, slug y precio son requeridos" }, { status: 400 });
    }

    if (typeof price !== "number" || price <= 0) {
      return NextResponse.json({ error: "El precio debe ser mayor que 0" }, { status: 400 });
    }

    if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
      return NextResponse.json({ error: "El stock no puede ser negativo" }, { status: 400 });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    });

    if (existingProduct) {
      return NextResponse.json({ error: "El producto ya existe" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price,
        purchasePrice: purchasePrice || null,
        comparePrice: comparePrice || null,
        image: image || null,
        stock: stock || 0,
        category: category || null,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(product);
  } catch {
    console.error("Error creating product:");
    return NextResponse.json({ error: "Error creating product" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const rl = rateLimit(`admin-products:${getRateLimitKey(request)}`, 10, 60000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rl.retryAfter} segundos.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const body = await request.json();
    const { id, name, slug, description, price, purchasePrice, comparePrice, image, stock, category, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (price !== undefined && (typeof price !== "number" || price <= 0)) {
      return NextResponse.json({ error: "El precio debe ser mayor que 0" }, { status: 400 });
    }

    if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
      return NextResponse.json({ error: "El stock no puede ser negativo" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice || null;
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice;
    if (image !== undefined) updateData.image = image;
    if (stock !== undefined) updateData.stock = stock;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (slug) updateData.slug = slug;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Error updating product" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: "Error deleting product" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth) return adminUnauthorized();
  try {
    const body = await request.json();
    const { id, increment } = body;

    if (!id || increment === undefined) {
      return NextResponse.json({ error: "ID e incremento requeridos" }, { status: 400 });
    }

    const incrementNum = parseInt(increment, 10);
    if (isNaN(incrementNum)) {
      return NextResponse.json({ error: "Incremento debe ser numérico" }, { status: 400 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        stock: { increment: incrementNum },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Increment stock error:", error);
    return NextResponse.json({ error: "Error incrementando stock" }, { status: 500 });
  }
}