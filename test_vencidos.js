import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseISO, startOfDay } from 'date-fns';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: deliverables, error } = await supabase.from('deliverables').select('*');
  const today = startOfDay(new Date());

  const vencidosValidity = deliverables.filter(d => {
    if (d.type !== 'programa') return false;
    if (d.status === 'entregue' || d.status === 'feito' || d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
    if (!d.validity_date) return false;
    const vDate = parseISO(d.validity_date);
    return vDate < today;
  });

  const vencidosDueDate = deliverables.filter(d => {
    if (d.type !== 'programa') return false;
    if (d.status === 'entregue' || d.status === 'feito' || d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
    if (!d.due_date) return false;
    const dDate = parseISO(d.due_date);
    return dDate < today;
  });

  console.log(`Vencidos por validity_date (app logic): ${vencidosValidity.length}`);
  console.log(`Vencidos por due_date: ${vencidosDueDate.length}`);
}

test();
