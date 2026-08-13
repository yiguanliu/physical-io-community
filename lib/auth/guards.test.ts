import { describe, expect, it } from "vitest";
import { assertAccountsPersist } from "./guards";

describe("account persistence guard", () => {
  it("refuses to create accounts on an ephemeral serverless database", () => {
    expect(() => assertAccountsPersist({ VERCEL: "1" })).toThrow(/no persistent database/i);
    expect(() => assertAccountsPersist({ VERCEL: "1" })).toThrow(/TURSO_DATABASE_URL/);
  });

  it("allows accounts once a persistent database is configured", () => {
    expect(() =>
      assertAccountsPersist({
        VERCEL: "1",
        TURSO_DATABASE_URL: "libsql://physical-io.turso.io",
        TURSO_AUTH_TOKEN: "token",
      }),
    ).not.toThrow();
  });

  it("allows accounts in local development", () => {
    expect(() => assertAccountsPersist({})).not.toThrow();
  });
});
