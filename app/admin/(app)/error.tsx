"use client";

import Link from "next/link";

export default function AdminAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="admin-error-panel">
      <span>ADMIN ERROR</span>
      <h1>Admin workspace could not load</h1>
      <p>
        A server-side admin request failed. Check that <code>SUPABASE_SECRET_KEY</code> is set,
        the Supabase migration has been applied, and the service-role key can read the admin tables.
      </p>
      {error.digest ? <small>Digest: {error.digest}</small> : null}
      <div>
        <button className="admin-primary" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="admin-secondary" href="/admin/login">
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
