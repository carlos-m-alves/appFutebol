import pg from 'pg'

const { Pool } = pg

const password = encodeURIComponent('P4s8d9r6@@@')
const connString = `postgresql://postgres:${password}@db.ytvdxqccjqwhzvempjco.supabase.co:5432/postgres`

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false },
})

async function main() {
  const client = await pool.connect()
  try {
    console.log('Conectado. Deletando dados...')
    await client.query('delete from public.match_awards')
    console.log('  match_awards OK')
    await client.query('delete from public.player_ratings')
    console.log('  player_ratings OK')
    await client.query('delete from public.match_confirmations')
    console.log('  match_confirmations OK')
    await client.query('delete from public.match_results')
    console.log('  match_results OK')
    await client.query('delete from public.match_players')
    console.log('  match_players OK')
    await client.query('delete from public.teams')
    console.log('  teams OK')
    await client.query('delete from public.matches')
    console.log('  matches OK')
    await client.query('delete from public.recurring_schedules')
    console.log('  recurring_schedules OK')
    console.log('Todos os dados de partidas foram deletados!')
  } catch (err) {
    console.error('Erro:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

main()
