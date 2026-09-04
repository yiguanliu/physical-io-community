import { afterEach, describe, expect, it, vi } from "vitest";
import { checkResendHealth, senderDomain } from "./health";

const originalResendApiKey = process.env.RESEND_API_KEY;
const originalResendFrom = process.env.RESEND_FROM;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalResendApiKey) process.env.RESEND_API_KEY = originalResendApiKey;
  else delete process.env.RESEND_API_KEY;
  if (originalResendFrom) process.env.RESEND_FROM = originalResendFrom;
  else delete process.env.RESEND_FROM;
});

describe("senderDomain", () => {
  it("extracts the domain from a display-name sender", () => {
    expect(senderDomain("Physical I/O <updates@physical-io.com>")).toBe("physical-io.com");
  });
});

describe("checkResendHealth", () => {
  it("reports missing configuration", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(checkResendHealth()).resolves.toMatchObject({
      configured: false,
      ok: false,
    });
  });

  it("reports a verified sender domain", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Physical I/O <updates@physical-io.com>";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ name: "physical-io.com", status: "verified" }] }),
    })));

    await expect(checkResendHealth()).resolves.toMatchObject({
      configured: true,
      ok: true,
      fromDomain: "physical-io.com",
    });
  });
});
