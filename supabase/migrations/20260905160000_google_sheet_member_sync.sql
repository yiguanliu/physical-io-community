-- Server-only source snapshots; never exposes member data via the Data API.
create table if not exists public.member_sheet_sources (
  spreadsheet_id text not null,
  sheet_id bigint not null,
  email_normalized text not null,
  member_id text not null references public.members(id) on delete cascade,
  snapshot jsonb not null default '{}',
  captured_at bigint not null,
  updated_at timestamptz not null default now(),
  primary key(spreadsheet_id,sheet_id,email_normalized)
);
alter table public.member_sheet_sources enable row level security;
revoke all on public.member_sheet_sources from anon, authenticated;
