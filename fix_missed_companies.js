import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function determineType(title) {
  const t = title.toLowerCase();
  if (t.includes('visita') || t.includes('atendimento') || t.includes('apoio') || t.includes('inspeção') || t.includes('acompanhamento')) return 'visita_tecnica';
  if (t.includes('ltcat') || t.includes('ltip') || t.includes('aet') || t.includes('psicosso') || t.includes('laudo') || t.includes('diagnóstico') || t.includes('avcb')) return 'laudo';
  if (t.includes('treinamento') || t.includes('palestra') || t.includes('curso') || t.includes('sipat') || t.includes('ead') || t.includes('capacitaç')) return 'treinamento';
  if (t.includes('pgr') || t.includes('pcmso') || t.includes('pca') || t.includes('ppr') || t.includes('gestão') || t.includes('controle') || t.includes('plataforma') || t.includes('esocial') || t.includes('s-22') || t.includes('ppp') || t.includes('mapa') || t.includes('portal') || t.includes('monitoramento') || t.includes('sistemas') || t.includes('nuvem')) return 'programa';
  if (t.includes('exame') || t.includes('aso') || t.includes('atestado') || t.includes('cat') || t.includes('prontuário') || t.includes('notificação') || t.includes('aviso') || t.includes('ordem') || t.includes('ordens') || t.includes('demissional') || t.includes('rastreabilidade') || t.includes('entrega biométrica') || t.includes('comunicação')) return 'documento';
  return 'documento';
}

const checklists = [
  {
    groupKeywords: ['FA Nunes', 'FAN Servicos', 'F & F Transportes', 'F & A Distribuidora'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Mapa de Riscos Ocupacionais', 'Gestão e Curso de CIPA', 'Palestras Obrigatórias', 'Organização da SIPAT', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Aviso de Periódicos', 'Atendimentos nas Clínicas', 'Eventos eSocial', 'Gestão de Afastamentos (S-2230)', 'Atestados Automatizados com IA', 'Controle de EPI Biométrico', 'Gestão do FAP & RH', 'Transcrição de PPP'],
    feitos: []
  },
  {
    groupKeywords: ['Fix Metais'],
    items: ['Visita Técnica In Loco', 'PGR & Mapa de Riscos', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'PCA (Conservação Auditiva)', 'Apoio Técnico e Perícias', 'Treinamentos Digitais (EaD)', 'Palestras Preventivas', 'Gestão de Certificados', 'PCMSO Base & Relatório', 'Controle de Vencimentos', 'Atendimento Premium', 'Eventos eSocial (S-2240)', 'PPP Digital', 'Plataforma e Documentos'],
    feitos: []
  },
  {
    groupKeywords: ['LD de O Mendes'],
    items: ['Visitas Técnicas In Loco', 'PGR (Programa Ger. Riscos)', 'LTCAT & LTIP', 'Avaliação Psicossocial', 'Diagnóstico Técnico', 'Apoio Técnico em Perícias', 'Palestras Preventivas', 'Treinamentos Digitais EaD', 'Gestão de Capacitações', 'PCMSO (Controle Médico)', 'Exames Ocupacionais (ASO)', 'Gestão de Exames e ASOs', 'Atendimento Premium', 'Eventos eSocial (S-2240)', 'PPP Digital e Ordens de Serviço', 'Controle de EPI Biométrico', 'Plataforma SGG'],
    feitos: []
  },
  {
    groupKeywords: ['Dinove'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Mapa de Riscos Ocupacionais', 'Gestão e Curso de CIPA', 'Palestras Obrigatórias', 'Organização da SIPAT', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Aviso de Periódicos', 'Atendimentos nas Clínicas', 'Eventos eSocial', 'Gestão de Afastamentos (S-2230)', 'Atestados Automatizados com IA', 'Controle de EPI Biométrico', 'Gestão do FAP & RH', 'Transcrição de PPP'],
    feitos: ['PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'Gestão e Curso de CIPA', 'Palestras Obrigatórias', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Aviso de Periódicos']
  }
];

async function run() {
  const { data: companies, error } = await supabase.from('companies').select('*');
  if (error) { console.error('Error fetching companies:', error); return; }

  const { data: existingDeliverables } = await supabase.from('deliverables').select('*');

  for (const checklist of checklists) {
    let matchedCompanyIds = [];
    
    for (const kw of checklist.groupKeywords) {
      const match = companies.filter(c => c.name.toLowerCase().includes(kw.toLowerCase()));
      match.forEach(m => {
        if (!matchedCompanyIds.includes(m.id)) matchedCompanyIds.push(m.id);
      });
    }

    if (matchedCompanyIds.length > 0) {
      let groupId = null;
      for (let cid of matchedCompanyIds) {
          const comp = companies.find(c => c.id === cid);
          if (comp.group_id) {
             groupId = comp.group_id; break;
          }
      }
      
      if (!groupId) {
         const { data: gData, error: gErr } = await supabase.from('groups').insert({ name: 'Grupo ' + matchedCompanyIds[0] }).select().single();
         if (!gErr) groupId = gData.id;
      }

      for (let cid of matchedCompanyIds) {
         await supabase.from('companies').update({ group_id: groupId }).eq('id', cid);
      }

      for (const item of checklist.items) {
        const isFeito = checklist.feitos.includes(item);
        const status = isFeito ? 'entregue' : 'pendente';
        const type = determineType(item);
        
        for (const cid of matchedCompanyIds) {
          const exists = existingDeliverables.find(d => d.company_id === cid && d.title === item);
          if (exists) {
            if (status === 'entregue' && exists.status !== 'entregue') {
               await supabase.from('deliverables').update({ status: 'entregue' }).eq('id', exists.id);
            }
          } else {
            await supabase.from('deliverables').insert({
              company_id: cid,
              title: item,
              status: status,
              type: type,
              due_date: '2024-12-31'
            });
          }
        }
      }
    }
  }
  
  // Now add standard deliverables to ALL remaining companies with 0 deliverables
  const { data: allDelivs } = await supabase.from('deliverables').select('company_id');
  const compWithDelivs = new Set(allDelivs.map(d => d.company_id));
  const emptyCompanies = companies.filter(c => !compWithDelivs.has(c.id));
  
  const standardDeliverables = [
    { title: 'Visita Técnica In Loco', type: 'visita_tecnica', status: 'pendente' },
    { title: 'PGR & Mapa de Riscos', type: 'programa', status: 'pendente' },
    { title: 'Avaliações Psicossociais', type: 'laudo', status: 'pendente' },
    { title: 'LTCAT & LTIP', type: 'laudo', status: 'pendente' },
    { title: 'PCA (Conservação Auditiva)', type: 'programa', status: 'pendente' },
    { title: 'Apoio Técnico e Perícias', type: 'programa', status: 'pendente' },
    { title: 'Treinamentos Digitais (EaD)', type: 'treinamento', status: 'pendente' },
    { title: 'Palestras Preventivas', type: 'treinamento', status: 'pendente' },
    { title: 'Gestão de Certificados', type: 'programa', status: 'pendente' },
    { title: 'PCMSO Base & Relatório', type: 'programa', status: 'pendente' },
    { title: 'Controle de Vencimentos', type: 'programa', status: 'pendente' },
    { title: 'Atendimento Premium', type: 'visita_tecnica', status: 'pendente' },
    { title: 'Eventos eSocial (S-2240)', type: 'programa', status: 'pendente' },
    { title: 'PPP Digital', type: 'programa', status: 'pendente' },
    { title: 'Plataforma e Documentos', type: 'programa', status: 'pendente' }
  ];

  let addedStd = 0;
  for (const c of emptyCompanies) {
      for (const std of standardDeliverables) {
          await supabase.from('deliverables').insert({
              company_id: c.id,
              title: std.title,
              type: std.type,
              status: std.status,
              due_date: '2024-12-31'
          });
      }
      addedStd++;
  }
  
  console.log('Fixed missed matched companies and added standard deliverables to', addedStd, 'empty companies.');
}

run();
