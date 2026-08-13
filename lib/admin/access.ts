import { desc, eq } from "drizzle-orm";
import { readyDb } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { ADMIN_ROLE, PENDING_ROLE } from "@/lib/auth/allowlist";
import { writeAudit } from "@/lib/admin/store";

export async function listAccessUsers() {
  const db = await readyDb();
  const users = await db.select().from(user).orderBy(desc(user.createdAt));
  return {
    admins: users.filter((row) => row.role === ADMIN_ROLE),
    pending: users.filter((row) => row.role === PENDING_ROLE),
  };
}

export async function setUserRole(input: {
  userId: string;
  role: typeof ADMIN_ROLE | typeof PENDING_ROLE | "denied";
  actor: { id: string; name: string };
}) {
  const db = await readyDb();
  const [target] = await db.select().from(user).where(eq(user.id, input.userId)).limit(1);
  if (!target) throw new Error("User not found.");
  if (target.id === input.actor.id) throw new Error("You cannot change your own access.");

  if (input.role === "denied") {
    await db.delete(user).where(eq(user.id, input.userId));
    await writeAudit({
      actorUserId: input.actor.id,
      actorName: input.actor.name,
      action: "access.denied",
      entityType: "user",
      entityId: input.userId,
      summary: `Declined admin access for ${target.email}`,
    });
    return;
  }

  await db.update(user).set({ role: input.role, updatedAt: new Date() }).where(eq(user.id, input.userId));
  await writeAudit({
    actorUserId: input.actor.id,
    actorName: input.actor.name,
    action: input.role === ADMIN_ROLE ? "access.approved" : "access.pending",
    entityType: "user",
    entityId: input.userId,
    summary: `${input.role === ADMIN_ROLE ? "Approved" : "Set pending"} admin access for ${target.email}`,
  });
}
