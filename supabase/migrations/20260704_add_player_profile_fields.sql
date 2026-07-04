-- Add birth_date, weight, dominant_foot to profiles
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists weight numeric(5,2),
  add column if not exists dominant_foot text check (dominant_foot in ('DIREITO', 'ESQUERDO', 'AMBOS'));

-- Update handle_new_user to include new fields from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, name, email, avatar_url, birth_date, weight, dominant_foot)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    (new.raw_user_meta_data ->> 'birth_date')::date,
    (new.raw_user_meta_data ->> 'weight')::numeric,
    new.raw_user_meta_data ->> 'dominant_foot'
  );
  return new;
end;
$$;
