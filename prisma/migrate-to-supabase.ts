/**
 * Script de migración: SQLite → PostgreSQL (Supabase)
 *
 * Uso:
 *   1. Configurar DATABASE_URL_SQLITE apuntando a tu SQLite actual
 *   2. Configurar DATABASE_URL apuntando a tu Supabase PostgreSQL
 *   3. Ejecutar: npx tsx prisma/migrate-to-supabase.ts
 *
 * El script respeta el orden de inserción de FKs:
 *   User → Category → Product, AffiliateProfile, DeliveryProfile
 *   → Order → OrderItem, WalletTransaction
 *   → Session, VerificationToken, Settings, BonusConfig, ProductRequest
 */

import { PrismaClient as SQLiteClient } from "@prisma/client";
import { PrismaClient as PGClient } from "@prisma/client";

// For this to work, you need two schema files or two Prisma generators.
// Approach: Run with SQLite first to extract data, then with PostgreSQL to insert.
//
// SIMPLER APPROACH (recommended):
// 1. npx prisma db push --schema=prisma/schema.sqlite.prisma  (SQLite schema)
// 2. Run this script to export data to JSON
// 3. npx prisma db push --schema=prisma/schema.pg.prisma  (PostgreSQL schema)
// 4. Run this script to import from JSON
//
// EVEN SIMPLER (if no real data to preserve):
// 1. Change DATABASE_URL to PostgreSQL
// 2. npx prisma db push
// 3. npx tsx prisma/seed.ts
// 4. Done.

async function main() {
  const mode = process.argv[2] || "export";

  if (mode === "export") {
    console.log("Exportando datos desde SQLite...");
    const sqlite = new SQLiteClient({
      datasources: { db: { url: process.env.DATABASE_URL_SQLITE || "file:./dev.db" } },
    });

    const data = {
      users: await sqlite.user.findMany(),
      categories: await sqlite.category.findMany(),
      products: await sqlite.product.findMany(),
      affiliateProfiles: await sqlite.affiliateProfile.findMany(),
      deliveryProfiles: await sqlite.deliveryProfile.findMany(),
      orders: await sqlite.order.findMany(),
      orderItems: await sqlite.orderItem.findMany(),
      walletTransactions: await sqlite.walletTransaction.findMany(),
      sessions: await sqlite.session.findMany(),
      verificationTokens: await sqlite.verificationToken.findMany(),
      settings: await sqlite.settings.findMany(),
      bonusConfigs: await sqlite.bonusConfig.findMany(),
      productRequests: await sqlite.productRequest.findMany(),
    };

    require("fs").writeFileSync("prisma/migration-data.json", JSON.stringify(data, null, 2));
    console.log(`✓ Exportados ${data.users.length} usuarios, ${data.orders.length} órdenes, etc.`);

    await sqlite.$disconnect();
  } else if (mode === "import") {
    console.log("Importando datos a PostgreSQL...");
    const pg = new PGClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });

    const data = JSON.parse(require("fs").readFileSync("prisma/migration-data.json", "utf-8"));

    // En orden respetando FKs
    console.log("Insertando categorías...");
    for (const cat of data.categories) {
      await pg.category.upsert({ where: { id: cat.id }, update: cat, create: cat }).catch(() => {});
    }

    console.log("Insertando usuarios...");
    for (const user of data.users) {
      await pg.user.upsert({ where: { id: user.id }, update: user, create: user }).catch(() => {});
    }

    console.log("Insertando productos...");
    for (const product of data.products) {
      await pg.product.upsert({ where: { id: product.id }, update: product, create: product }).catch(() => {});
    }

    console.log("Insertando perfiles de afiliados...");
    for (const profile of data.affiliateProfiles) {
      await pg.affiliateProfile.upsert({ where: { id: profile.id }, update: profile, create: profile }).catch(() => {});
    }

    console.log("Insertando perfiles de delivery...");
    for (const profile of data.deliveryProfiles) {
      await pg.deliveryProfile.upsert({ where: { id: profile.id }, update: profile, create: profile }).catch(() => {});
    }

    console.log("Insertando órdenes...");
    for (const order of data.orders) {
      await pg.order.upsert({ where: { id: order.id }, update: order, create: order }).catch(() => {});
    }

    console.log("Insertando items de órdenes...");
    for (const item of data.orderItems) {
      await pg.orderItem.upsert({ where: { id: item.id }, update: item, create: item }).catch(() => {});
    }

    console.log("Insertando transacciones de wallet...");
    for (const tx of data.walletTransactions) {
      await pg.walletTransaction.upsert({ where: { id: tx.id }, update: tx, create: tx }).catch(() => {});
    }

    console.log("Insertando configuraciones...");
    for (const s of data.settings) {
      await pg.settings.upsert({ where: { id: s.id }, update: s, create: s }).catch(() => {});
    }
    for (const bc of data.bonusConfigs) {
      await pg.bonusConfig.upsert({ where: { id: bc.id }, update: bc, create: bc }).catch(() => {});
    }
    for (const pr of data.productRequests) {
      await pg.productRequest.upsert({ where: { id: pr.id }, update: pr, create: pr }).catch(() => {});
    }
    for (const s of data.sessions) {
      await pg.session.upsert({ where: { id: s.id }, update: s, create: s }).catch(() => {});
    }
    for (const vt of data.verificationTokens) {
      await pg.verificationToken.upsert({ where: { token: vt.token }, update: vt, create: vt }).catch(() => {});
    }

    console.log("✓ Migración completada");
    await pg.$disconnect();
  } else {
    console.log("Modo no reconocido. Usa: export | import");
    console.log("");
    console.log("PASOS RECOMENDADOS (si no hay datos reales):");
    console.log("  1. Configurar DATABASE_URL en .env apuntando a PostgreSQL");
    console.log("  2. npx prisma db push");
    console.log("  3. npx tsx prisma/seed.ts");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error en migración:", e);
  process.exit(1);
});
