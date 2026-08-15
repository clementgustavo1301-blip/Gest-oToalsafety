const { Client } = require('pg');

const conn = 'postgresql://postgres.uqwdepwqrrwzwesfysbz:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function migrateRegion() {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Trying:', conn.split('@')[1]);
    await client.connect();
    console.log('SUCCESS with host:', conn.split('@')[1]);
    await client.query(`
      ALTER TABLE public.companies 
      ADD COLUMN IF NOT EXISTS region text DEFAULT 'Natal';
    `);
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log('✅ TABLE ALTERED AND SCHEMA RELOADED!');
  } catch (e) {
    console.log('Failed:', e.message);
  } finally {
    await client.end().catch(() => {});
  }
}

migrateRegion();
