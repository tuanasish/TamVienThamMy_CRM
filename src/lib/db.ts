import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;
  
  let dbConfig: any = {};
  if (connectionString) {
    try {
      const parsedUrl = new URL(connectionString);
      dbConfig = {
        user: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        host: parsedUrl.hostname,
        port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
        database: parsedUrl.pathname.substring(1),
      };
    } catch (e) {
      dbConfig = { connectionString };
    }
  }

  // Initialize the PostgreSQL connection pool with optimized settings
  const pool = new Pool({ 
    ...dbConfig,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    max: 10,               // Maximum connections in pool
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Timeout connecting after 10s
  });
  
  // Create a Prisma Pg adapter instance
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    transactionOptions: {
      maxWait: 10000,   // Max time to wait to acquire a connection (10s)
      timeout: 30000,   // Max time for the entire transaction (30s)
    },
  });
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
