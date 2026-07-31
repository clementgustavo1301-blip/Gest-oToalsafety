import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseISO, startOfDay } from 'date-fns';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: deliverables, error } = await supabase.from('deliverables').select('*');
  const today = startOfDay(new Date());

  const vencidosValidity = deliverables.filter(d => {
    // A interface usa validityDate, independente do status!
    const validity = d.validity_date ? new Date(d.validity_date + 'T00:00:00') : null;
    const isOverdue = validity ? validity < today : false;
    return isOverdue; // (Wait, is it filtered by type in the UI screenshot? The filter says "Todos os tipos" in the UI screenshot! Ah!)
  });

  const vencidosPrograma = deliverables.filter(d => {
    if (d.type !== 'programa') return false;
    const validity = d.validity_date ? new Date(d.validity_date + 'T00:00:00') : null;
    const isOverdue = validity ? validity < today : false;
    return isOverdue;
  });

  console.log(`Vencidos (Todos os tipos): ${vencidosValidity.length}`);
  console.log(`Vencidos (Programas): ${vencidosPrograma.length}`);
}

test();
