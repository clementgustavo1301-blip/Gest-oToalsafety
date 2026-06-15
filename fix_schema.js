import pg from 'pg';
const { Client } = pg;

// Using the direct database connection (port 5432) instead of the pooler (6543)
const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@db.uqwdepwqrrwzwesfysbz.supabase.co:5432/postgres';

async function fixDatabaseSchema() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado ao banco de dados pelo Node.js diretamente (Porta 5432)!');

    console.log('Adicionando coluna file_path na tabela contracts (se não existir)...');
    await client.query(`ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_path TEXT;`);
    
    console.log('Adicionando coluna file_name na tabela deliverables (se não existir)...');
    await client.query(`ALTER TABLE public.deliverables ADD COLUMN IF NOT EXISTS file_name TEXT;`);

    // Reload the schema cache for PostgREST to recognize the new columns immediately
    console.log('Atualizando o cache de schema do Supabase...');
    await client.query(`NOTIFY pgrst, 'reload schema';`);

    console.log('✅ Banco de dados corrigido com sucesso via Node!');
  } catch (err) {
    console.error('❌ Erro ao corrigir o banco:', err.message);
  } finally {
    await client.end();
  }
}

fixDatabaseSchema();
