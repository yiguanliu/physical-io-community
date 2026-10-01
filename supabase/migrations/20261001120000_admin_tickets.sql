-- Admin tickets: community operators and special guests attend in person without taking a guest seat.
alter table public.event_registrations drop constraint if exists event_registrations_attendance_check;
alter table public.event_registrations add constraint event_registrations_attendance_check
  check (attendance in ('in_person','online','admin','not_going'));

-- Door check-in from the event dashboard; clearing it reverts the guest to not checked in.
alter table public.event_registrations add column if not exists checked_in_at timestamptz;
alter table public.event_registrations add column if not exists checked_in_by_name text not null default '';
