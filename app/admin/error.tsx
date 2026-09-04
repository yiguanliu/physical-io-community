"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-app admin-auth">
      <section className="admin-error-panel">
        <span>ADMIN ERROR</span>
        <h1>Admin workspace could not load</h1>
        <p>
          A server-side admin request failed. Check that <code>SUPABASE_SECRET_KEY</code> is set,
          the Supabase migration has been applied, and the service-role key can read the admin tables.
        </p>
        {error.digest ? <small>Digest: {error.digest}</small> : null}
        <div>
          <Button className="admin-primary" type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild className="admin-secondary" variant="outline">
            <Link href="/admin/login">Back to sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
