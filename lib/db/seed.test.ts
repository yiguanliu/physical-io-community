import { createClient } from "@libsql/client";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";
import { memberInterests, members } from "./schema";

describe("signup member seed", () => {
  it("loads the Google Form responses into the members table", async () => {
    const sqlite = createClient({ url: ":memory:" });
    const db = drizzle(sqlite, { schema });
    await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
    await seedIfEmpty(db);

    const [{ total }] = await db.select({ total: count() }).from(members).where(eq(members.source, "google_form"));
    expect(Number(total)).toBe(99);

    const [anthony] = await db
      .select()
      .from(members)
      .where(eq(members.emailNormalized, "anthony.liu218@gmail.com"))
      .limit(1);
    expect(anthony).toBeTruthy();
    expect(anthony?.fullName).toBe("Anthony Liu");
    expect(anthony?.city).toBe("London");
    expect(anthony?.suggestions).toBe("");

    const tags = await db.select().from(memberInterests).where(eq(memberInterests.memberId, anthony!.id));
    expect(new Set(tags.map((tag) => tag.kind))).toEqual(new Set(["community_goal", "event_format", "work_area"]));
    expect(tags.filter((tag) => tag.kind === "work_area").map((tag) => tag.interest)).toEqual(["AI/ML Training"]);
  });
});
