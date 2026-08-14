create extension if not exists pgcrypto;

create table if not exists public.members (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  email_normalized text not null,
  full_name text not null,
  first_name text not null,
  city text not null default '',
  professional_role text not null default '',
  experience_range text not null default '',
  website_url text not null default '',
  linkedin_url text not null default '',
  suggestions text not null default '',
  status text not null default 'active',
  email_status text not null default 'ok',
  source text not null default 'manual',
  source_row text,
  notes text not null default '',
  unsubscribe_token text not null default encode(gen_random_bytes(24), 'hex'),
  last_contacted_at timestamptz,
  signed_up_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists members_email_normalized_idx on public.members (email_normalized);
create index if not exists members_status_idx on public.members (status);
create index if not exists members_city_idx on public.members (city);

create table if not exists public.member_interests (
  id text primary key default gen_random_uuid()::text,
  member_id text not null references public.members(id) on delete cascade,
  kind text not null default 'work_area',
  interest text not null
);

create index if not exists member_interests_member_idx on public.member_interests (member_id);
create index if not exists member_interests_kind_idx on public.member_interests (kind);
create unique index if not exists member_interests_member_kind_interest_idx
  on public.member_interests (member_id, kind, interest);

create table if not exists public.subscriptions (
  id text primary key default gen_random_uuid()::text,
  member_id text not null references public.members(id) on delete cascade,
  channel text not null default 'email',
  topic text not null,
  status text not null default 'consent_unknown',
  consent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_member_channel_topic_idx
  on public.subscriptions (member_id, channel, topic);

create table if not exists public.community_events (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null default '',
  venue text not null default '',
  starts_at timestamptz not null,
  status text not null default 'draft',
  registration_url text not null default '',
  registered_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null default 'newsletter',
  status text not null default 'draft',
  subject text not null,
  preview_text text not null default '',
  from_name text not null default 'Physical I/O',
  reply_to text not null default '',
  body text not null default '',
  audience_filter jsonb not null default '{}'::jsonb,
  event_id text references public.community_events(id) on delete set null,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by_user_id text,
  created_by_name text not null default '',
  idempotency_key text not null unique,
  recipient_count integer not null default 0,
  skip_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_event_idx on public.campaigns (event_id);

create table if not exists public.campaign_recipients (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  member_id text references public.members(id) on delete set null,
  email text not null,
  name text not null default '',
  status text not null default 'pending',
  skip_reason text,
  provider_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campaign_recipients_campaign_idx on public.campaign_recipients (campaign_id);
create index if not exists campaign_recipients_member_idx on public.campaign_recipients (member_id);
create unique index if not exists campaign_recipients_provider_idx
  on public.campaign_recipients (provider_id)
  where provider_id is not null;

create table if not exists public.campaign_events (
  id text primary key default gen_random_uuid()::text,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  recipient_id text references public.campaign_recipients(id) on delete set null,
  type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists campaign_events_provider_event_idx
  on public.campaign_events (provider_event_id)
  where provider_event_id is not null;
create index if not exists campaign_events_campaign_idx on public.campaign_events (campaign_id);
create index if not exists campaign_events_recipient_idx on public.campaign_events (recipient_id);

create table if not exists public.organisations (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  website text not null default '',
  industry text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id text primary key default gen_random_uuid()::text,
  organisation_id text not null references public.organisations(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists contacts_org_idx on public.contacts (organisation_id);

create table if not exists public.leads (
  id text primary key default gen_random_uuid()::text,
  organisation_id text not null references public.organisations(id) on delete cascade,
  contact_id text references public.contacts(id) on delete set null,
  status text not null default 'research',
  fit_score integer not null default 50,
  estimated_value_gbp integer not null default 0,
  owner_name text not null default '',
  next_action text not null default '',
  next_action_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_organisation_idx on public.leads (organisation_id);
create index if not exists leads_contact_idx on public.leads (contact_id);

create table if not exists public.lead_activities (
  id text primary key default gen_random_uuid()::text,
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null,
  title text not null,
  detail text not null default '',
  created_by_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_idx on public.lead_activities (lead_id);

create table if not exists public.outreach_messages (
  id text primary key default gen_random_uuid()::text,
  lead_id text not null references public.leads(id) on delete cascade,
  status text not null default 'draft',
  subject text not null,
  body text not null,
  to_email text not null,
  to_name text not null default '',
  provider_id text,
  sent_at timestamptz,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_messages_lead_idx on public.outreach_messages (lead_id);

create table if not exists public.audit_log (
  id text primary key default gen_random_uuid()::text,
  actor_user_id text,
  actor_name text not null default '',
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'members',
    'member_interests',
    'subscriptions',
    'community_events',
    'campaigns',
    'campaign_recipients',
    'campaign_events',
    'organisations',
    'contacts',
    'leads',
    'lead_activities',
    'outreach_messages',
    'audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end $$;
