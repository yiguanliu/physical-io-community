-- Proposals may have an unconfirmed date. Existing dates and public status remain unchanged.
alter table public.community_events alter column starts_at drop not null;
create table public.event_initiatives (
 event_id text primary key references public.community_events(id) on delete cascade,
 stage text not null default 'proposed' check(stage in ('proposed','planning','action_plan','in_progress','completed','retrospective','improved')),
 archived boolean not null default false,
 version integer not null default 1,
 studio jsonb not null default '{}'::jsonb,
 history jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.event_initiatives enable row level security;
revoke all on public.event_initiatives from anon, authenticated;
grant all on public.event_initiatives to service_role;
