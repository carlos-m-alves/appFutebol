import pkg from 'pg';
const { Client } = pkg;

const hosts = [
  'db.ytvdxqccjqwhzvempjco.supabase.co',
  'ytvdxqccjqwhzvempjco.supabase.co',
];

const dbPassword = 'P4s8d9r6@@@';

const tablesToClear = [
  'voter_penalties',
  'match_awards',
  'player_ratings',
  'match_results',
  'match_players',
  'teams',
  'match_confirmations',
  'matches',
  'recurring_schedules',
  'courts',
];

async function tryConnect(host, port) {
  const client = new Client({
    host,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    port,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

async function main() {
  for (const host of hosts) {
    for (const port of [5432, 6543]) {
      try {
        console.log(`Tentando ${host}:${port}...`);
        const client = await tryConnect(host, port);
        console.log(`Conectado em ${host}:${port}`);

        // Verify connection
        const ver = await client.query('SELECT version()');
        console.log(`Postgres: ${ver.rows[0].version}`);

        for (const table of tablesToClear) {
          console.log(`Limpando ${table}...`);
          const res = await client.query(`DELETE FROM ${table}`);
          console.log(`  OK - ${res.rowCount} registro(s)`);
        }

        console.log('\nTodas as tabelas foram limpas.');
        await client.end();
        return;
      } catch (err) {
        console.log(`  Falha: ${err.message}`);
      }
    }
  }
  console.log('\nNao foi possivel conectar. Tentando via Supabase SQL endpoint...');
}

main().catch(console.error);
