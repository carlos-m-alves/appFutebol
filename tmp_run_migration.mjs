import pg from 'pg';
const { Client } = pg;
const client = new Client({
  host: 'db.ytvdxqccjqwhzvempjco.supabase.co',
  database: 'postgres',
  user: 'postgres',
  password: 'P4s8d9r6@@@',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});
await client.connect();
await client.query(`
  alter table public.profiles add column if not exists position text
    check (position in ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'MEIO_CAMPO', 'ATACANTE'));
  update public.profiles
  set position = (array['GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'MEIO_CAMPO', 'ATACANTE'])[floor(random() * 5 + 1)]
  where position is null;
`);
console.log('Migration applied successfully');
await client.end();
