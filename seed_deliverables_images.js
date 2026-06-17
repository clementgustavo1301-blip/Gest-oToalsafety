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

// Status mappings
// Pend. = 'pendente'
// Feito = 'concluido' ou 'entregue'
// N/A = 'nao_feito' ou ignorar, vou deixar como 'pendente' se não estiver claro, mas N/A = não aplicável.
// Vou usar 'entregue' para feito, 'pendente' para o resto.

const image1_companies = [
  '62d12764-57c4-481e-954e-f4e274423a2d', // LD de O Mendes
  '4864e2f0-23c5-4d88-aa78-b515096b959a', // LD de Oliveira Mendes
];
const image1_items = [
  { title: 'Visitas Técnicas In Loco', type: 'visita_tecnica', status: 'pendente', description: 'Mensais (2h/visita)' },
  { title: 'PGR (Programa Ger. Riscos)', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'LTCAT & LTIP', type: 'laudo', status: 'pendente', description: 'Conforme Legislação' },
  { title: 'Avaliação Psicossocial', type: 'laudo', status: 'pendente', description: 'Conforme NR-01' },
  { title: 'Diagnóstico Técnico', type: 'laudo', status: 'pendente', description: 'Estruturação Inicial' },
  { title: 'Apoio Técnico em Perícias', type: 'programa', status: 'pendente', description: 'Sob Demanda' },
  { title: 'Palestras Preventivas', type: 'treinamento', status: 'pendente', description: 'Online' },
  { title: 'Treinamentos Digitais EaD', type: 'treinamento', status: 'pendente', description: 'Contínuo' },
  { title: 'Gestão de Capacitações', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'PCMSO (Controle Médico)', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'Exames Ocupacionais (ASO)', type: 'laudo', status: 'pendente', description: 'Conforme PCMSO' },
  { title: 'Gestão de Exames e ASOs', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'Atendimento Premium', type: 'visita_tecnica', status: 'pendente', description: 'Sob Agendamento' },
  { title: 'Eventos eSocial (S-2240)', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'PPP Digital e Ordens de Serviço', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'Controle de EPI Biométrico', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'Plataforma SGG', type: 'programa', status: 'pendente', description: 'Contínuo' },
];

const image2_companies = [
  'a91aef74-7e97-4772-aea5-cba4bdad2b8f', // FIX ESQUADRIAS LTDA
];
const image2_items = [
  { title: 'Visita Técnica In Loco', type: 'visita_tecnica', status: 'pendente', description: 'Mensal (4h/Visita)' },
  { title: 'PGR & Mapa de Riscos', type: 'programa', status: 'pendente', description: 'Anual / Alteração' },
  { title: 'Avaliações Psicossociais', type: 'laudo', status: 'pendente', description: 'Estruturação Inicial' },
  { title: 'LTCAT & LTIP', type: 'laudo', status: 'pendente', description: 'Conforme Legislação' },
  { title: 'PCA (Conservação Auditiva)', type: 'programa', status: 'pendente', description: 'Anual' },
  { title: 'Apoio Técnico e Perícias', type: 'programa', status: 'pendente', description: 'Sob Demanda' },
  { title: 'Treinamentos Digitais (EaD)', type: 'treinamento', status: 'pendente', description: 'Contínuo' },
  { title: 'Palestras Preventivas', type: 'treinamento', status: 'pendente', description: 'Conforme PGR' },
  { title: 'Gestão de Certificados', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'PCMSO Base & Relatório', type: 'programa', status: 'pendente', description: 'Anual' },
  { title: 'Controle de Vencimentos', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'Atendimento Premium', type: 'visita_tecnica', status: 'pendente', description: 'Sob Agendamento' },
  { title: 'Eventos eSocial (S-2240)', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'PPP Digital', type: 'programa', status: 'pendente', description: 'Contínuo' },
  { title: 'Plataforma e Documentos', type: 'programa', status: 'pendente', description: 'Contínuo' },
];

const image3_companies = [
  'ab72e363-7635-4ab6-a5ef-21990cd89197', // Segura Treinamentos (91)
  'ae0f5957-0136-4a6a-bebd-055c88ea07f9', // Segura Treinamentos (68)
  '4e570d0b-871c-47b1-a96f-ca090c5190ef', // Segura Treinamentos (63)
];
const image3_items = [
  { title: 'PGR & Inventário (NR-1)', type: 'programa', status: 'entregue', description: 'Estruturação Inicial' },
  { title: 'Avaliação Psicossocial', type: 'laudo', status: 'entregue', description: 'Estruturação Inicial' },
  { title: 'LTCAT & LTIP', type: 'laudo', status: 'entregue', description: 'Conforme Legislação' },
  { title: 'AET & PCA', type: 'laudo', status: 'entregue', description: 'Conforme Risco' },
  { title: 'Ordens de Serviço (OS)', type: 'programa', status: 'entregue', description: 'Admissão / Alteração' },
  { title: 'Monitoramento SGG', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Portal do Cliente SGG', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Fornecimento Palestrantes', type: 'treinamento', status: 'pendente', description: 'Sob Solicitação (NÃO HOUVE CON. NEC.)' },
  { title: 'PCMSO (Documento Base)', type: 'programa', status: 'entregue', description: 'Anual' },
  { title: 'Exames Clínicos (ASO)', type: 'laudo', status: 'entregue', description: 'Conforme Tipo' },
  { title: 'Exames Complementares', type: 'laudo', status: 'entregue', description: 'Conforme PCMSO' },
  { title: 'Convocação e Controle', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Atendimento In Company', type: 'visita_tecnica', status: 'entregue', description: 'Sob Agendamento' },
  { title: 'Eventos eSocial', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Comunicação Acidente (CAT)', type: 'programa', status: 'entregue', description: 'Sob Evento (CON. NEC.)' },
  { title: 'Gestão e Emissão do PPP', type: 'programa', status: 'entregue', description: 'Contínuo (CON. NEC.)' },
];

const image4_companies = [
  '762589a5-a058-4955-bcae-6f11ea270a71', // Holanda (11)
  '98a8d8dc-4119-4837-9ae9-989c637957b4', // Matriz (28)
  '7a8e01aa-9f45-4285-b015-2fd1484a5dbd', // Filial (09)
];
const image4_items = [
  { title: 'PGR (NR-1)', type: 'programa', status: 'entregue', description: 'Programa de Gerenciamento de Riscos' },
  { title: 'PCMSO (NR-7)', type: 'programa', status: 'entregue', description: 'Programa de Controle Médico' },
  { title: 'LTCAT', type: 'laudo', status: 'entregue', description: 'Laudo Técnico de Condições Ambientais' },
  { title: 'AET (NR-17)', type: 'laudo', status: 'entregue', description: 'Análise Ergonômica' },
  { title: 'PCA & PPR', type: 'programa', status: 'pendente', description: 'Conservação Auditiva e Resp.' },
  { title: 'Fatores Psicossociais', type: 'laudo', status: 'entregue', description: 'Diagnóstico' },
  { title: 'Exames Clínicos', type: 'laudo', status: 'entregue', description: 'ASO' },
  { title: 'Exames Complementares', type: 'laudo', status: 'entregue', description: 'Laboratoriais, imagem' },
  { title: 'Evento S-2210', type: 'programa', status: 'pendente', description: 'CAT' },
  { title: 'Evento S-2220', type: 'programa', status: 'pendente', description: 'Monitoramento da Saúde' },
  { title: 'Evento S-2240', type: 'programa', status: 'pendente', description: 'Condições Ambientais' },
  { title: 'Gestão de CIPA (NR-5)', type: 'programa', status: 'entregue', description: 'CIPA' },
  { title: 'Palestras & SIPAT', type: 'treinamento', status: 'pendente', description: 'Palestras' },
  { title: 'Sistemas e Suporte Adicional', type: 'programa', status: 'pendente', description: 'Suporte Adicional' },
];

const image5_companies = [
  'f8cbe532-fb04-4699-b5ca-a89535bcd3e0', // FA Nunes Gondim LTDA
  '28b86ceb-b5fa-44c0-b4af-13e68610941e', // Pronto Distribuidora
  '9bf713dd-3e14-4ede-942b-91afbf4019de', // FAN Servicos
  '15777299-c58e-418f-9350-272fc31235c7', // F & F Transportes
  '1be1421a-0a0a-4c6b-94b2-393f972b3133', // F & A Distribuidora
  '1d7217cb-4442-4136-84be-4ef2ca0d9ecd', // Distribuidora Pantanal
];
const image5_items = [
  { title: 'Visita Técnica In Loco', type: 'visita_tecnica', status: 'entregue', description: 'Semanal (4h)' },
  { title: 'PGR & Ordens de Serviço', type: 'programa', status: 'entregue', description: 'Anual / Admissão' },
  { title: 'Avaliação Psicossocial', type: 'laudo', status: 'entregue', description: 'Estruturação Inicial' },
  { title: 'LTCAT & LTIP', type: 'laudo', status: 'entregue', description: 'Conforme Legislação' },
  { title: 'Apoio a Perícias e FAP', type: 'programa', status: 'pendente', description: 'Sob Demanda (N/A Exec.)' },
  { title: 'Gestão e Treinamento CIPA', type: 'treinamento', status: 'entregue', description: 'Anual (NR-5)' },
  { title: 'Treinamentos EaD', type: 'treinamento', status: 'entregue', description: 'Contínuo' },
  { title: 'Palestras e SIPAT', type: 'treinamento', status: 'pendente', description: 'Online/Palestrante (N/A Exec.)' },
  { title: 'PCMSO Base', type: 'programa', status: 'entregue', description: 'Anual' },
  { title: 'Exames Clínicos (ASO)', type: 'laudo', status: 'entregue', description: 'Conforme PCMSO' },
  { title: 'Exames Complementares', type: 'laudo', status: 'entregue', description: 'Conforme PCMSO' },
  { title: 'Gestão de Exames e ASOs', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Unidade Móvel (Van)', type: 'visita_tecnica', status: 'entregue', description: 'Sob Agendamento' },
  { title: 'Eventos eSocial (2210/20/40)', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Controle de EPI Digital', type: 'programa', status: 'entregue', description: 'Contínuo (NR-6)' },
  { title: 'PPP Digital', type: 'programa', status: 'entregue', description: 'Contínuo' },
  { title: 'Plataforma e Documentos', type: 'programa', status: 'entregue', description: 'Contínuo' },
];

async function insertForCompanies(companies, items) {
  for (const companyId of companies) {
    console.log(`Inserindo para empresa ${companyId}...`);
    for (const item of items) {
      const { error } = await supabase.from('deliverables').insert([{
        company_id: companyId,
        title: item.title,
        type: item.type,
        status: item.status,
        description: item.description
      }]);
      if (error) console.error('Erro ao inserir', item.title, error);
    }
  }
}

async function run() {
  await insertForCompanies(image1_companies, image1_items);
  await insertForCompanies(image2_companies, image2_items);
  await insertForCompanies(image3_companies, image3_items);
  await insertForCompanies(image4_companies, image4_items);
  await insertForCompanies(image5_companies, image5_items);
  console.log('Finalizado!');
}

run();
