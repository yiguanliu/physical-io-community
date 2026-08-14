import { ADMIN_ROLE, PENDING_ROLE } from "@/lib/auth/allowlist";
import { listAdminProfiles, setAdminRole } from "@/lib/auth/profiles";
import { writeAudit } from "@/lib/admin/store";

export async function listAccessUsers() {
  const users = await listAdminProfiles();
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
  if (input.userId === input.actor.id) throw new Error("You cannot change your own access.");
  const users = await listAdminProfiles();
  const target = users.find((user) => user.id === input.userId);
  if (!target) throw new Error("User not found.");

  await setAdminRole(input.userId, input.role);
  await writeAudit({
    actorUserId: input.actor.id,
    actorName: input.actor.name,
    action: input.role === "denied" ? "access.denied" : input.role === ADMIN_ROLE ? "access.approved" : "access.pending",
    entityType: "user",
    entityId: input.userId,
    summary: `${input.role === "denied" ? "Declined" : input.role === ADMIN_ROLE ? "Approved" : "Set pending"} admin access for ${target.email}`,
  });
}
