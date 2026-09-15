-- Run in the production Supabase SQL editor after deploying /api/email/worker.
-- First store the application's existing CRON_SECRET in Vault as
-- physical_io_campaign_worker_secret (use Vault UI; do not commit the value).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('physical-io-campaign-worker', '* * * * *', $job$
 select net.http_post(
  url := 'https://www.physical-io.com/api/email/worker',
  headers := jsonb_build_object('Content-Type','application/json','Authorization',
   'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='physical_io_campaign_worker_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 290000
 ) where exists (
  select 1 from public.campaigns c where c.status='sending'
   and exists(select 1 from public.audit_log a where a.entity_id=c.id and a.action='campaign.queued')
 ) and exists(select 1 from vault.decrypted_secrets where name='physical_io_campaign_worker_secret');
$job$);
