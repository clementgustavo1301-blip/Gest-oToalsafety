const { Client } = require('pg');
const fs = require('fs');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function applySchema() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    const schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');
    console.log('Executing schema.sql...');
    await client.query(schemaSql);
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error applying schema:', err);
  } finally {
    await client.end();
  }
}

applySchema();
