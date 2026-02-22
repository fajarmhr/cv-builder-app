import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDbUrl(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  // If it's a file: URL with relative path, resolve it to absolute
  if (dbUrl.startsWith("file:")) {
    const filePath = dbUrl.slice(5); // remove "file:"
    if (!path.isAbsolute(filePath)) {
      const absolutePath = path.resolve(process.cwd(), filePath);
      return "file:" + absolutePath;
    }
  }
  return dbUrl;
}

function createPrismaClient() {
  const url = getDbUrl();
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
