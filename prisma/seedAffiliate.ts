import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Crear usuario afiliado
  const hashedPassword = await bcrypt.hash("afiliado123", 10);
  
  const user = await prisma.user.upsert({
    where: { username: "afiliado" },
    update: {},
    create: {
      username: "afiliado",
      password: hashedPassword,
      name: "Afiliado Demo",
      role: "GESTOR",
      wallet: 0,
    },
  });

  console.log("✓ Usuario afiliado creado:", user.username);

  // Crear perfil de afiliado
  const affiliateProfile = await prisma.affiliateProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      code: "AFILIADO",
      commissionRate: 0.1,
    },
  });

  console.log("✓ Perfil de afiliado creado:", affiliateProfile.code);
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