process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs   = require('fs');
const path = require('path');
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '../../../database/migrations');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Crear tabla de control de migraciones si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Obtener migraciones ya aplicadas
    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.map(r => r.filename));

    // Leer archivos .sql ordenados
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  ${file} — ya aplicada`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)', [file]
        );
        await client.query('COMMIT');
        console.log(`✅ ${file} — aplicada`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error en ${file}:`, err.message);
        process.exit(1);
      }
    }

    console.log(`\n🎉 ${count} migración(es) aplicada(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);
