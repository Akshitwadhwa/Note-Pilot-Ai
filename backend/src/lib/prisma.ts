import { env } from "../config/env";

type PrismaClientLike = {
  $disconnect?: () => Promise<void>;
};

let prisma: PrismaClientLike | null = null;

try {
  // Keep Prisma optional until the project actually installs and uses it.
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: new (options: { datasources: { db: { url: string } } }) => PrismaClientLike;
  };

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: env.databaseUrl
      }
    }
  });
} catch {
  prisma = null;
}

export { prisma };
