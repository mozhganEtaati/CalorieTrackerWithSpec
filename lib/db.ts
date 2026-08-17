import { PrismaClient } from "@prisma/client";

// In development, Next.js hot-reloads modules on every edit. Each reload would
// construct a brand new PrismaClient — and each client opens its own connection
// pool — until the database refuses new connections. Caching the instance on
// globalThis survives the reload, so exactly one client exists per process.
// In production the module is evaluated once, so the cache is unnecessary.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
