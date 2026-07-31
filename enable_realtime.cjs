const { Client } = require('pg');

const connectionString = 'postgresql://postgres.uqwdepwqrrwzwesfysbz:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function enableRealtime() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE user_links;');
    console.log('Realtime enabled for user_links.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

enableRealtime();
