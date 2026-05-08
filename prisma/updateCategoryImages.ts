import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany();

  const images: Record<string, string> = {
    Accesorios: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400",
    Calzado: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    Tops: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
    Pantalones: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
  };

  for (const category of categories) {
    const image = images[category.name];
    if (image) {
      await prisma.category.update({
        where: { id: category.id },
        data: { image },
      });
      console.log(`✓ ${category.name} -> ${image}`);
    }
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });