import { dash, sentinel } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { count } from "drizzle-orm";

function allowlist() {
  return (process.env.ADMIN_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "dev-only-physical-io-admin-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(getDb(), {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "admin",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      await (await import("@/lib/db/client")).readyDb();
      const db = getDb();
      const [{ total }] = await db.select({ total: count() }).from(schema.user);
      const email = String(ctx.body?.email ?? "").toLowerCase();
      const allowed = allowlist();
      if (Number(total) > 0 && !allowed.includes(email)) {
        throw new APIError("FORBIDDEN", {
          message: "Administrator signup is invitation-only. Ask an existing admin to add your email to ADMIN_ALLOWLIST.",
        });
      }
    }),
  },
  plugins: [
    dash(),
    sentinel(),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
