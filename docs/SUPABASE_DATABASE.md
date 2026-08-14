# Supabase Database

The Supabase schema lives in `supabase/migrations/20260814000000_admin_workspace.sql`.
It mirrors the admin workspace data model for members, interests, subscriptions,
campaigns, events, sponsor outreach, and audit logs.

## Apply The Migration

Use the Supabase SQL editor or CLI against project `dozeanhsgkjztmewtlqd`:

```bash
supabase db push
```

If you are using the SQL editor, run the migration SQL first, then run
`supabase/seed.sql`.

## Seeded Signup Data

The seed file imports the Google Form responses from
`lib/db/fixtures/signup-responses.csv`.

Cleaning rules applied before import:

- lower-case and trim email addresses
- trim names, roles, links, and notes
- normalize `london` / `London ` to `London`
- convert Google Sheets dates to UTC ISO timestamps
- split work areas, community goals, and event formats into structured interest rows
- merge duplicate email rows, keeping earliest signup time and merging later answers

Input count: 101 raw rows.
Imported count: 99 cleaned members.
Rejected rows: 0.

The cleaned CSV is available at `supabase/seeds/signup_members_cleaned.csv`.
A collaboration copy is also in `.context/supabase/signup_members_cleaned.csv`.

## Security

All public tables created by the migration have RLS enabled. No `anon` or
`authenticated` policies are created because this dataset contains private member
PII. Server-side admin code should use `SUPABASE_SECRET_KEY` or a legacy
`SUPABASE_SERVICE_ROLE_KEY`, never a `NEXT_PUBLIC_` key.
