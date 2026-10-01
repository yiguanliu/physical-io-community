-- Admin tickets: community operators and special guests attend in person without taking a guest seat.
-- Their badge role (Organiser, Helper, Special guest) is stored in the existing category column.
alter table public.event_registrations drop constraint if exists event_registrations_attendance_check;
alter table public.event_registrations add constraint event_registrations_attendance_check
  check (attendance in ('in_person','online','admin','not_going'));
