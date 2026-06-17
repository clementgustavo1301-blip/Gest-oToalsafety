import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Get the Sal Garça group
  const { data: garcaGroups, error: gErr } = await supabase.from('groups').select('*').ilike('name', 'Sal Garça');
  if (gErr || !garcaGroups || garcaGroups.length === 0) {
      console.error('Group Sal Garça not found!', gErr);
      return;
  }
  const garcaGroupId = garcaGroups[0].id;

  // 2. Get the companies in Sal Garça group
  const { data: garcaCompanies } = await supabase.from('companies').select('*').eq('group_id', garcaGroupId);
  console.log(`Found ${garcaCompanies.length} companies in Sal Garça group:`, garcaCompanies.map(c => c.name));

  // 3. Define the checklist
  const items = ['PGR (NR-1)', 'PCMSO (NR-7)', 'LTCAT', 'AET (NR-17)', 'PCA & PPR', 'Fatores Psicossociais', 'Gestão de CIPA (NR-5)', 'Palestras & SIPAT', 'Exames Clínicos', 'Exames Complementares', 'Evento S-2210', 'Evento S-2220', 'Evento S-2240', 'Sistemas e Suporte Adicional'];
  const feitos = ['PGR (NR-1)', 'PCMSO (NR-7)', 'LTCAT', 'AET (NR-17)', 'Fatores Psicossociais', 'Exames Clínicos', 'Exames Complementares', 'Evento S-2210', 'Evento S-2220', 'Evento S-2240', 'Gestão de CIPA (NR-5)'];

  // 4. Get existing deliverables for these companies to avoid duplicates
  const { data: existingDeliverables } = await supabase.from('deliverables').select('*').in('company_id', garcaCompanies.map(c => c.id));

  // 5. Insert or update deliverables
  for (const item of items) {
    const isFeito = feitos.includes(item);
    const status = isFeito ? 'entregue' : 'pendente';
    
    for (const comp of garcaCompanies) {
      const exists = existingDeliverables.find(d => d.company_id === comp.id && d.title === item);
      if (exists) {
        if (status === 'entregue' && exists.status !== 'entregue') {
           await supabase.from('deliverables').update({ status: 'entregue' }).eq('id', exists.id);
        }
      } else {
        await supabase.from('deliverables').insert({
          company_id: comp.id,
          title: item,
          status: status,
          type: 'documento',
          due_date: '2024-12-31'
        });
      }
    }
  }
  console.log('Inserted deliverables for Sal Garça companies.');

  // 6. Get "Grupo Refinaria"
  const { data: refGroups } = await supabase.from('groups').select('*').ilike('name', 'Grupo Refinaria');
  if (refGroups && refGroups.length > 0) {
      const refGroupId = refGroups[0].id;
      
      // Delete companies in Grupo Refinaria
      const { data: refComps } = await supabase.from('companies').select('*').eq('group_id', refGroupId);
      for (const rc of refComps) {
          // cascade delete usually handles deliverables, but we can explicitly delete deliverables just in case
          await supabase.from('deliverables').delete().eq('company_id', rc.id);
          await supabase.from('companies').delete().eq('id', rc.id);
          console.log(`Deleted company ${rc.name}`);
      }

      // Delete the group itself
      await supabase.from('groups').delete().eq('id', refGroupId);
      console.log('Deleted Grupo Refinaria.');
  }

  console.log('All done!');
}
run();
