-- Historical remote migration marker.
--
-- The hosted project recorded the member import as four one-shot migration
-- chunks before the import was consolidated into supabase/seed.sql. Keep this
-- version locally so Supabase CLI migration history matches the remote ledger
-- without duplicating private member data in migration files.
select 1;
