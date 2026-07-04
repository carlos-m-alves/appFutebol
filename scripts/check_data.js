const SUPABASE_URL = 'https://ytvdxqccjqwhzvempjco.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dmR4cWNjanF3aHp2ZW1wamNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjY2NzYsImV4cCI6MjA5NzE0MjY3Nn0.ive8-FWXl8OQlJ4srAIj_8NDKPP1UWAjhG81UKEJoG8';

const tables = [
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
  'profiles',
  'groups',
  'group_members',
  'group_join_requests',
];

async function checkTables() {
  for (const table of tables) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=count&limit=0`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Accept': 'application/json',
      },
    });
    if (res.ok) {
      // Try with prefer count
      const url2 = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
      const res2 = await fetch(url2, {
        method: 'HEAD',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Prefer': 'count=exact',
        },
      });
      const count = res2.headers.get('content-range') || res2.headers.get('x-total-count') || 'unknown';
      console.log(`${table}: ${count}`);
    } else {
      const text = await res.text();
      console.log(`${table}: ${res.status} ${text}`);
    }
  }
}

checkTables().catch(console.error);
