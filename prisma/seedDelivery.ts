import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("repartidor123", 10);

  const existingUser = await prisma.user.findUnique({
    where: { username: "repartidor" },
  });

  if (existingUser) {
    console.log("El usuario repartidor ya existe");
    return;
  }

  const user = await prisma.user.create({
    data: {
      username: "repartidor",
      password: hashedPassword,
      name: "Repartidor de Prueba",
      role: "DELIVERY",
      wallet: 0,
    },
  });

  await prisma.deliveryProfile.create({
    data: {
      userId: user.id,
      commissionRate: 0.2,
      pendingBalance: 0,
      totalDeliveries: 0,
    },
  });

  console.log("Usuario repartidor creado exitosamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });