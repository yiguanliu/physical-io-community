-- Historical remote migration marker.
--
-- The hosted project temporarily used public.import_signup_members_payload(text)
-- for the initial signup import. That helper was dropped in
-- 20260814021001_drop_one_shot_import_rpcs.sql, so the final schema does not
-- require recreating it for fresh environments.
select 1;
