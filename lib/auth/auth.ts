import { dash, sentinel } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getDb } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { canCreateAdmin } from "@/lib/auth/allowlist";
import { SITE_URL } from "@/lib/site";
import { count } from "drizzle-orm";

const authBaseURL = process.env.BETTER_AUTH_URL || (process.env.VERCEL ? SITE_URL : "http://localhost:3000");

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "dev-only-physical-io-admin-secret-change-me",
  baseURL: authBaseURL,
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
  trustedOrigins: [
    authBaseURL,
    "https://www.physical-io.com",
    "https://physical-io.com",
    "http://localhost:3000",
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      await (await import("@/lib/db/client")).readyDb();
      const db = getDb();
      const [{ total }] = await db.select({ total: count() }).from(schema.user);
      const email = String(ctx.body?.email ?? "").toLowerCase();
      if (!canCreateAdmin(email, Number(total))) {
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
