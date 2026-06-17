import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContracts() {
  const { data: garcaGroups } = await supabase.from('groups').select('*').ilike('name', 'Sal Garça');
  if (garcaGroups && garcaGroups.length > 0) {
     const { data: garcaCompanies } = await supabase.from('companies').select('*').eq('group_id', garcaGroups[0].id);
     for (const comp of garcaCompanies) {
        const { data: contracts } = await supabase.from('contracts').select('*').eq('company_id', comp.id);
        console.log(`Contracts for ${comp.name}:`, contracts);
     }
  }
}
checkContracts();
