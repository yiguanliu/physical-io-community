-- Categories are editorial types, separate from subject/topic tags.
create table public.content_categories (
 id text primary key default gen_random_uuid()::text,
 name text not null check (length(trim(name)) between 1 and 60),
 color text not null unique check (color ~ '^#[0-9a-f]{6}$'),
 created_at timestamptz not null default now()
);
create unique index content_categories_name_key on public.content_categories(lower(name));
alter table public.content_categories enable row level security;
revoke all on public.content_categories from anon, authenticated;
grant all on public.content_categories to service_role;
insert into public.content_categories(id,name,color) values
 ('editorial','Editorial','#8b5cf6'),('news','News','#0284c7'),('quotes','Quotes','#d97706');
alter table public.content_items add column category_id text not null default 'editorial' references public.content_categories(id);
alter table public.content_items add column featured boolean not null default false;
alter table public.content_items add column visual_document jsonb;
create index content_items_category_idx on public.content_items(category_id);
