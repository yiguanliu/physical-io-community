-- Ticket confirmation emails: one per ticket type (in person / online), with the label image link.
alter table public.event_registrations add column if not exists ticket_emailed_attendance text;
alter table public.event_registrations add column if not exists ticket_emailed_at timestamptz;
alter table public.event_registrations add column if not exists ticket_image_url text not null default '';
