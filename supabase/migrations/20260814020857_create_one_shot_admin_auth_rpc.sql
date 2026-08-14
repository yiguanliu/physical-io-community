-- Historical remote migration marker.
--
-- The hosted project temporarily used public.create_admin_auth_account(text,
-- text, text) for initial admin setup. That helper was dropped in
-- 20260814021001_drop_one_shot_import_rpcs.sql, so the final schema does not
-- require recreating it for fresh environments.
select 1;
