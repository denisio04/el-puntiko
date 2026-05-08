import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed: Creando usuarios...");

  const hashedPassword = await bcrypt.hash("123456", 10);

  // Admin users
  await prisma.user.upsert({
    where: { username: "denis" },
    update: {},
    create: { username: "denis", password: hashedPassword, name: "Denis", role: "ADMIN", wallet: 0 },
  });

  await prisma.user.upsert({
    where: { username: "felix" },
    update: {},
    create: { username: "felix", password: hashedPassword, name: "Felix", role: "ADMIN", wallet: 0 },
  });

  // Afiliado
  const affiliate = await prisma.user.upsert({
    where: { username: "afiliado" },
    update: {},
    create: { username: "afiliado", password: hashedPassword, name: "Juan Afiliado", role: "AFFILIATE", wallet: 0 },
  });

  await prisma.affiliateProfile.upsert({
    where: { userId: affiliate.id },
    update: {},
    create: { userId: affiliate.id, code: "AFILIADO", commissionRate: 0.10 },
  });

  // Supplier
  await prisma.user.upsert({
    where: { username: "proveedor" },
    update: {},
    create: { username: "proveedor", password: hashedPassword, name: "Carlos Proveedor", role: "SUPPLIER", wallet: 0 },
  });

  // Delivery
  const delivery = await prisma.user.upsert({
    where: { username: "repartidor" },
    update: {},
    create: { username: "repartidor", password: hashedPassword, name: "Pedro Repartidor", role: "DELIVERY", wallet: 0 },
  });

  await prisma.deliveryProfile.upsert({
    where: { userId: delivery.id },
    update: {},
    create: { userId: delivery.id, commissionRate: 0.20, pendingBalance: 0, totalDeliveries: 0 },
  });

  // Staff
  await prisma.user.upsert({
    where: { username: "staff" },
    update: {},
    create: { username: "staff", password: hashedPassword, name: "Maria Staff", role: "STAFF", wallet: 0 },
  });

  // Customer
  await prisma.user.upsert({
    where: { username: "cliente" },
    update: {},
    create: { username: "cliente", password: hashedPassword, name: "Pedro Cliente", role: "CUSTOMER", wallet: 0 },
  });

  console.log("✓ 8 usuarios creados (2 admins + 6 roles)");

  console.log("Seed: Creando categorías...");

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "accesorios" },
      update: {},
      create: { name: "Accesorios", slug: "accesorios" },
    }),
    prisma.category.upsert({
      where: { slug: "calzado" },
      update: {},
      create: { name: "Calzado", slug: "calzado" },
    }),
    prisma.category.upsert({
      where: { slug: "tops" },
      update: {},
      create: { name: "Tops", slug: "tops" },
    }),
    prisma.category.upsert({
      where: { slug: "pantalones" },
      update: {},
      create: { name: "Pantalones", slug: "pantalones" },
    }),
  ]);

  console.log(`✓ ${categories.length} categorías creadas`);

  console.log("Seed: Creando productos...");

  const products = [
    { name: "Gorra Classic Black", slug: "gorra-classic-black", price: 25, category: "Accesorios", stock: 50, description: "Gorra urbana de alta calidad. Diseño minimalista en negro puro.", image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400" },
    { name: "Billetera Minimal", slug: "billetera-minimal", price: 18, category: "Accesorios", stock: 30, description: "Billetera slim en cuero negro. Espacio para 6 tarjetas.", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400" },
    { name: "Riñonera Urban", slug: "rinonera-urban", price: 35, category: "Accesorios", stock: 25, description: "Riñonera ajustable. Bolsillo principal con cremallera.", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400" },
    
    { name: "Zapatillas Runner Pro", slug: "zapatillas-runner-pro", price: 85, category: "Calzado", stock: 40, description: "Zapatillas de corredor profesional. Suela amortiguada.", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400" },
    { name: "Botas Chelsea", slug: "botas-chelsea", price: 120, category: "Calzado", stock: 15, description: "Botas Chelsea en cuero negro. Tacón reforzado.", image: "https://images.unsplash.com/photo-1608256246300-c876627060a3?w=400" },
    { name: "Sandalias Casual", slug: "sandalias-casual", price: 45, category: "Calzado", stock: 35, description: "Sandalias de verano. Cierre con velcro.", image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400" },
    
    { name: "Camiseta Oversize", slug: "camiseta-oversize", price: 35, category: "Tops", stock: 60, description: "Camiseta oversize en algodón 100%. Disponible en negro y blanco.", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400" },
    { name: "Polo Essential", slug: "polo-essential", price: 45, category: "Tops", stock: 40, description: "Polo clásico en pique premium. Cuello y manga con rib.", image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400" },
    { name: "Hoodie Brutalist", slug: "hoodie-brutalist", price: 65, category: "Tops", stock: 30, description: "Hoodie oversize con capucha. Bolsillo canguro frontal.", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400" },
    
    { name: "Jeans Straight", slug: "jeans-straight", price: 55, category: "Pantalones", stock: 45, description: "Jeans corte recto. 98% algodón, 2% elastano.", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400" },
    { name: "Joggers Tech", slug: "joggers-tech", price: 50, category: "Pantalones", stock: 35, description: "Joggers técnicos con bolsillos impermeables.", image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400" },
    { name: "Cargo Pockets", slug: "cargo-pockets", price: 60, category: "Pantalones", stock: 25, description: "Pantalones cargo con 6 bolsillos. Tela resistente.", image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400" },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }

  console.log(`✓ ${products.length} productos creados`);

  console.log("Seed: Creando configuración global...");

  await prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      affiliateCommissionRate: 0.10,
      deliveryCommissionRate: 0.20,
    },
  });

  console.log("✓ Configuración global creada");
  console.log("Seed completado!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });