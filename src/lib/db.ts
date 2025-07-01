import { PrismaClient } from "../generated/prisma";

const prismaGlobal = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export async function openDatabase() {
  // Use singleton pattern for Prisma client to avoid connection issues
  if (!prismaGlobal.prisma) {
    prismaGlobal.prisma = new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });
    console.log(`>>> Prisma: connected to database`);
  }

  const prisma = prismaGlobal.prisma;

  return {
    prisma,
    db: prisma, // Alias for backward compatibility
    [Symbol.asyncDispose]: async () => {
      await prisma.$disconnect();
      console.log(`>>> Prisma: disconnected from database`);
    },
  };
}
