import { config as loadEnvFiles } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration (P10-T02).
 *
 * Prisma 7 no longer loads .env files on its own, so they are loaded here.
 * `.env.local` wins over `.env`, matching how Next.js resolves them, which
 * keeps a single connection string for both the app and the CLI.
 */
loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read directly rather than through prisma/config's `env()` helper: that
    // helper throws while merely loading the config, which would break
    // `prisma generate` anywhere the database URL is absent (CI, builds).
    // `lib/env.ts` is the strict validator for application code.
    url: process.env.DATABASE_URL ?? "",
  },
});
