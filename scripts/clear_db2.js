import pkg from 'pg';
const { Client } = pkg;

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

const configs = [
  // Connection pooler (transaction mode) - port 6543
  { host: 'ytvdxqccjqwhzvempjco.supabase.co', port: 6543, ssl: { rejectUnauthorized: false } },
  // Direct connection - port 5432
  { host: 'ytvdxqccjqwhzvempjco.supabase.co', port: 5432, ssl: { rejectUnauthorized: false } },
];

async function main() {
  for (const cfg of configs) {
    const client = new Client({
      host: cfg.host,
      database: 'postgres',
      user: 'postgres',
      password: dbPassword,
      port: cfg.port,
      ssl: cfg.ssl,
      connectionTimeoutMillis: 15000,
      keepAlive: false,
    });

    try {
      console.log(`Tentando ${cfg.host}:${cfg.port}...`);
      await client.connect();
      console.log(`Conectado!`);

      const res = await client.query('SELECT current_database(), version()');
      console.log(`DB: ${res.rows[0].current_database}`);
      console.log(`PG: ${res.rows[0].version}`);

      for (const table of tablesToClear) {
        const r = await client.query(`DELETE FROM public.${table}`);
        console.log(`  ${table}: ${r.rowCount} registro(s) deletado(s)`);
      }

      console.log('\nConcluido!');
      await client.end();
      return;
    } catch (err) {
      console.log(`  Erro: ${err.message}`);
      try { await client.end(); } catch(e) {}
    }
  }
  console.log('\nNao foi possivel conectar via TCP direto.');
  console.log('Tentando via tunnel/psql...');
}

main().catch(console.error);
