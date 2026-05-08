import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      wallet: true,
    },
  });

  console.log("Usuarios en la DB:");
  users.forEach((u) => {
    console.log(`- ${u.username} | ${u.name} | role: ${u.role} | wallet: ${u.wallet}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });