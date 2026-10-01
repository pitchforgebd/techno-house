import { config as loadEnvFiles } from "dotenv";
loadEnvFiles({ path: [".env.local", ".env"], quiet: true });
import { getPrisma } from "../../lib/db/prisma";

async function main() {
  const prisma = getPrisma();

  const ssd = await prisma.category.findUnique({
    where: { slug: "ssd" },
    select: { id: true },
  });
  if (ssd) {
    const children = await prisma.category.findMany({
      where: { parentId: ssd.id },
      select: { id: true, slug: true, name: true },
    });
    for (const child of children) {
      const count = await prisma.product.count({ where: { categoryId: child.id } });
      console.log(`child of ssd: ${child.slug} ("${child.name}") — products: ${count}`);
    }
  }

  const lookalikes = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: "ssd" } },
        { slug: { contains: "nvme" } },
        { slug: { contains: "sata" } },
        { name: { contains: "ssd", mode: "insensitive" } },
        { name: { contains: "nvme", mode: "insensitive" } },
      ],
    },
    select: { id: true, slug: true, name: true, parentId: true },
  });
  console.log(`\nAll ssd/nvme/sata-ish categories (${lookalikes.length}):`);
  for (const cat of lookalikes) {
    const count = await prisma.product.count({ where: { categoryId: cat.id } });
    console.log(`  ${cat.slug} ("${cat.name}") parentId=${cat.parentId} — products: ${count}`);
  }
}

main().finally(() => getPrisma().$disconnect());
