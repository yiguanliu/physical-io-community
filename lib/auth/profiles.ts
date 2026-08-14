import type { User as SupabaseUser } from "@supabase/supabase-js";
import { count, eq } from "drizzle-orm";
import { ADMIN_ROLE, roleForNewUser } from "@/lib/auth/allowlist";
import { readyDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";

type ProfileInput = {
  name?: string;
  email?: string;
};

export type AdminProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function metadataName(authUser: SupabaseUser) {
  const metadata = authUser.user_metadata;
  return (
    (typeof metadata?.name === "string" && metadata.name.trim()) ||
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
    ""
  );
}

function fallbackName(email: string) {
  return email.split("@")[0] || "Administrator";
}

function profileFromRow(row: typeof user.$inferSelect): AdminProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };
}

export async function ensureAdminProfile(
  authUser: SupabaseUser,
  input: ProfileInput = {},
): Promise<AdminProfile | null> {
  const email = (input.email || authUser.email || "").trim().toLowerCase();
  if (!email) return null;

  const name = (input.name || metadataName(authUser) || fallbackName(email)).trim();
  const db = await readyDb();
  const now = new Date();

  const [byId] = await db.select().from(user).where(eq(user.id, authUser.id)).limit(1);
  if (byId) {
    if (byId.email !== email) {
      const [byEmail] = await db.select().from(user).where(eq(user.email, email)).limit(1);
      if (byEmail) {
        await db
          .update(user)
          .set({
            name,
            emailVerified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
            image: authUser.user_metadata?.avatar_url ? String(authUser.user_metadata.avatar_url) : byEmail.image,
            updatedAt: now,
          })
          .where(eq(user.id, byEmail.id));
        return profileFromRow({ ...byEmail, name, email });
      }
    }
    await db
      .update(user)
      .set({
        name,
        email,
        emailVerified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
        image: authUser.user_metadata?.avatar_url ? String(authUser.user_metadata.avatar_url) : byId.image,
        updatedAt: now,
      })
      .where(eq(user.id, byId.id));
    return profileFromRow({ ...byId, name, email });
  }

  const [byEmail] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (byEmail) {
    await db
      .update(user)
      .set({
        name,
        emailVerified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
        image: authUser.user_metadata?.avatar_url ? String(authUser.user_metadata.avatar_url) : byEmail.image,
        updatedAt: now,
      })
      .where(eq(user.id, byEmail.id));
    return profileFromRow({ ...byEmail, name, email });
  }

  const [{ total }] = await db.select({ total: count() }).from(user).where(eq(user.role, ADMIN_ROLE));
  const role = roleForNewUser(email, Number(total));

  await db.insert(user).values({
    id: authUser.id,
    name,
    email,
    emailVerified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at),
    image: authUser.user_metadata?.avatar_url ? String(authUser.user_metadata.avatar_url) : null,
    role,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: authUser.id,
    name,
    email,
    role,
  };
}
