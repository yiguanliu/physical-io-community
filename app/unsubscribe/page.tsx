import { unsubscribeByToken } from "@/lib/admin/store";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const member = token ? await unsubscribeByToken(token) : null;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "var(--font), sans-serif" }}>
      <section style={{ maxWidth: 480, textAlign: "center" }}>
        <p style={{ color: "#ee4b1a", fontWeight: 700, letterSpacing: ".12em", fontSize: "10pt" }}>PHYSICAL I/O</p>
        <h1 style={{ margin: "12px 0" }}>{member ? "You’re unsubscribed" : "Link not valid"}</h1>
        <p style={{ color: "#555" }}>
          {member
            ? `${member.email} will no longer receive optional Physical I/O emails.`
            : "This unsubscribe link is missing or has already been used incorrectly."}
        </p>
      </section>
    </main>
  );
}
