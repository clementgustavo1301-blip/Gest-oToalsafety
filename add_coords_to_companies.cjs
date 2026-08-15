const { Client } = require('pg');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@db.uqwdepwqrrwzwesfysbz.supabase.co:5432/postgres';

async function run() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    const query = `
      ALTER TABLE public.companies 
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
    `;
    console.log('Executing query...');
    await client.query(query);
    console.log('Columns added successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
