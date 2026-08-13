import { dash, sentinel } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db/client";
import { assertAccountsPersist } from "@/lib/auth/guards";
import * as schema from "@/lib/db/schema";
import { ADMIN_ROLE, roleForNewUser } from "@/lib/auth/allowlist";
import { SITE_URL } from "@/lib/site";
import { count, eq } from "drizzle-orm";

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
        defaultValue: "pending",
        input: false,
        returned: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 8,
    },
  },
  trustedOrigins: [
    authBaseURL,
    "https://www.physical-io.com",
    "https://physical-io.com",
    "https://dash.better-auth.com",
    "http://localhost:3000",
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          assertAccountsPersist();
          await (await import("@/lib/db/client")).readyDb();
          const db = getDb();
          const [{ total }] = await db
            .select({ total: count() })
            .from(schema.user)
            .where(eq(schema.user.role, ADMIN_ROLE));
          return {
            data: {
              ...user,
              role: roleForNewUser(String(user.email ?? ""), Number(total)),
            },
          };
        },
      },
    },
  },
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
    sentinel({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
