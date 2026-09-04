import { afterEach, describe, expect, it } from "vitest";
import { RESEND_CONFIGURATION_ERROR, sendEmail } from "./send";

const originalResendApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  if (originalResendApiKey) process.env.RESEND_API_KEY = originalResendApiKey;
  else delete process.env.RESEND_API_KEY;
});

describe("sendEmail", () => {
  it("fails clearly when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(
      sendEmail({
        to: "recipient@example.com",
        subject: "Hello",
        text: "Body",
      }),
    ).rejects.toThrow(RESEND_CONFIGURATION_ERROR);
  });
});
