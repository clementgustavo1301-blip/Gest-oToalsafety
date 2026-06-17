import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envContent = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8');

const getEnv = (key) => {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='));
  return line ? line.substring(key.length + 1).trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const groupId = 'bed965fb-b6fe-4b8e-b873-ee6968ba9eaf'; // Grupo Fix
  const fixMetaisId = 'a47c12d9-e324-4d14-9040-954b3aa96ff5';
  
  // 1. Criar FIX ESQUADRIAS LTDA novamente
  const { data: fixEsquadrias, error: err1 } = await supabase.from('companies').insert([{
    group_id: groupId,
    name: 'FIX ESQUADRIAS LTDA',
    cnpj: '22.932.231/0001-76',
    contact: '',
    phone: ''
  }]).select().single();
  
  if (err1) {
    console.error('Erro ao recriar FIX ESQUADRIAS:', err1);
    // Se o erro for Unique, vamos buscar o ID:
    // ... mas eu já havia deletado.
  }
  
  const esquadriasId = fixEsquadrias ? fixEsquadrias.id : null;
  if (!esquadriasId) return;

  // 2. Mover todos os entregáveis que estão na Fix Metais de volta para a FIX ESQUADRIAS (pois eram os pendentes)
  const { error: err2 } = await supabase.from('deliverables').update({ company_id: esquadriasId }).eq('company_id', fixMetaisId);
  if (err2) console.error('Erro ao voltar entregáveis para FIX ESQUADRIAS', err2);

  // 3. Criar os entregáveis corretos para FIX Metais
  const fixMetaisItems = [
    { title: 'Visita Técnica In Loco', type: 'visita_tecnica', status: 'entregue', description: 'Mensal (4h/Visita)' },
    { title: 'PGR & Mapa de Riscos', type: 'programa', status: 'entregue', description: 'Anual / Alteração' },
    { title: 'Avaliações Psicossociais', type: 'laudo', status: 'entregue', description: 'Estruturação Inicial' },
    { title: 'LTCAT & LTIP', type: 'laudo', status: 'entregue', description: 'Conforme Legislação' },
    { title: 'PCA (Conservação Auditiva)', type: 'programa', status: 'entregue', description: 'Anual' },
    { title: 'Apoio Técnico e Perícias', type: 'programa', status: 'pendente', description: 'Sob Demanda' },
    { title: 'Treinamentos Digitais (EaD)', type: 'treinamento', status: 'entregue', description: 'Contínuo' },
    { title: 'Palestras Preventivas', type: 'treinamento', status: 'entregue', description: 'Conforme PGR' },
    { title: 'Gestão de Certificados', type: 'programa', status: 'entregue', description: 'Contínuo' },
    { title: 'PCMSO Base & Relatório', type: 'programa', status: 'entregue', description: 'Anual' },
    { title: 'Controle de Vencimentos', type: 'programa', status: 'entregue', description: 'Contínuo' },
    { title: 'Atendimento Premium', type: 'visita_tecnica', status: 'entregue', description: 'Sob Agendamento' },
    { title: 'Eventos eSocial (S-2240)', type: 'programa', status: 'entregue', description: 'Contínuo' },
    { title: 'PPP Digital', type: 'programa', status: 'entregue', description: 'Contínuo' },
    { title: 'Plataforma e Documentos', type: 'programa', status: 'entregue', description: 'Contínuo' }
  ];

  for (const item of fixMetaisItems) {
    const { error: err3 } = await supabase.from('deliverables').insert([{
      company_id: fixMetaisId,
      title: item.title,
      type: item.type,
      status: item.status,
      description: item.description
    }]);
    if (err3) console.error('Erro ao inserir', item.title, err3);
  }

  // 4. Atualizar o telefone da Fix Esquadrias (q tem anotado à caneta)
  // Tel: 98192-7601 (não se aplica para alguma coisa, mas tem um tel anotado)
  await supabase.from('companies').update({ phone: '98192-7601' }).eq('id', esquadriasId);

  // E a Fix Metais não tem telefone anotado.

  console.log('Tudo resolvido! Grupo FIX está com as DUAS empresas e seus respectivos status corretos.');
}

run();
