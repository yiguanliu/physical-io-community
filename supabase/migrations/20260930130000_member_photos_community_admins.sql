-- Member headshots (uploaded only after email verification) and certified community admins.
alter table public.members add column if not exists photo_url text not null default '';
alter table public.members add column if not exists community_admin boolean not null default false;
create index if not exists members_community_admin_idx on public.members (community_admin) where community_admin;
