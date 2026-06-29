-- Add position column to profiles table
alter table public.profiles add column if not exists position text
  check (position in ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'MEIO_CAMPO', 'ATACANTE'));

-- Assign random positions to existing profiles
update public.profiles
set position = (array['GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'MEIO_CAMPO', 'ATACANTE'])[floor(random() * 5 + 1)]
where position is null;
