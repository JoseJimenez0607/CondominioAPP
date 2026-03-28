require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  console.log('Hash generado:', hash);

  const { error } = await s
    .from('usuarios')
    .update({ password_hash: hash })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.log('ERROR actualizando:', error.message);
    return;
  }

  const { data } = await s
    .from('usuarios')
    .select('email, password_hash')
    .eq('email', 'ana.rodriguez@gmail.com')
    .single();

  const ok = await bcrypt.compare('123456', data.password_hash);
  console.log('Hash en BD:', data.password_hash.slice(0, 20) + '...');
  console.log('Password ok:', ok);
}

main().then(() => process.exit(0));