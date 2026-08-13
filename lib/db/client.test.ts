import { describe, expect, it } from "vitest";
import { assertDatabaseConfig, databaseMode, isEphemeralDatabase, isRemoteDatabaseUrl } from "./client";

describe("database mode", () => {
  it("treats a Vercel deployment without a configured database as ephemeral", () => {
    expect(databaseMode({ VERCEL: "1" })).toBe("ephemeral");
    expect(isEphemeralDatabase({ VERCEL: "1" })).toBe(true);
  });

  it("treats a configured Turso database as persistent, on Vercel or locally", () => {
    const env = { VERCEL: "1", TURSO_DATABASE_URL: "libsql://physical-io.turso.io", TURSO_AUTH_TOKEN: "token" };
    expect(databaseMode(env)).toBe("remote");
    expect(isEphemeralDatabase(env)).toBe(false);
    expect(databaseMode({ TURSO_DATABASE_URL: "libsql://physical-io.turso.io" })).toBe("remote");
  });

  it("keeps local development on a persistent file", () => {
    expect(databaseMode({})).toBe("local-file");
    expect(isEphemeralDatabase({})).toBe(false);
  });

  it("ignores a blank database url", () => {
    expect(databaseMode({ VERCEL: "1", TURSO_DATABASE_URL: "   " })).toBe("ephemeral");
  });
});

describe("database config validation", () => {
  it("rejects a hosted database url without an auth token", () => {
    expect(() => assertDatabaseConfig({ TURSO_DATABASE_URL: "libsql://physical-io.turso.io" })).toThrow(
      /TURSO_AUTH_TOKEN is missing/,
    );
  });

  it("accepts a hosted database url with a token, and local files without one", () => {
    expect(() =>
      assertDatabaseConfig({ TURSO_DATABASE_URL: "libsql://physical-io.turso.io", TURSO_AUTH_TOKEN: "token" }),
    ).not.toThrow();
    expect(() => assertDatabaseConfig({ TURSO_DATABASE_URL: "file:data/physical-io-admin.db" })).not.toThrow();
    expect(() => assertDatabaseConfig({})).not.toThrow();
  });

  it("recognises hosted urls", () => {
    expect(isRemoteDatabaseUrl("libsql://physical-io.turso.io")).toBe(true);
    expect(isRemoteDatabaseUrl("https://physical-io.turso.io")).toBe(true);
    expect(isRemoteDatabaseUrl("file:/tmp/physical-io-admin.db")).toBe(false);
  });
});
