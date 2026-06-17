import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: companies, error } = await supabase.from('companies').select('*');
  if (error) { console.error('Error fetching companies:', error); return; }

  const targetNames = ['Garça', 'Garca', 'Refinaria', 'Fruta', 'FA', 'F.A'];
  companies.forEach(c => {
    for (const t of targetNames) {
      if (c.name.toLowerCase().includes(t.toLowerCase())) {
         console.log('Found in DB:', c.name);
         break;
      }
    }
  });
}
run();
