-- Seed existing players with random data
update public.profiles
set
  birth_date = (
    current_date - interval '1 year' * (floor(random() * 30 + 18)::int)
    - interval '1 day' * (floor(random() * 364)::int)
  )::date,
  weight = round((random() * 40 + 60)::numeric, 1),
  dominant_foot = (array['DIREITO', 'ESQUERDO', 'AMBOS'])[floor(random() * 3 + 1)]
where birth_date is null;
