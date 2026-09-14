-- Follow-up product support for language exchange and explicit booking results.
-- Safe to apply after the initial Companio migrations.
alter table public.households drop constraint if exists valid_interests;
alter table public.households
  add constraint valid_interests check (
    interests <@ array[
      'coffee','walks','food','games','outdoors','culture','playground','exercise',
      'language_learning','practice_sv','practice_en','practice_de','practice_es',
      'practice_fr','practice_ar','practice_uk','practice_fi'
    ]
  );

alter table public.availability drop constraint if exists valid_availability_activity;
alter table public.availability
  add constraint valid_availability_activity check (
    activity in ('coffee','walks','food','games','outdoors','culture','playground','exercise','language_learning')
  );

alter table public.events drop constraint if exists valid_event_activity;
alter table public.events
  add constraint valid_event_activity check (
    activity in ('coffee','walks','food','games','outdoors','culture','playground','exercise','language_learning')
  );
