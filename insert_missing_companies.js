import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const missingCompanies = [
  { name: 'Refinaria de Sal Garça Ltda.', cnpj: '08.563.842/0001-90' },
  { name: 'Holanda Serviços Salineiros Ltda.', cnpj: '00.000.000/0000-00' }
];

async function run() {
  const { data: groupData, error: grpErr } = await supabase.from('groups').insert({ name: 'Grupo Refinaria' }).select().single();
  if (grpErr) {
     console.error('Error creating group', grpErr);
     return;
  }
  const groupId = groupData.id;

  for (const c of missingCompanies) {
    console.log('Inserting', c.name);
    const { error } = await supabase.from('companies').insert({
      name: c.name,
      cnpj: c.cnpj,
      phone: '',
      group_id: groupId
    });
    if (error) console.error('Error inserting', c.name, error);
  }
  console.log('Done!');
}
run();
