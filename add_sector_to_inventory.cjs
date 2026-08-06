const { Client } = require('pg');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@db.uqwdepwqrrwzwesfysbz.supabase.co:5432/postgres';

async function addSectorColumn() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    const query = `
      ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sector TEXT DEFAULT 'Clínica';
    `;
    console.log('Executing query...');
    await client.query(query);
    console.log('Column added successfully!');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

addSectorColumn();
