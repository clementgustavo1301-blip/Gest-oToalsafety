import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
  const { data: companies, error } = await supabase.from('companies').select('*').ilike('name', '%Garça%');
  if (error) console.error('Error fetching companies', error);
  console.log('Companies found:', companies);

  if (companies && companies.length > 0) {
    const { data: deliverables, err2 } = await supabase.from('deliverables').select('*').eq('company_id', companies[0].id);
    if (err2) console.error(err2);
    console.log(`Deliverables for ${companies[0].name}:`, deliverables.length);
  }
}
checkDb();
