const { Client } = require('pg');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function clearDeliverables() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    console.log('Clearing deliverables table...');
    await client.query('DELETE FROM public.deliverables;');
    console.log('Deliverables table cleared successfully!');
  } catch (err) {
    console.error('Error clearing deliverables:', err);
  } finally {
    await client.end();
  }
}

clearDeliverables();
