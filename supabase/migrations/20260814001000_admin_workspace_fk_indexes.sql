create index if not exists campaigns_event_idx on public.campaigns (event_id);
create index if not exists campaign_recipients_member_idx on public.campaign_recipients (member_id);
create index if not exists campaign_events_recipient_idx on public.campaign_events (recipient_id);
create index if not exists leads_organisation_idx on public.leads (organisation_id);
create index if not exists leads_contact_idx on public.leads (contact_id);
