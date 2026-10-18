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

const STANDARD_DELIVERABLES = [
  { title: 'PGR', type: 'programa', description: 'Programa de Gerenciamento de Riscos (NR-1)' },
  { title: 'PCMSO', type: 'programa', description: 'Programa de Controle Médico de Saúde Ocupacional (NR-7)' },
  { title: 'Mapeamento Psicossocial', type: 'laudo', description: 'Avaliação e Mapeamento de Fatores Psicossociais' },
  { title: 'Ordem de Serviço', type: 'documento', description: 'Ordens de Serviço de Segurança e Medicina do Trabalho' },
  { title: 'Relatório Analítico do PCMSO', type: 'laudo', description: 'Relatório Analítico Anual do PCMSO' },
  { title: 'LTCAT', type: 'laudo', description: 'Laudo Técnico das Condições Ambientais de Trabalho' },
  { title: 'LI', type: 'laudo', description: 'Laudo de Insalubridade (NR-15)' },
  { title: 'LP', type: 'laudo', description: 'Laudo de Periculosidade (NR-16)' },
  { title: 'PCA', type: 'programa', description: 'Programa de Conservação Auditiva' },
  { title: 'PPR', type: 'programa', description: 'Programa de Proteção Respiratória' },
  { title: 'AET', type: 'laudo', description: 'Análise Ergonômica do Trabalho (NR-17)' },
  { title: 'eSocial S-2240', type: 'documento', description: 'Condições Ambientais do Trabalho - Agentes Nocivos' }
];

async function seedDeliverables() {
  console.log('--- Iniciando Carga de Entregáveis Padronizados ---');

  // 1. Buscar todas as empresas
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name')
    .order('name');

  if (compErr || !companies) {
    console.error('Erro ao buscar empresas:', compErr);
    process.exit(1);
  }
  console.log(`Total de empresas encontradas: ${companies.length}`);

  // 2. Buscar entregáveis existentes para evitar duplicatas
  const { data: existingDeliverables, error: delivErr } = await supabase
    .from('deliverables')
    .select('company_id, title');

  if (delivErr) {
    console.error('Erro ao buscar entregáveis existentes:', delivErr);
    process.exit(1);
  }

  // Mapa de existentes por company_id + title
  const existingSet = new Set(
    (existingDeliverables || []).map(d => `${d.company_id}::${d.title.trim().toLowerCase()}`)
  );
  console.log(`Entregáveis atualmente no banco: ${existingSet.size}`);

  // 3. Data de vencimento padrão: 30 dias a partir de hoje
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split('T')[0];

  // 4. Montar lista de novos entregáveis
  const toInsert = [];
  let skippedCount = 0;

  for (const company of companies) {
    for (const item of STANDARD_DELIVERABLES) {
      const key = `${company.id}::${item.title.trim().toLowerCase()}`;
      if (existingSet.has(key)) {
        skippedCount++;
        continue;
      }

      toInsert.push({
        company_id: company.id,
        contract_id: null,
        title: item.title,
        type: item.type,
        status: 'pendente',
        description: item.description,
        due_date: dueDateStr,
        validity_date: null,
        delivered_date: null,
        file_name: null,
        reason: null,
        responsible_id: null
      });
    }
  }

  console.log(`Novos entregáveis a inserir: ${toInsert.length} (Já existentes ignorados: ${skippedCount})`);

  if (toInsert.length === 0) {
    console.log('Nenhum novo entregável precisa ser inserido. Todas as empresas já possuem todos os entregáveis.');
    return;
  }

  // 5. Inserir em lotes de 100
  const CHUNK_SIZE = 100;
  let totalInserted = 0;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.from('deliverables').insert(chunk).select('id');
    
    if (error) {
      console.error(`Erro ao inserir lote ${i / CHUNK_SIZE + 1}:`, error);
      process.exit(1);
    }
    totalInserted += (data ? data.length : chunk.length);
    console.log(`Lote inserido: ${totalInserted}/${toInsert.length}`);
  }

  console.log('--- Carga Concluída com Sucesso! ---');
  console.log(`Total inserido: ${totalInserted} entregáveis.`);
}

seedDeliverables().catch(err => {
  console.error('Falha geral:', err);
  process.exit(1);
});
