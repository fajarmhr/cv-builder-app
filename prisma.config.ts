import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Direct (non-pooled) connection for migrations; runtime uses pooled DATABASE_URL via the adapter.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
