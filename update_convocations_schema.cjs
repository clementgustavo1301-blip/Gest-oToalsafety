const { Client } = require('pg');

const connectionString = 'postgresql://postgres.uqwdepwqrrwzwesfysbz:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function applySchema() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    const schemaSql = `
      CREATE TABLE IF NOT EXISTS public.convocations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
          year INTEGER NOT NULL,
          jan BOOLEAN DEFAULT false,
          feb BOOLEAN DEFAULT false,
          mar BOOLEAN DEFAULT false,
          apr BOOLEAN DEFAULT false,
          may BOOLEAN DEFAULT false,
          jun BOOLEAN DEFAULT false,
          jul BOOLEAN DEFAULT false,
          aug BOOLEAN DEFAULT false,
          sep BOOLEAN DEFAULT false,
          oct BOOLEAN DEFAULT false,
          nov BOOLEAN DEFAULT false,
          dec BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(company_id, year)
      );

      DROP TRIGGER IF EXISTS handle_updated_at_convocations ON public.convocations;
      CREATE TRIGGER handle_updated_at_convocations BEFORE UPDATE ON public.convocations
        FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

      ALTER TABLE public.convocations ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.convocations;
      CREATE POLICY "Enable read access for authenticated users" ON public.convocations FOR SELECT TO authenticated USING (true);
      
      DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.convocations;
      CREATE POLICY "Enable insert for authenticated users" ON public.convocations FOR INSERT TO authenticated WITH CHECK (true);
      
      DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.convocations;
      CREATE POLICY "Enable update for authenticated users" ON public.convocations FOR UPDATE TO authenticated USING (true);
      
      DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.convocations;
      CREATE POLICY "Enable delete for authenticated users" ON public.convocations FOR DELETE TO authenticated USING (true);
    `;
    
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
