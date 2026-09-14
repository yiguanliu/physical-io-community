-- OHI public display content. Only the authenticated server API can write.
create table public.ohi_display_playlist (
  id integer primary key check (id = 1),
  version integer not null default 0 check (version >= 0),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= 20),
  updated_at timestamptz not null default now()
);
alter table public.ohi_display_playlist enable row level security;
revoke all on public.ohi_display_playlist from public, anon, authenticated;
grant select, update on public.ohi_display_playlist to service_role;

insert into public.ohi_display_playlist (id, messages) values (1, '[{"id":"aa21e9f1-d7c2-43ab-a8ca-51128674fbe6","text":"#2 Physical I/O: Robotics\nWednesday 7 October\n18:00 - 21:00","duration":18,"speed":10,"enabled":true}]'::jsonb);
