import { redirect } from "next/navigation";

export default function OutreachLoginPage() {
  redirect("/admin/login?next=/outreach");
}
