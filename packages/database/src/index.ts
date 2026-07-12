import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __veyraproPrisma: PrismaClient | undefined;
}

/** Singleton Prisma client — avoids exhausting connections under Next.js hot reload. */
export const prisma = globalThis.__veyraproPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__veyraproPrisma = prisma;
}

export * from "@prisma/client";
