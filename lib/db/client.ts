import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

type GlobalDb = {
  adminSqlite?: Client;
  adminDb?: ReturnType<typeof drizzle<typeof schema>>;
  adminReady?: Promise<void>;
};

const globalForDb = globalThis as unknown as GlobalDb;

export function isEphemeralDatabase() {
  return Boolean(process.env.VERCEL) && !process.env.TURSO_DATABASE_URL;
}

function resolveDatabaseUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) return "file:/tmp/physical-io-admin.db";
  const filePath = resolve(process.cwd(), "data/physical-io-admin.db");
  mkdirSync(dirname(filePath), { recursive: true });
  return `file:${filePath}`;
}

function getSqlite() {
  if (!globalForDb.adminSqlite) {
    const url = resolveDatabaseUrl();
    if (url.startsWith("file:")) {
      const filePath = url.slice("file:".length);
      mkdirSync(dirname(filePath), { recursive: true });
      if (!existsSync(dirname(filePath))) mkdirSync(dirname(filePath), { recursive: true });
    }
    globalForDb.adminSqlite = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalForDb.adminSqlite;
}

export function getDb() {
  if (!globalForDb.adminDb) {
    globalForDb.adminDb = drizzle(getSqlite(), { schema });
  }
  return globalForDb.adminDb;
}

export async function readyDb() {
  if (!globalForDb.adminReady) {
    globalForDb.adminReady = (async () => {
      const { migrate } = await import("drizzle-orm/libsql/migrator");
      const db = getDb();
      await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
    })();
  }
  await globalForDb.adminReady;
  return getDb();
}
