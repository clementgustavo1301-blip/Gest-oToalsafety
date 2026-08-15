const { Client } = require('pg');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function addRegionColumn() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    await client.query(`
      ALTER TABLE public.companies 
      ADD COLUMN IF NOT EXISTS region text DEFAULT 'Natal';
    `);
    console.log('Column "region" added to "companies" table successfully!');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

addRegionColumn();
