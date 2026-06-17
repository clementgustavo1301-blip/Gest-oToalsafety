import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function determineType(title) {
  const t = title.toLowerCase();
  
  if (t.includes('visita') || t.includes('atendimento') || t.includes('apoio') || t.includes('inspeção') || t.includes('acompanhamento')) {
     return 'visita_tecnica';
  }
  
  if (t.includes('ltcat') || t.includes('ltip') || t.includes('aet') || t.includes('psicosso') || t.includes('laudo') || t.includes('diagnóstico') || t.includes('avcb')) {
     return 'laudo';
  }
  
  if (t.includes('treinamento') || t.includes('palestra') || t.includes('curso') || t.includes('sipat') || t.includes('ead') || t.includes('capacitaç')) {
     return 'treinamento';
  }
  
  if (t.includes('pgr') || t.includes('pcmso') || t.includes('pca') || t.includes('ppr') || t.includes('gestão') || t.includes('controle') || t.includes('plataforma') || t.includes('esocial') || t.includes('s-22') || t.includes('ppp') || t.includes('mapa') || t.includes('portal') || t.includes('monitoramento') || t.includes('sistemas') || t.includes('nuvem')) {
     return 'programa';
  }
  
  if (t.includes('exame') || t.includes('aso') || t.includes('atestado') || t.includes('cat') || t.includes('prontuário') || t.includes('notificação') || t.includes('aviso') || t.includes('ordem') || t.includes('ordens') || t.includes('demissional') || t.includes('rastreabilidade') || t.includes('entrega biométrica') || t.includes('comunicação')) {
     return 'documento';
  }
  
  return 'documento'; // default fallback
}

async function run() {
  const { data: deliverables, error } = await supabase.from('deliverables').select('id, title, type');
  if (error) {
     console.error(error); return;
  }
  
  console.log(`Found ${deliverables.length} deliverables.`);
  let updates = 0;
  for (const d of deliverables) {
     const newType = determineType(d.title);
     if (d.type !== newType) {
        await supabase.from('deliverables').update({ type: newType }).eq('id', d.id);
        updates++;
     }
  }
  console.log(`Updated ${updates} deliverables.`);
}
run();
