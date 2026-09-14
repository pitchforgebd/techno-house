import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnvFiles } from "dotenv";
import { PrismaClient } from "./lib/generated/prisma/client";

async function main(): Promise<void> {
  loadEnvFiles({ path: [".env.local", ".env"], quiet: true });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
  });
  try {
    const before = await prisma.product.count();
    const deleted = await prisma.product.deleteMany({});
    console.log(`products before ${before}, deleted ${deleted.count}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
