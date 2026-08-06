const { Client } = require('pg');

const hosts = [
  'postgresql://postgres:1a2s3d4f5g6h7j8k9l@db.uqwdepwqrrwzwesfysbz.supabase.co:5432/postgres',
  'postgresql://postgres.uqwdepwqrrwzwesfysbz:1a2s3d4f5g6h7j8k9l@sa-east-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres.uqwdepwqrrwzwesfysbz:1a2s3d4f5g6h7j8k9l@sa-east-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres:1a2s3d4f5g6h7j8k9l@uqwdepwqrrwzwesfysbz.supabase.co:5432/postgres'
];

async function testHosts() {
  for (const conn of hosts) {
    const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
    try {
      console.log('Trying:', conn.split('@')[1]);
      await client.connect();
      console.log('SUCCESS with host:', conn.split('@')[1]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.cat_records (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMPTZ DEFAULT now(),
          protocol TEXT,
          company_name TEXT,
          company_cnpj TEXT,
          employee_name TEXT,
          employee_cpf TEXT,
          tp_cat TEXT,
          tp_acid TEXT,
          a_data DATE,
          a_hora TEXT,
          a_hrstrab TEXT,
          a_ultimodia DATE,
          afast TEXT,
          a_diasafast INT,
          a_retorno DATE,
          obito TEXT,
          a_dtobito DATE,
          policia TEXT,
          a_descricao TEXT,
          a_agente TEXT,
          a_natureza TEXT,
          l_tipo TEXT,
          l_cnpj_terceiro TEXT,
          l_rua TEXT,
          l_num TEXT,
          l_compl TEXT,
          l_bairro TEXT,
          l_cidade TEXT,
          l_uf TEXT,
          l_cep TEXT,
          l_especifico TEXT,
          p_parte TEXT,
          lateral TEXT,
          p_outras TEXT,
          m_data DATE,
          m_hora TEXT,
          m_unidade TEXT,
          m_unid_end TEXT,
          m_cnes TEXT,
          intern TEXT,
          m_cid TEXT,
          m_diag TEXT,
          m_durtrat INT,
          m_desclesao TEXT,
          m_medico TEXT,
          m_crm TEXT,
          m_crmuf TEXT,
          status TEXT DEFAULT 'Pendente'
        );
      `);
      await client.query(`ALTER TABLE public.cat_records ENABLE ROW LEVEL SECURITY;`);
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cat_records' AND policyname = 'Allow public insert cat_records') THEN
            CREATE POLICY "Allow public insert cat_records" ON public.cat_records FOR INSERT WITH CHECK (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cat_records' AND policyname = 'Allow select cat_records') THEN
            CREATE POLICY "Allow select cat_records" ON public.cat_records FOR SELECT USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cat_records' AND policyname = 'Allow update cat_records') THEN
            CREATE POLICY "Allow update cat_records" ON public.cat_records FOR UPDATE USING (true);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cat_records' AND policyname = 'Allow delete cat_records') THEN
            CREATE POLICY "Allow delete cat_records" ON public.cat_records FOR DELETE USING (true);
          END IF;
        END $$;
      `);
      await client.query(`NOTIFY pgrst, 'reload schema';`);
      console.log('✅ TABLE CREATED AND SCHEMA RELOADED!');
      await client.end();
      break;
    } catch (e) {
      console.log('Failed:', e.message);
      await client.end().catch(() => {});
    }
  }
}

testHosts();
