-- Event RSVP: Luma guest lists, attendance choices, printable tickets and public member profiles.
-- Guest rows never create members or subscriptions; a Luma registration is not marketing consent.

create table if not exists public.event_settings (
 event_slug text primary key,
 in_person_capacity integer not null default 0 check (in_person_capacity >= 0),
 updated_by_name text not null default '',
 updated_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
 id text primary key default gen_random_uuid()::text,
 event_slug text not null,
 email text not null,
 email_normalized text not null,
 full_name text not null default '',
 first_name text not null default '',
 last_name text not null default '',
 organisation text not null default '',
 job_title text not null default '',
 linkedin_url text not null default '',
 motivation text not null default '',
 luma_guest_id text,
 luma_status text not null default 'approved',
 luma_registered_at timestamptz,
 attendance text check (attendance in ('in_person','online','not_going')),
 category text not null default '',
 ticket_slug text unique,
 -- Bearer secret held in the attendee's httpOnly cookie; never rendered.
 owner_token text not null default encode(gen_random_bytes(24),'hex'),
 member_id text references public.members(id) on delete set null,
 rsvp_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (event_slug, email_normalized)
);
create index if not exists event_registrations_attendance_idx on public.event_registrations (event_slug, attendance);
create index if not exists event_registrations_member_idx on public.event_registrations (member_id);

-- Event emails reuse the campaign pipeline; guests who are not members are addressed by registration.
alter table public.campaign_recipients add column if not exists registration_id text references public.event_registrations(id) on delete set null;
create index if not exists campaign_recipients_registration_idx on public.campaign_recipients (registration_id);

alter table public.members add column if not exists public_slug text;
alter table public.members add column if not exists company text not null default '';
alter table public.members add column if not exists job_title text not null default '';
alter table public.members add column if not exists bio text not null default '';
alter table public.members add column if not exists profile_public boolean not null default false;
create unique index if not exists members_public_slug_idx on public.members (public_slug);

alter table public.event_settings enable row level security;
alter table public.event_registrations enable row level security;
revoke all on public.event_settings from anon, authenticated;
revoke all on public.event_registrations from anon, authenticated;
grant all on public.event_settings to service_role;
grant all on public.event_registrations to service_role;

insert into public.event_settings (event_slug, in_person_capacity, updated_by_name)
values ('event-02-robotics', 70, 'Migration')
on conflict (event_slug) do nothing;
