-- Server-only delivery queue: no member data is exposed to public clients.
create schema if not exists private;
create table if not exists private.join_notifications (
 id uuid primary key default gen_random_uuid(),
 member_id text not null references public.members(id) on delete cascade,
 recipient text not null check (recipient in ('soul@physical-io.com','anthony@physical-io.com')),
 status text not null default 'pending' check(status in ('pending','sent','review')),
 attempts integer not null default 0,
 provider_id text,
 created_at timestamptz not null default now(),
 next_attempt_at timestamptz not null default now(),
 sent_at timestamptz,
 unique(member_id,recipient)
);
alter table private.join_notifications enable row level security;
revoke all on private.join_notifications from public, anon, authenticated;
create index if not exists join_notifications_due on private.join_notifications(next_attempt_at) where status='pending';
create table if not exists private.join_rate_limits (
 key text primary key,
 started_at timestamptz not null default now(),
 attempts integer not null default 1
);
alter table private.join_rate_limits enable row level security;
revoke all on private.join_rate_limits from public, anon, authenticated;
