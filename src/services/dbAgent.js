import { supabase } from '../lib/supabase';

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const pad2 = (n) => String(n).padStart(2, '0');
const formatDateYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDateString = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Busca de agendas e agendamentos com máxima precisão temporal,
 * resolvendo empresas, instrutores, técnicos responsáveis e datas.
 */
export const getAgendaData = async ({
  period = 'today',
  date_from,
  date_to,
  month,
  year,
  company_name,
  responsible_name,
  status = 'all',
  include_campaigns = true,
  limit = 50
} = {}) => {
  try {
    const now = new Date();
    const todayStr = formatDateYMD(now);

    let fromDate = date_from;
    let toDate = date_to;

    // Resolução inteligente de período
    if (period === 'today') {
      fromDate = todayStr;
      toDate = todayStr;
    } else if (period === 'tomorrow') {
      const tm = new Date(now);
      tm.setDate(tm.getDate() + 1);
      fromDate = formatDateYMD(tm);
      toDate = fromDate;
    } else if (period === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      fromDate = formatDateYMD(yest);
      toDate = fromDate;
    } else if (period === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // Sábado
      fromDate = formatDateYMD(startOfWeek);
      toDate = formatDateYMD(endOfWeek);
    } else if (period === 'next_week') {
      const startOfNext = new Date(now);
      startOfNext.setDate(now.getDate() - now.getDay() + 7);
      const endOfNext = new Date(now);
      endOfNext.setDate(now.getDate() - now.getDay() + 13);
      fromDate = formatDateYMD(startOfNext);
      toDate = formatDateYMD(endOfNext);
    } else if (period === 'this_month') {
      fromDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      toDate = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(lastDay)}`;
    } else if (period === 'next_month') {
      const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      fromDate = formatDateYMD(nextM);
      const lastDay = new Date(nextM.getFullYear(), nextM.getMonth() + 1, 0).getDate();
      toDate = `${nextM.getFullYear()}-${pad2(nextM.getMonth() + 1)}-${pad2(lastDay)}`;
    } else if (month) {
      const targetYear = year || now.getFullYear();
      const mNum = parseInt(month, 10);
      fromDate = `${targetYear}-${pad2(mNum)}-01`;
      const lastDay = new Date(targetYear, mNum, 0).getDate();
      toDate = `${targetYear}-${pad2(mNum)}-${pad2(lastDay)}`;
    } else if (period === 'upcoming') {
      fromDate = todayStr;
    }

    console.log(`[EcoIA Agenda] Buscando período: ${period} (${fromDate || 'início'} até ${toDate || 'fim'}) | Empresa: ${company_name || 'todas'} | Resp: ${responsible_name || 'todos'}`);

    // 1. Resolução prévia de empresa por nome, se fornecido
    let matchedCompanyIds = null;
    if (company_name && typeof company_name === 'string' && company_name.trim()) {
      const term = company_name.trim();
      const { data: comps } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', `%${term}%`);
      matchedCompanyIds = comps?.map(c => c.id) || [];
    }

    // 2. Resolução prévia de perfil responsável por nome, se fornecido
    let matchedProfileIds = null;
    if (responsible_name && typeof responsible_name === 'string' && responsible_name.trim()) {
      const term = responsible_name.trim();
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, name')
        .ilike('name', `%${term}%`);
      matchedProfileIds = profs?.map(p => p.id) || [];
    }

    // 3. Consulta à tabela principal de agendamentos ('trainings')
    let tQuery = supabase
      .from('trainings')
      .select('id, title, date, time, status, instructor, participants, description, is_external, external_company_name, demand_type, company_id, responsible_id, companies(id, name, cnpj), profiles:responsible_id(id, name)');

    if (fromDate) tQuery = tQuery.gte('date', fromDate);
    if (toDate) tQuery = tQuery.lte('date', toDate);

    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        tQuery = tQuery.in('status', status);
      } else {
        tQuery = tQuery.eq('status', status);
      }
    }

    // Filtro por empresa
    if (matchedCompanyIds && matchedCompanyIds.length > 0) {
      tQuery = tQuery.or(`company_id.in.(${matchedCompanyIds.join(',')}),external_company_name.ilike.%${company_name.trim()}%`);
    } else if (company_name) {
      tQuery = tQuery.ilike('external_company_name', `%${company_name.trim()}%`);
    }

    // Filtro por responsável/instrutor
    if (matchedProfileIds && matchedProfileIds.length > 0) {
      tQuery = tQuery.or(`responsible_id.in.(${matchedProfileIds.join(',')}),instructor.ilike.%${responsible_name.trim()}%`);
    } else if (responsible_name) {
      tQuery = tQuery.ilike('instructor', `%${responsible_name.trim()}%`);
    }

    tQuery = tQuery.order('date', { ascending: true }).limit(limit);

    const { data: rawTrainings, error: errT } = await tQuery;
    if (errT) {
      console.error('[EcoIA Agenda] Erro ao buscar trainings:', errT);
      throw new Error(`Erro ao buscar agendamentos: ${errT.message}`);
    }

    // Formata eventos de trainings
    const unifiedEvents = (rawTrainings || []).map(t => {
      const dObj = parseDateString(t.date);
      const dayOfWeek = dObj ? DAY_NAMES[dObj.getDay()] : '';
      const formattedDate = t.date ? t.date.split('-').reverse().join('/') : 'Sem data';
      const companyName = t.companies?.name || t.external_company_name || 'Empresa não informada';
      const respName = t.profiles?.name || (t.instructor && t.instructor.trim()) || 'Responsável não informado';

      return {
        id: t.id,
        source: 'trainings',
        title: t.title || 'Agendamento / Treinamento',
        date: t.date,
        formatted_date: formattedDate,
        day_of_week: dayOfWeek,
        time: t.time || 'Sem horário informado',
        status: t.status || 'agendado',
        company_name: companyName,
        company_cnpj: t.companies?.cnpj || null,
        responsible_name: respName,
        instructor: t.instructor || '',
        participants: t.participants || 0,
        description: t.description || '',
        is_external: t.is_external || false
      };
    });

    // 4. Consulta a campanhas IPA ('ipa_campaigns'), se aplicável
    if (include_campaigns) {
      let cQuery = supabase.from('ipa_campaigns').select('*');
      if (fromDate) cQuery = cQuery.gte('date', fromDate);
      if (toDate) cQuery = cQuery.lte('date', toDate);
      if (company_name) cQuery = cQuery.ilike('company', `%${company_name.trim()}%`);
      cQuery = cQuery.order('date', { ascending: true }).limit(30);

      const { data: rawCampaigns } = await cQuery;
      if (rawCampaigns && rawCampaigns.length > 0) {
        rawCampaigns.forEach(c => {
          const dObj = parseDateString(c.date);
          const dayOfWeek = dObj ? DAY_NAMES[dObj.getDay()] : '';
          const formattedDate = c.date ? c.date.split('-').reverse().join('/') : 'Sem data';

          unifiedEvents.push({
            id: c.id,
            source: 'ipa_campaigns',
            title: `Campanha / Ação: ${c.eventType || 'Geral'}`,
            date: c.date,
            formatted_date: formattedDate,
            day_of_week: dayOfWeek,
            time: 'Dia todo / Conforme escala',
            status: 'agendado',
            company_name: c.company || 'Empresa IPA',
            location: c.location || '',
            responsible_name: 'Equipe de Ações de Saúde',
            description: c.notes || `Ação: ${c.eventType}`,
            is_campaign: true
          });
        });
      }
    }

    // Ordena todos os eventos por data ascendente
    unifiedEvents.sort((a, b) => {
      if (a.date !== b.date) {
        return (a.date || '').localeCompare(b.date || '');
      }
      return (a.time || '').localeCompare(b.time || '');
    });

    // Contadores para o resumo
    let countAgendados = 0;
    let countConcluidos = 0;
    let countAdiados = 0;
    let countOutros = 0;

    unifiedEvents.forEach(e => {
      const s = (e.status || '').toLowerCase();
      if (s === 'agendado') countAgendados++;
      else if (s === 'concluido' || s === 'entregue') countConcluidos++;
      else if (s === 'adiado') countAdiados++;
      else countOutros++;
    });

    return {
      success: true,
      reference_today: todayStr,
      query_period: {
        period,
        date_from: fromDate || null,
        date_to: toDate || null,
        company_name: company_name || null,
        responsible_name: responsible_name || null,
        status
      },
      total_found: unifiedEvents.length,
      summary: {
        total: unifiedEvents.length,
        agendados: countAgendados,
        concluidos: countConcluidos,
        adiados: countAdiados,
        outros: countOutros
      },
      events: unifiedEvents
    };
  } catch (error) {
    console.error('[EcoIA Agenda] Erro geral:', error);
    return {
      success: false,
      error: error.message,
      events: []
    };
  }
};

/**
 * Função executada pela IA para alterar ou consultar o banco de dados.
 */
export const executeDBAction = async (table, action, data = null, filters = null) => {
  try {
    let query = supabase.from(table);
    let response;

    console.log(`[EcoIA DB Agent] Executando: ${action} na tabela ${table}`);

    switch (action) {
      case 'select':
        if (table === 'trainings') {
          query = query.select('*, companies(id, name, cnpj), profiles:responsible_id(id, name)');
        } else if (['deliverables', 'contracts'].includes(table)) {
          query = query.select('*, companies(id, name, cnpj), profiles:responsible_id(name)');
        } else {
          query = query.select('*');
        }

        if (filters && typeof filters === 'object') {
          // Trata filtros avançados de data e texto
          const entries = Object.entries(filters);

          for (const [key, value] of entries) {
            if (value === undefined || value === null) continue;

            if (key === 'date_from' || key === 'start_date' || key === 'gte_date') {
              query = query.gte(table === 'deliverables' ? 'due_date' : 'date', value);
            } else if (key === 'date_to' || key === 'end_date' || key === 'lte_date') {
              query = query.lte(table === 'deliverables' ? 'due_date' : 'date', value);
            } else if (key === 'month' && (table === 'trainings' || table === 'ipa_campaigns')) {
              const now = new Date();
              const targetYear = filters.year || now.getFullYear();
              const mNum = parseInt(value, 10);
              const fromD = `${targetYear}-${pad2(mNum)}-01`;
              const toD = `${targetYear}-${pad2(mNum)}-${pad2(new Date(targetYear, mNum, 0).getDate())}`;
              query = query.gte('date', fromD).lte('date', toD);
            } else if (key === 'company_name' || key === 'company') {
              // Resolução de empresa por nome
              if (table === 'trainings' || table === 'deliverables' || table === 'contracts') {
                const { data: comps } = await supabase.from('companies').select('id').ilike('name', `%${value}%`);
                const compIds = comps?.map(c => c.id) || [];
                if (compIds.length > 0) {
                  if (table === 'trainings') {
                    query = query.or(`company_id.in.(${compIds.join(',')}),external_company_name.ilike.%${value}%`);
                  } else {
                    query = query.in('company_id', compIds);
                  }
                } else if (table === 'trainings') {
                  query = query.ilike('external_company_name', `%${value}%`);
                }
              } else if (table === 'ipa_campaigns') {
                query = query.ilike('company', `%${value}%`);
              } else {
                query = query.ilike('name', `%${value}%`);
              }
            } else if (key === 'responsible_name' || key === 'responsavel') {
              if (table === 'trainings') {
                const { data: profs } = await supabase.from('profiles').select('id').ilike('name', `%${value}%`);
                const profIds = profs?.map(p => p.id) || [];
                if (profIds.length > 0) {
                  query = query.or(`responsible_id.in.(${profIds.join(',')}),instructor.ilike.%${value}%`);
                } else {
                  query = query.ilike('instructor', `%${value}%`);
                }
              }
            } else if (key === 'limit') {
              query = query.limit(parseInt(value, 10));
            } else if (key === 'orderBy') {
              if (typeof value === 'object' && value.column) {
                query = query.order(value.column, { ascending: value.ascending !== false });
              }
            } else {
              query = query.eq(key, value);
            }
          }
        }

        // Ordenação padrão para agendamentos se não especificado
        if ((table === 'trainings' || table === 'ipa_campaigns') && (!filters || !filters.orderBy)) {
          query = query.order('date', { ascending: true });
        }

        response = await query;

        // Limpa e enriquece os dados retornados para fácil leitura da IA
        if (response.data && Array.isArray(response.data)) {
          if (table === 'trainings') {
            response.data = response.data.map(item => ({
              ...item,
              company_name: item.companies?.name || item.external_company_name || 'Empresa não informada',
              responsible_name: item.profiles?.name || item.instructor || 'Responsável não informado',
              formatted_date: item.date ? item.date.split('-').reverse().join('/') : 'Sem data'
            }));
          } else if (table === 'deliverables') {
            response.data = response.data.map(item => ({
              ...item,
              company_name: item.companies?.name || 'Empresa não informada',
              responsible_name: item.profiles?.name || 'Responsável não informado'
            }));
          }
        }
        break;

      case 'insert': {
        if (!data) throw new Error('Dados não fornecidos para inserção.');

        // Se for inserção de training e passou company_name ao invés de company_id
        if (table === 'trainings' && !data.company_id && data.company_name) {
          const { data: comps } = await supabase.from('companies').select('id').ilike('name', `%${data.company_name}%`).limit(1);
          if (comps && comps.length > 0) {
            data.company_id = comps[0].id;
          } else {
            data.is_external = true;
            data.external_company_name = data.company_name;
          }
          delete data.company_name;
        }

        // Se passou responsible_name ao invés de responsible_id
        if (table === 'trainings' && !data.responsible_id && data.responsible_name) {
          const { data: profs } = await supabase.from('profiles').select('id').ilike('name', `%${data.responsible_name}%`).limit(1);
          if (profs && profs.length > 0) {
            data.responsible_id = profs[0].id;
          }
          delete data.responsible_name;
        }

        response = await query.insert(data).select();
        break;
      }

      case 'update': {
        if (!data) throw new Error('Dados não fornecidos para atualização.');
        if (!filters || Object.keys(filters).length === 0) throw new Error('Filtros não fornecidos para atualização (perigo de update sem where).');

        // Se for update de training com company_name
        if (table === 'trainings' && data.company_name && !data.company_id) {
          const { data: comps } = await supabase.from('companies').select('id').ilike('name', `%${data.company_name}%`).limit(1);
          if (comps && comps.length > 0) {
            data.company_id = comps[0].id;
          }
          delete data.company_name;
        }

        query = query.update(data);
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        response = await query.select();
        break;
      }

      case 'delete':
        if (!filters || Object.keys(filters).length === 0) throw new Error('Filtros não fornecidos para deleção (perigo de delete sem where).');

        query = query.delete();
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        response = await query.select();
        break;

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      success: true,
      message: `Operação ${action} executada com sucesso na tabela ${table}.`,
      count: Array.isArray(response.data) ? response.data.length : undefined,
      data: response.data
    };
  } catch (error) {
    console.error('[EcoIA DB Agent] Erro:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
