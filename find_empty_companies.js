import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findEmptyCompanies() {
  const { data: companies, error: cErr } = await supabase.from('companies').select('id, name');
  if (cErr) { console.error(cErr); return; }
  
  const { data: deliverables, error: dErr } = await supabase.from('deliverables').select('company_id');
  if (dErr) { console.error(dErr); return; }
  
  const compWithDelivs = new Set(deliverables.map(d => d.company_id));
  
  const emptyCompanies = companies.filter(c => !compWithDelivs.has(c.id));
  
  console.log(`Found ${emptyCompanies.length} companies with NO deliverables:`);
  emptyCompanies.forEach(c => console.log('- ' + c.name));
}
findEmptyCompanies();
