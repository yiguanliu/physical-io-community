import { describe, expect, it } from "vitest";
import { assertAccountsPersist } from "./guards";

describe("account persistence guard", () => {
  it("refuses to create accounts without the Supabase admin key", () => {
    expect(() => assertAccountsPersist({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("allows accounts once Supabase admin credentials are configured", () => {
    expect(() =>
      assertAccountsPersist({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SECRET_KEY: "service-role-key",
      }),
    ).not.toThrow();
  });

  it("accepts the service-role alias", () => {
    expect(() =>
      assertAccountsPersist({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      }),
    ).not.toThrow();
  });
});
