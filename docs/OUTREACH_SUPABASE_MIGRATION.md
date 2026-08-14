# Outreach pipeline: Supabase migration

The `/outreach` page currently uses Prisma over a server-only PostgreSQL
connection. It is ready to point at Supabase Postgres without exposing the
outreach tables through the browser Data API.

## Local verification

1. Start Docker or another Docker-compatible runtime.
2. Run `pnpm supabase start`.
3. Run `pnpm supabase db reset` to replay the migration from scratch.
4. Run `pnpm prisma generate`.
5. Copy the local database URL printed by Supabase into `DATABASE_URL`, then
   run `pnpm dev` and open `http://localhost:3000/outreach`.

## Hosted migration

1. Create or select the Supabase project.
2. Run `pnpm supabase login`.
3. Run `pnpm supabase link --project-ref <project-ref>`.
4. If the hosted project already contains schema changes, run
   `pnpm supabase db pull` and review the generated baseline before proceeding.
5. Preview with `pnpm supabase db push --dry-run`.
6. Apply with `pnpm supabase db push`.
7. Set `DATABASE_URL` in the deployment environment to Supabase's transaction
   pooler connection string. Keep it server-only; never prefix it with
   `NEXT_PUBLIC_`.

The migration enables RLS and revokes `anon` and `authenticated` access on
all outreach tables. The current app accesses them only from server components
and route handlers. If browser access is introduced later, add narrowly scoped
RLS policies before granting Data API permissions.

The original Prisma migrations remain under `prisma/migrations` for lineage.
Use `supabase/migrations` as the deployment source of truth going forward.
