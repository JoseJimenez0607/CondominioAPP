require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool = {
  query: async (text, params) => {
    const { data, error } = await supabase.rpc('exec_sql', {
      query_text: text,
      query_params: params ? params.map(String) : []
    });
    if (error) { throw Object.assign(new Error(error.message), error); }
    return { rows: Array.isArray(data) ? data : (data ? [data] : []), rowCount: Array.isArray(data) ? data.length : 0 };
  },
  connect: async () => ({ query: pool.query, release: () => {} })
};

async function testConnection() {
  const { data, error } = await supabase.from('condominios').select('id').limit(1);
  if (error) { throw Object.assign(new Error(error.message), error); }
  console.log(`✅ Supabase conectado — ${process.env.SUPABASE_URL}`);
}

module.exports = { pool, testConnection, supabase };
