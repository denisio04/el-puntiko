import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const testOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-TEST-${Date.now().toString().slice(-6)}`,
      customerName: "Cliente Prueba",
      customerPhone: "+53 51234567",
      customerAddress: "Habana, Cuba",
      notes: "Pedido de prueba",
      subtotal: 100,
      total: 100,
      status: "PENDING",
    },
  });

  console.log("✓ Pedido de prueba creado:", testOrder.orderNumber);
  console.log("Ahora puedes ver el pedido en /admin/pedidos");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });