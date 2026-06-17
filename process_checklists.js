import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const checklists = [
  {
    groupKeywords: ['F.A. Nunes Gondim', 'Pronto Distrib', 'FAN Serviços', 'F&F Transportes', 'F&A Água', 'Pantanal'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Mapa de Riscos Ocupacionais', 'Gestão e Curso de CIPA', 'Palestras Obrigatórias', 'Organização da SIPAT', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Aviso de Periódicos', 'Atendimentos nas Clínicas', 'Eventos eSocial', 'Gestão de Afastamentos (S-2230)', 'Atestados Automatizados com IA', 'Controle de EPI Biométrico', 'Gestão do FAP & RH', 'Transcrição de PPP'],
    feitos: []
  },
  {
    groupKeywords: ['Refinaria', 'Garça', 'Garca', 'Holanda Serviços'],
    items: ['PGR (NR-1)', 'PCMSO (NR-7)', 'LTCAT', 'AET (NR-17)', 'PCA & PPR', 'Fatores Psicossociais', 'Gestão de CIPA (NR-5)', 'Palestras & SIPAT', 'Exames Clínicos', 'Exames Complementares', 'Evento S-2210', 'Evento S-2220', 'Evento S-2240', 'Sistemas e Suporte Adicional'],
    feitos: ['PGR (NR-1)', 'PCMSO (NR-7)', 'LTCAT', 'AET (NR-17)', 'Fatores Psicossociais', 'Exames Clínicos', 'Exames Complementares', 'Evento S-2210', 'Evento S-2220', 'Evento S-2240', 'Gestão de CIPA (NR-5)']
  },
  {
    groupKeywords: ['Segura Treinamento', 'Segura Consultoria', 'Segura'],
    items: ['PGR & Inventário (NR-1)', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET & PCA', 'Ordens de Serviço (OS)', 'Portal do Cliente SGG', 'Monitoramento SGG', 'Fornecimento Palestrantes', 'PCMSO (Documento Base)', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Convocação e Controle', 'Atendimento In Company', 'Eventos eSocial', 'Comunicação Acidente (CAT)', 'Gestão e Emissão do PPP'],
    feitos: ['PGR & Inventário (NR-1)', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET & PCA', 'Ordens de Serviço (OS)', 'Monitoramento SGG', 'PCMSO (Documento Base)', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Convocação e Controle', 'Atendimento In Company', 'Eventos eSocial']
  },
  {
    groupKeywords: ['FIX Esquadrias'],
    items: ['Visita Técnica In Loco', 'PGR & Mapa de Riscos', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'PCA (Conservação Auditiva)', 'Apoio Técnico e Perícias', 'Treinamentos Digitais (EaD)', 'Palestras Preventivas', 'Gestão de Certificados', 'PCMSO Base & Relatório', 'Controle de Vencimentos', 'Atendimento Premium', 'Eventos eSocial (S-2240)', 'PPP Digital', 'Plataforma e Documentos'],
    feitos: []
  },
  {
    groupKeywords: ['L D de O Mendes', 'LD de Oliveira Mendes'],
    items: ['Visitas Técnicas In Loco', 'PGR (Programa Ger. Riscos)', 'LTCAT & LTIP', 'Avaliação Psicossocial', 'Diagnóstico Técnico', 'Apoio Técnico em Perícias', 'Palestras Preventivas', 'Treinamentos Digitais EaD', 'Gestão de Capacitações', 'PCMSO (Controle Médico)', 'Exames Ocupacionais (ASO)', 'Gestão de Exames e ASOs', 'Atendimento Premium', 'Eventos eSocial (S-2240)', 'PPP Digital e Ordens de Serviço', 'Controle de EPI Biométrico', 'Plataforma SGG'],
    feitos: []
  },
  {
    groupKeywords: ['LD Agropecuaria'],
    items: ['PGR & Inventário (NR-1)', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Ordens de Serviço (OS)', 'Atenção: Visita Técnica', 'Gestão e Curso de CIPA', 'Treinamentos Obrigatórios', 'Palestras Preventivas', 'PCMSO Base', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Gestão de Exames e ASOs', 'Atendimento In Company', 'Eventos eSocial (S-2210/20/40)', 'Controle Biométrico de EPI', 'Plataforma e Documentos', 'PPP Digital'],
    feitos: []
  },
  {
    groupKeywords: ['Salina Cinco Estrelas'],
    items: ['PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'AET (Análise Ergonômica)', 'PCA & PPR', 'Visitas Técnicas / Perícias', 'Gestão e Treinamento CIPA', 'Palestras Obrigatórias', 'Organização SIPAT', 'PCMSO Base & Relatório', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Atendimento nas Clínicas', 'Guarda de Prontuários', 'Eventos eSocial', 'Atestados Inteligentes (IA)', 'Controle Biométrico de EPI', 'Nuvem e Sistema de Gestão'],
    feitos: ['PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'AET (Análise Ergonômica)', 'Palestras Obrigatórias', 'PCMSO Base & Relatório', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Guarda de Prontuários']
  },
  {
    groupKeywords: ['ALN de Carvalho'],
    items: ['Visita Técnica Inicial', 'PGR & Inventário (NR-1)', 'LTCAT (Laudo Técnico)', 'LTIP (Insalubridade/Peric.)', 'AET (Análise Ergonômica)', 'Relatórios de Acompanhamento', 'Gestão de CIPA Designado', 'Treinamento de CIPA Online', 'Palestras Obrigatórias', 'Exames Clínicos (ASO)', 'Exames Complementares', 'PCMSO Base & Relatório', 'Notificação de Periódicos', 'Disponibilização de ASO', 'Guarda de Prontuários', 'Eventos eSocial (S-2210/2220/2240)', 'Emissão de CAT', 'Emissão do PPP Digital', 'Rastreabilidade de EPI', 'Acesso à Plataforma SST'],
    feitos: ['Visita Técnica Inicial', 'PGR & Inventário (NR-1)', 'LTCAT (Laudo Técnico)', 'LTIP (Insalubridade/Peric.)', 'Relatórios de Acompanhamento', 'Palestras Obrigatórias', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Notificação de Periódicos', 'Disponibilização de ASO', 'Guarda de Prontuários', 'Acesso à Plataforma SST']
  },
  {
    groupKeywords: ['Diogo', 'Di Inove'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Mapa de Riscos Ocupacionais', 'Gestão e Curso de CIPA', 'Palestras Obrigatórias', 'Organização da SIPAT', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Aviso de Periódicos', 'Atendimentos nas Clínicas', 'Eventos eSocial', 'Gestão de Afastamentos (S-2230)', 'Atestados Automatizados com IA', 'Controle de EPI Biométrico', 'Gestão do FAP & RH', 'Transcrição de PPP'],
    feitos: ['PGR & Inventário (NR-1)', 'Avaliações Psicossociais', 'LTCAT & LTIP', 'Gestão e Curso de CIPA', 'Palestras Obrigatórias', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Aviso de Periódicos']
  },
  {
    groupKeywords: ['CK agronegocio'],
    items: ['Visita Técnica Periódica', 'PGR & Mapa de Riscos', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Ordens de Serviço (OS)', 'Gestão e Curso de CIPA', 'Treinamentos Obrigatórios', 'Palestras e SIPAT', 'PCMSO Base', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Gestão de Exames e ASOs', 'Atendimento In Company', 'Eventos eSocial (S-2210/20/40)', 'Controle Biométrico de EPI', 'Plataforma e Documentos', 'PPP Digital'],
    feitos: []
  },
  {
    groupKeywords: ['Padaria Frota'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Avaliações Psicossociais', 'Apoio Técnico a Perícias', 'Gestão e Curso de CIPA', 'Palestras do Cronograma', 'SIPAT e Eventos Corporativos', 'PCMSO (Documento Base)', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Atendimento Ecosafety', 'Guarda de Prontuários', 'Eventos eSocial (S-2210/2220/2240)', 'Validação de Atestados com IA', 'Entrega Biométrica de EPI', 'PPP Digital & Mapa de Riscos'],
    feitos: []
  },
  {
    groupKeywords: ['Fênix Indústria', 'Fenix'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Ordens de Serviço e Mapas', 'Gestão e Curso de CIPA', 'Treinamentos Obrigatórios', 'Palestras Preventivas', 'PCMSO Base', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Gestão de Exames e Prazos', 'Unidade Móvel (In Company)', 'Eventos eSocial (S-2210/20/40)', 'Controle Biométrico de EPI', 'PPP Digital', 'Plataforma e Suporte RH'],
    feitos: []
  },
  {
    groupKeywords: ['Quintas do Lago', 'Associação Quintas do Lago'],
    items: ['PGR & PCMSO', 'LTCAT & LTIP', 'PPP & Ordens de Serviço', 'AET & PCA', 'Fatores Psicossociais', 'ASOs e Exames', 'Atendimento In Company', 'S-2210, S-2220 e S-2240', 'Treinamentos e Palestras', 'Acompanhamento e SGG', 'Visitas Técnicas', 'Treinamento de Brigada', 'Consultoria AVCB'],
    feitos: ['PGR & PCMSO', 'LTCAT & LTIP', 'Fatores Psicossociais', 'ASOs e Exames', 'S-2210, S-2220 e S-2240', 'Visitas Técnicas']
  },
  {
    groupKeywords: ['F.A. Frutas', 'FA Frutas'],
    items: ['Visita Técnica In Loco', 'PGR & Mapa de Riscos', 'LTCAT & LTIP', 'Avaliações Psicossociais', 'Apoio Técnico e Perícias', 'AET & PCA', 'Palestras Preventivas', 'Gestão Estratégica (SGG)', 'PCMSO Base', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Atendimento In Company', 'Gestão de Exames e ASOs', 'Eventos eSocial (S-2210/2240)', 'PPP Digital', 'Controle Biométrico de EPI'],
    feitos: []
  },
  {
    groupKeywords: ['CAR Serviços'],
    items: ['PGR & Inventário (NR-1)', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Ordens de Serviço (OS)', 'Atenção: Visita Técnica', 'Gestão e Curso de CIPA', 'Treinamentos Obrigatórios', 'Palestras Preventivas', 'PCMSO Base', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Gestão de Exames e ASOs', 'Atendimento In Company', 'Eventos eSocial (S-2210/20/40)', 'Controle Biométrico de EPI', 'Plataforma e Documentos', 'PPP Digital'],
    feitos: []
  },
  {
    groupKeywords: ['Plano Const'],
    items: ['Visita Técnica Periódica', 'PGR & Inventário (NR-1)', 'Avaliação Psicossocial', 'LTCAT & LTIP', 'AET, PCA & PPR', 'Ordens de Serviço e Mapas', 'Gestão e Curso de CIPA', 'Treinamentos Obrigatórios', 'Palestras Preventivas', 'PCMSO Base', 'Exames Clínicos (ASO)', 'Exames Complementares', 'Gestão de Exames e ASOs', 'Atendimento In Company', 'Eventos eSocial (S-2210/20/40)', 'Controle Biométrico de EPI', 'Plataforma e Documentos', 'PPP Digital'],
    feitos: []
  },
  {
    groupKeywords: ['Master Mais', 'Auto Mais', 'DJNT'],
    items: ['Inspeção Técnica de Riscos', 'Visitas Técnicas de SST', 'PGR & Inventário (NR-1)', 'LTCAT & LTIP', 'Acompanhamento Pericial', 'Treinamentos Obrigatórios', 'Palestras Obrigatórias', 'Gestão CIPA Eletrônica', 'SIPAT e Eventos', 'Exames do PCMSO', 'Mudança de Riscos', 'Retorno / Demissional', 'Exames Complementares', 'PCMSO Base & Relatório', 'Atendimento VIP / Lote', 'Eventos eSocial (S-2210/2220/2240)', 'Validação de Atestados com IA', 'Controle de Absenteísmo (S-2230)', 'Entrega Biométrica de EPI', 'Gestão Estratégica do FAP', 'Emissão do PPP Digital'],
    feitos: ['Inspeção Técnica de Riscos', 'PGR & Inventário (NR-1)', 'LTCAT & LTIP', 'Exames do PCMSO', 'Mudança de Riscos', 'Retorno / Demissional', 'Exames Complementares', 'PCMSO Base & Relatório']
  }
];

async function run() {
  const { data: companies, error } = await supabase.from('companies').select('*');
  if (error) { console.error('Error fetching companies:', error); return; }

  const { data: existingDeliverables, error: delError } = await supabase.from('deliverables').select('*');
  if (delError) { console.error('Error fetching deliverables:', delError); return; }

  for (const checklist of checklists) {
    let matchedCompanyIds = [];
    
    // Find matching companies
    for (const kw of checklist.groupKeywords) {
      const match = companies.filter(c => c.name.toLowerCase().includes(kw.toLowerCase()));
      match.forEach(m => {
        if (!matchedCompanyIds.includes(m.id)) matchedCompanyIds.push(m.id);
      });
    }

    if (matchedCompanyIds.length > 0) {
      // Create a master group ID to sync (pick the first matched company's group_id, or its own id as group_id)
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

      // Ensure all items are present for all matched companies
      for (const item of checklist.items) {
        const isFeito = checklist.feitos.includes(item);
        const status = isFeito ? 'entregue' : 'pendente';
        
        for (const cid of matchedCompanyIds) {
          const exists = existingDeliverables.find(d => d.company_id === cid && d.title === item);
          if (exists) {
            // Update status if it was pendente and now it is entregue
            if (status === 'entregue' && exists.status !== 'entregue') {
               await supabase.from('deliverables').update({ status: 'entregue' }).eq('id', exists.id);
            }
          } else {
            // Insert
            await supabase.from('deliverables').insert({
              company_id: cid,
              title: item,
              status: status,
              type: 'documento',
              due_date: '2024-12-31' // default
            });
          }
        }
      }
    } else {
      console.log('No company found for:', checklist.groupKeywords[0]);
    }
  }
  console.log('Done!');
}

run();
