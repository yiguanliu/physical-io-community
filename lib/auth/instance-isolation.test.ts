import { createClient } from "@libsql/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";

const CREDENTIALS = { email: "new.admin@physical-io.com", password: "physical-io-admin", name: "New Admin" };

/**
 * Stands in for one serverless instance: its own libSQL file plus a Better Auth
 * instance configured like the deployed app. Two instances pointing at separate
 * files reproduce Vercel's per-instance /tmp database; pointing both at one file
 * reproduces a hosted database that every instance shares.
 */
async function serverlessInstance(databaseFile: string) {
  const db = drizzle(createClient({ url: `file:${databaseFile}` }), { schema });
  await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
  const auth = betterAuth({
    secret: "test-only-secret-for-physical-io-admin",
    baseURL: "http://localhost:3000",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true },
  });
  return { db, auth };
}

function findUser(instance: Awaited<ReturnType<typeof serverlessInstance>>, id: string) {
  return instance.db.select().from(schema.user).where(eq(schema.user.id, id));
}

describe("new admin accounts across serverless instances", () => {
  it("loses the account when each instance keeps its own database", async () => {
    const directory = mkdtempSync(join(tmpdir(), "physical-io-ephemeral-"));
    const instanceA = await serverlessInstance(join(directory, "instance-a.db"));
    const instanceB = await serverlessInstance(join(directory, "instance-b.db"));

    const created = await instanceA.auth.api.signUpEmail({ body: CREDENTIALS });
    expect(created.user.id).toBeTruthy();
    expect(await findUser(instanceA, created.user.id)).toHaveLength(1);

    // The next request — a dashboard refresh, or a sign-in — can land elsewhere.
    expect(await findUser(instanceB, created.user.id)).toHaveLength(0);
    await expect(
      instanceB.auth.api.signInEmail({ body: { email: CREDENTIALS.email, password: CREDENTIALS.password } }),
    ).rejects.toThrow();
  });

  it("keeps the account when instances share one database", async () => {
    const directory = mkdtempSync(join(tmpdir(), "physical-io-shared-"));
    const sharedFile = join(directory, "shared.db");
    const instanceA = await serverlessInstance(sharedFile);
    const instanceB = await serverlessInstance(sharedFile);

    const created = await instanceA.auth.api.signUpEmail({ body: CREDENTIALS });
    expect(await findUser(instanceB, created.user.id)).toHaveLength(1);

    const signedIn = await instanceB.auth.api.signInEmail({
      body: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    });
    expect(signedIn.user.email).toBe(CREDENTIALS.email);
  });
});
