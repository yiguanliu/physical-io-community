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

export type DatabaseEnv = {
  [key: string]: string | undefined;
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  VERCEL?: string;
};

const globalForDb = globalThis as unknown as GlobalDb;

/**
 * `remote` is a hosted libSQL/Turso database, `local-file` is the developer's
 * checkout, and `ephemeral` is a serverless instance writing to its own /tmp
 * file. Ephemeral instances do not share data with each other and are wiped on
 * every deploy, so anything written there is lost.
 */
export type DatabaseMode = "remote" | "local-file" | "ephemeral";

export const PERSISTENCE_SETUP_HINT =
  "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel project, then redeploy.";

export function databaseMode(env: DatabaseEnv = process.env): DatabaseMode {
  if (env.TURSO_DATABASE_URL?.trim()) return "remote";
  return env.VERCEL ? "ephemeral" : "local-file";
}

export function isEphemeralDatabase(env: DatabaseEnv = process.env) {
  return databaseMode(env) === "ephemeral";
}

export function isRemoteDatabaseUrl(url: string) {
  return /^(libsql|https|http|wss|ws):/i.test(url.trim());
}

/** Surfaces a misconfigured hosted database instead of a libSQL 401 later on. */
export function assertDatabaseConfig(env: DatabaseEnv = process.env) {
  const url = env.TURSO_DATABASE_URL?.trim();
  if (!url) return;
  if (isRemoteDatabaseUrl(url) && !env.TURSO_AUTH_TOKEN?.trim()) {
    throw new Error(
      "TURSO_DATABASE_URL points at a hosted database but TURSO_AUTH_TOKEN is missing. Add both values and redeploy.",
    );
  }
}

export function resolveDatabaseUrl(env: DatabaseEnv = process.env) {
  const configured = env.TURSO_DATABASE_URL?.trim();
  if (configured) return configured;
  if (env.VERCEL) return "file:/tmp/physical-io-admin.db";
  const filePath = resolve(process.cwd(), "data/physical-io-admin.db");
  mkdirSync(dirname(filePath), { recursive: true });
  return `file:${filePath}`;
}

function getSqlite() {
  if (!globalForDb.adminSqlite) {
    assertDatabaseConfig();
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
    })().catch((error) => {
      // A cached rejection would keep every later request failing, so allow a retry.
      globalForDb.adminReady = undefined;
      throw error;
    });
  }
  await globalForDb.adminReady;
  return getDb();
}
