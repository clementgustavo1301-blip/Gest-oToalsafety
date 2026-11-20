import { supabase } from '../lib/supabase';
import { getDefaultValidityMonths, parseSafeDate, isLaudo, isProgram, isPcaPprAet } from '../utils/deliverableTiming';
import { compressFileForUpload } from '../utils/fileCompressor';
import { sanitizeErrorMessage, createSafeError, logSafeError } from '../utils/errorPolicy';

// --- Stale-While-Revalidate (SWR) Memory + SessionStorage Cache & Request Deduplicator ---
const MEMORY_CACHE = new Map();
const IN_FLIGHT = new Map();
const CACHE_LISTENERS = new Set();
const SESSION_CACHE_PREFIX = 'ts_swr_v1_';
const PERSISTED_KEYS = new Set(['groups', 'companies', 'contracts', 'deliverables', 'trainings', 'profiles']);
const FRESH_TTL_MS = 25 * 1000; // 25s: retorno instantâneo sem rede
const STALE_TTL_MS = 10 * 60 * 1000; // 10min: retorno instantâneo + revalidação silenciosa em background

function readCacheEntry(key) {
  const mem = MEMORY_CACHE.get(key);
  if (mem && Date.now() - mem.timestamp < STALE_TTL_MS) {
    return mem;
  }
  if (PERSISTED_KEYS.has(key) && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = window.sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.data) && Date.now() - parsed.timestamp < STALE_TTL_MS) {
          MEMORY_CACHE.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      // sessionStorage indisponível ou inválido
    }
  }
  return null;
}

function writeCacheEntry(key, data) {
  const entry = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(key, entry);
  if (PERSISTED_KEYS.has(key) && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Quota excedida ou sessionStorage indisponível
    }
  }
  CACHE_LISTENERS.forEach((listener) => {
    try {
      listener(key, data);
    } catch {
      // Ignora erro em listener
    }
  });
}

export function subscribeToStorageCache(listener) {
  if (typeof listener !== 'function') return () => {};
  CACHE_LISTENERS.add(listener);
  return () => {
    CACHE_LISTENERS.delete(listener);
  };
}

export function invalidateStorageCache(keys = null) {
  const targetKeys = Array.isArray(keys) && keys.length > 0 ? keys : Array.from(PERSISTED_KEYS);
  targetKeys.forEach((key) => {
    MEMORY_CACHE.delete(key);
    IN_FLIGHT.delete(key);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(SESSION_CACHE_PREFIX + key);
      } catch {
        // Ignora
      }
    }
  });
}

function executeDeduplicatedFetch(key, fetcher) {
  if (IN_FLIGHT.has(key)) {
    return IN_FLIGHT.get(key);
  }
  const promise = Promise.resolve()
    .then(() => fetcher())
    .then((result) => {
      if (Array.isArray(result)) {
        writeCacheEntry(key, result);
      }
      return result;
    })
    .finally(() => {
      IN_FLIGHT.delete(key);
    });

  IN_FLIGHT.set(key, promise);
  return promise;
}

async function fetchWithSWR(key, fetcher, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCacheEntry(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age >= FRESH_TTL_MS) {
        // Stale-while-revalidate: atualiza em background e retorna o cache em 0ms
        executeDeduplicatedFetch(key, fetcher).catch(() => {});
      }
      return cached.data;
    }
  }
  return executeDeduplicatedFetch(key, fetcher);
}

// --- Helpers to map between DB (snake_case) and Frontend (camelCase) ---

export function getCurrentCompetencia(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function parseContactData(rawContact) {
  if (!rawContact) return { contact: '', responsible: '', supportResponsible: '', responsibleId: '', supportResponsibleId: '', gestaoS2240: '', s2240Month: '' };
  try {
    if (typeof rawContact === 'string' && rawContact.trim().startsWith('{') && rawContact.trim().endsWith('}')) {
      const parsed = JSON.parse(rawContact);
      return {
        contact: parsed.contact || parsed.clientContact || '',
        responsible: parsed.responsible || '',
        supportResponsible: parsed.supportResponsible || '',
        responsibleId: parsed.responsibleId || '',
        supportResponsibleId: parsed.supportResponsibleId || '',
        gestaoS2240: parsed.gestaoS2240 || '',
        s2240Month: parsed.s2240Month || '',
      };
    }
  } catch (e) {
    // fallback
  }
  return { contact: rawContact, responsible: '', supportResponsible: '', responsibleId: '', supportResponsibleId: '', gestaoS2240: '', s2240Month: '' };
}

export function serializeContactData({ contact, responsible, supportResponsible, responsibleId, supportResponsibleId, gestaoS2240, s2240Month }) {
  if (!responsible && !supportResponsible && !responsibleId && !supportResponsibleId && !gestaoS2240 && !s2240Month) {
    return contact || '';
  }
  return JSON.stringify({
    contact: contact || '',
    responsible: responsible || '',
    supportResponsible: supportResponsible || '',
    responsibleId: responsibleId || '',
    supportResponsibleId: supportResponsibleId || '',
    gestaoS2240: gestaoS2240 || 'pendente',
    s2240Month: s2240Month || '',
  });
}


function normalizeName(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function isSamePerson(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  if (a === b) return true;

  const partsA = a.split(/\s+/).filter(Boolean);
  const partsB = b.split(/\s+/).filter(Boolean);

  if (partsA[0] === partsB[0]) {
    if (partsA.length === 1 || partsB.length === 1) return true;
    if (partsA[partsA.length - 1] === partsB[partsB.length - 1]) return true;
  }
  return false;
}

function mapGroup(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    supervisor: row.supervisor || '',
    tecnicoResponsavel: row.tecnico_responsavel || '',
    visitasTecnicas: row.visitas_tecnicas || 'N/A',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCompany(row) {
  if (!row) return null;
  const rawCat = row.category || 'TotalSafety';
  const parts = rawCat.split(' - ');
  const catName = parts[0];
  const regName = parts.length > 1 ? parts[1] : 'Natal';
  const contactInfo = parseContactData(row.contact);

  const currentMonth = getCurrentCompetencia();
  const rawS2240 = row.gestao_s2240 || contactInfo.gestaoS2240 || 'pendente';
  const rawS2240Month = row.s2240_month || contactInfo.s2240Month || '';
  // Todo dia 1º do mês (nova competência YYYY-MM), o S-2240 fica automaticamente como 'pendente'
  const effectiveS2240 = (rawS2240 === 'enviado' && rawS2240Month === currentMonth)
    ? 'enviado'
    : 'pendente';

  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    cnpj: row.cnpj,
    contact: contactInfo.contact,
    responsible: row.tecnico_responsavel || contactInfo.responsible,
    responsibleId: contactInfo.responsibleId,
    supportResponsible: row.supervisor || contactInfo.supportResponsible,
    supportResponsibleId: contactInfo.supportResponsibleId,
    supervisor: row.supervisor || contactInfo.supportResponsible || '',
    tecnicoResponsavel: row.tecnico_responsavel || contactInfo.responsible || '',
    visitasTecnicas: row.visitas_tecnicas || '',
    gestaoCipa: row.gestao_cipa || row.gestao_pgr || 'pendente',
    gestaoEpi: row.gestao_epi || row.gestao_sipat || 'pendente',
    gestaoPgr: row.gestao_cipa || row.gestao_pgr || 'pendente',
    gestaoSipat: row.gestao_epi || row.gestao_sipat || 'pendente',
    gestaoS2240: effectiveS2240,
    s2240Month: rawS2240Month,
    phone: row.phone,
    category: catName,
    region: regName,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

function mapContract(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    contractNumber: row.contract_number,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    value: row.value,
    filePath: row.file_path,
  };
}

function mapDeliverable(row) {
  if (!row) return null;
  const pcaPprAet = isPcaPprAet(row);
  const rawStatus = row.status || 'pendente';
  const isDeliveredWithFile = ['entregue', 'feito', 'concluido'].includes(rawStatus) && Boolean(row.file_name);
  const status = pcaPprAet && rawStatus !== 'cancelado' && !isDeliveredWithFile
    ? 'nao_se_aplica'
    : rawStatus;

  return {
    id: row.id,
    companyId: row.company_id,
    contractId: row.contract_id,
    title: row.title,
    type: row.type,
    status,
    dueDate: row.due_date || row.data_envio || row.data_emissao,
    dataEnvio: row.data_envio || row.data_emissao || row.due_date || row.delivered_date,
    dataEmissao: row.data_emissao || row.data_envio || row.due_date || row.delivered_date,
    validityDate: pcaPprAet ? null : row.validity_date,
    deliveredDate: row.delivered_date,
    ultimaRevisao: row.ultima_revisao,
    fileName: row.file_name,
    reason: row.reason,
    description: row.description,
    responsibleId: row.responsible_id,
  };
}

export function resolveCompaniesWithHeritage(companies = [], groups = []) {
  const groupsMap = new Map();
  groups.forEach(g => { groupsMap.set(g.id, g); });

  const companiesByGroup = new Map();
  companies.forEach(c => {
    if (!c.groupId) return;
    let list = companiesByGroup.get(c.groupId);
    if (!list) {
      list = [];
      companiesByGroup.set(c.groupId, list);
    }
    list.push(c);
  });

  const groupResolvedTeam = new Map();
  groups.forEach(g => {
    const compsInG = companiesByGroup.get(g.id) || [];
    const sup = g.supervisor || compsInG.find(c => c.supervisor)?.supervisor || compsInG.find(c => c.supportResponsible)?.supportResponsible || '';
    const tec = g.tecnicoResponsavel || compsInG.find(c => c.tecnicoResponsavel)?.tecnicoResponsavel || compsInG.find(c => c.responsible)?.responsible || '';
    const vis = (g.visitasTecnicas && g.visitasTecnicas !== 'N/A')
      ? g.visitasTecnicas
      : (compsInG.find(c => c.visitasTecnicas && c.visitasTecnicas !== 'N/A')?.visitasTecnicas || 'N/A');
    groupResolvedTeam.set(g.id, { sup, tec, vis });
  });

  return companies.map(c => {
    const g = c.groupId ? groupsMap.get(c.groupId) : null;
    const gResolved = c.groupId ? groupResolvedTeam.get(c.groupId) : null;
    const effSupervisor = gResolved?.sup || g?.supervisor || c.supervisor || c.supportResponsible || '';
    const effTecnico = gResolved?.tec || g?.tecnicoResponsavel || c.tecnicoResponsavel || c.responsible || '';
    const effVisitas = (gResolved?.vis && gResolved.vis !== 'N/A')
      ? gResolved.vis
      : ((g?.visitasTecnicas && g.visitasTecnicas !== 'N/A') ? g.visitasTecnicas : (c.visitasTecnicas || 'N/A'));
    return {
      ...c,
      groupName: g?.name || 'Sem Grupo',
      effSupervisor: effSupervisor || 'Não definido',
      effTecnico: effTecnico || 'Não definido',
      effVisitas: effVisitas || 'N/A',
    };
  });
}

function buildDeliverablesSummary(deliverables = [], companies = [], groups = [], contracts = []) {
  const resolvedCompanies = resolveCompaniesWithHeritage(companies, groups);
  const companiesById = new Map(resolvedCompanies.map(c => [c.id, c]));
  const contractsById = new Map(contracts.map(c => [c.id, c]));

  return deliverables.map(d => {
    const comp = companiesById.get(d.companyId);
    return {
      ...d,
      companyName: comp?.name || 'N/A',
      groupId: comp?.groupId || null,
      groupName: comp?.groupName || 'Sem Grupo',
      supervisor: comp?.effSupervisor || 'Não definido',
      tecnicoResponsavel: comp?.effTecnico || 'Não definido',
      contractNumber: contractsById.get(d.contractId)?.contractNumber || 'N/A',
    };
  });
}

/**
 * Leitura síncrona (0ms) do snapshot em cache para inicialização imediata de telas
 * (Dashboard, Entregáveis, Empresas e Detalhes da Empresa) sem spinner de carregamento.
 */
export function getCachedSnapshot(companyId = null) {
  const groupsEntry = readCacheEntry('groups');
  const companiesEntry = readCacheEntry('companies');
  const contractsEntry = readCacheEntry('contracts');
  const deliverablesEntry = readCacheEntry('deliverables');
  const trainingsEntry = readCacheEntry('trainings');
  const profilesEntry = readCacheEntry('profiles');

  const groups = groupsEntry?.data || null;
  const companies = companiesEntry?.data || null;
  const contracts = contractsEntry?.data || null;
  const deliverables = deliverablesEntry?.data || null;
  const trainings = trainingsEntry?.data || null;
  const profiles = profilesEntry?.data || null;

  const resolvedCompanies = (companies && groups) ? resolveCompaniesWithHeritage(companies, groups) : [];
  const allDeliverablesSummary = (deliverables && companies && groups)
    ? buildDeliverablesSummary(deliverables, companies, groups, contracts || [])
    : [];

  let company = null;
  let group = null;
  let companyDeliverables = [];
  let companyContracts = [];
  let companyTrainings = [];

  if (companyId) {
    company = resolvedCompanies.find(c => c.id === companyId) || (companies ? companies.find(c => c.id === companyId) || null : null);
    group = (groups && company?.groupId) ? groups.find(g => g.id === company.groupId) || null : null;
    companyDeliverables = allDeliverablesSummary.filter(d => d.companyId === companyId);
    companyContracts = contracts ? contracts.filter(c => c.companyId === companyId) : [];
    companyTrainings = trainings ? trainings.filter(t => t.companyId === companyId) : [];
  }

  return {
    groups: groups || [],
    companies: companies || [],
    resolvedCompanies,
    contracts: contracts || [],
    deliverables: deliverables || [],
    allDeliverablesSummary,
    trainings: trainings || [],
    profiles: profiles || [],
    company,
    group,
    companyDeliverables,
    companyContracts,
    companyTrainings,
    hasCoreCache: Boolean(companies && groups && deliverables && contracts && trainings),
    hasDeliverablesCache: Boolean(deliverables && companies && groups && contracts),
    hasCompaniesCache: Boolean(companies && groups),
    hasCompanyDetailsCache: Boolean(companyId && company && groups && deliverables && trainings),
  };
}

/**
 * Pré-aquece os dados principais em background logo após a autenticação.
 */
export function prefetchCoreData() {
  return Promise.all([
    getGroups(),
    getCompanies(),
    getContracts(),
    getDeliverables(),
    getTrainings(),
    getProfiles(),
  ]).catch(() => {});
}

function mapTraining(row) {
  if (!row) return null;

  let isExternal = row.is_external === true;
  let externalCompanyName = row.external_company_name || null;
  let demandType = row.demand_type || (isExternal ? 'externa' : 'totalsafety');

  if (row.description) {
    const extMatch = row.description.match(/\[EXTERNAL_COMPANY:([^\]]+)\]/);
    if (extMatch) {
      externalCompanyName = externalCompanyName || extMatch[1].trim();
      isExternal = true;
      demandType = 'externa';
    }
  }

  return {
    id: row.id,
    companyId: row.company_id,
    deliverableId: row.deliverable_id,
    title: row.title,
    date: row.date,
    time: row.time,
    status: row.status,
    instructor: row.instructor,
    participants: row.participants,
    description: row.description,
    responsibleId: row.responsible_id,
    isExternal,
    externalCompanyName,
    demandType,
  };
}

// --- Groups ---
export async function getGroups(options = {}) {
  return fetchWithSWR('groups', async () => {
    const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: true });
    if (error) {
      logSafeError('getGroups', error);
      return [];
    }
    return (data || []).map(mapGroup);
  }, options);
}

export async function addGroup(group) {
  const basePayload = { name: group.name };
  const extendedPayload = {
    name: group.name,
    supervisor: group.supervisor || null,
    tecnico_responsavel: group.tecnicoResponsavel || group.tecnico_responsavel || null,
    visitas_tecnicas: group.visitasTecnicas || group.visitas_tecnicas || 'N/A'
  };

  const res1 = await supabase.from('groups').insert([extendedPayload]).select().single();
  if (res1.error && res1.error.message && (res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
    const res2 = await supabase.from('groups').insert([basePayload]).select().single();
    if (res2.error) { logSafeError('addGroup', res2.error); return null; }
    invalidateStorageCache(['groups', 'companies']);
    return mapGroup(res2.data);
  }
  if (res1.error) { logSafeError('addGroup', res1.error); return null; }
  invalidateStorageCache(['groups', 'companies']);
  return mapGroup(res1.data);
}

export async function updateGroup(groupId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.supervisor !== undefined) payload.supervisor = updates.supervisor;
  if (updates.tecnicoResponsavel !== undefined) payload.tecnico_responsavel = updates.tecnicoResponsavel;
  if (updates.tecnico_responsavel !== undefined) payload.tecnico_responsavel = updates.tecnico_responsavel;
  if (updates.visitasTecnicas !== undefined) payload.visitas_tecnicas = updates.visitasTecnicas;
  if (updates.visitas_tecnicas !== undefined) payload.visitas_tecnicas = updates.visitas_tecnicas;

  let groupResult = null;
  const res1 = await supabase.from('groups').update(payload).eq('id', groupId).select().single();
  if (res1.error && res1.error.message && (res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
    const res2 = await supabase.from('groups').update({ name: updates.name }).eq('id', groupId).select().single();
    if (res2.error) { console.error('Error updating group:', res2.error); return null; }
    groupResult = mapGroup(res2.data);
  } else if (res1.error) {
    console.error('Error updating group:', res1.error);
    return null;
  } else {
    groupResult = mapGroup(res1.data);
  }

  // Sincroniza automaticamente TODAS as empresas daquele grupo
  // garantindo que tenham o mesmo Supervisor, Técnico Responsável e Visitas
  try {
    const newSupervisor = updates.supervisor !== undefined ? updates.supervisor : undefined;
    const newTecnico = updates.tecnicoResponsavel !== undefined
      ? updates.tecnicoResponsavel
      : (updates.tecnico_responsavel !== undefined ? updates.tecnico_responsavel : undefined);
    const newVisitas = updates.visitasTecnicas !== undefined
      ? updates.visitasTecnicas
      : (updates.visitas_tecnicas !== undefined ? updates.visitas_tecnicas : undefined);

    if (newSupervisor !== undefined || newTecnico !== undefined || newVisitas !== undefined) {
      const companyUpdates = {};
      if (newSupervisor !== undefined) companyUpdates.supervisor = newSupervisor;
      if (newTecnico !== undefined) companyUpdates.tecnico_responsavel = newTecnico;
      if (newVisitas !== undefined && newVisitas !== 'N/A') companyUpdates.visitas_tecnicas = newVisitas;

      if (Object.keys(companyUpdates).length > 0) {
        await supabase.from('companies').update(companyUpdates).eq('group_id', groupId);
      }

      // Busca perfis para manter os IDs responsibleId e supportResponsibleId atualizados no JSON de contact
      const { data: profs } = await supabase.from('profiles').select('id, name');
      const supProf = newSupervisor ? profs?.find(p => isSamePerson(p.name, newSupervisor)) : null;
      const tecProf = newTecnico ? profs?.find(p => isSamePerson(p.name, newTecnico)) : null;

      const { data: groupCompanies } = await supabase.from('companies').select('id, contact').eq('group_id', groupId);
      if (groupCompanies && groupCompanies.length > 0) {
        for (const comp of groupCompanies) {
          const info = parseContactData(comp.contact);
          const serialized = serializeContactData({
            contact: info.contact,
            responsible: newTecnico !== undefined ? newTecnico : info.responsible,
            responsibleId: tecProf?.id || (newTecnico !== undefined ? '' : info.responsibleId),
            supportResponsible: newSupervisor !== undefined ? newSupervisor : info.supportResponsible,
            supportResponsibleId: supProf?.id || (newSupervisor !== undefined ? '' : info.supportResponsibleId),
            gestaoS2240: info.gestaoS2240,
            s2240Month: info.s2240Month,
          });
          await supabase.from('companies').update({ contact: serialized }).eq('id', comp.id);
        }
      }
    }
  } catch (syncErr) {
    logSafeError('updateGroup.sync', syncErr);
  }

  invalidateStorageCache(['groups', 'companies']);
  return groupResult;
}

export async function deleteGroup(groupId) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) logSafeError('deleteGroup', error);
  invalidateStorageCache(['groups', 'companies', 'deliverables', 'contracts', 'trainings']);
}

// --- Companies ---
export async function getCompanies(options = {}) {
  return fetchWithSWR('companies', async () => {
    const { data, error } = await supabase.from('companies').select('*').order('name', { ascending: true });
    if (error) {
      logSafeError('getCompanies', error);
      return [];
    }
    return (data || []).map(mapCompany);
  }, options);
}

export async function getCompaniesByGroup(groupId) {
  const cached = readCacheEntry('companies');
  if (cached && Array.isArray(cached.data)) {
    if (Date.now() - cached.timestamp >= FRESH_TTL_MS) {
      getCompanies({ forceRefresh: true }).catch(() => {});
    }
    return cached.data.filter(c => c.groupId === groupId);
  }
  const { data, error } = await supabase.from('companies').select('*').eq('group_id', groupId);
  if (error) { logSafeError('getCompaniesByGroup', error); return []; }
  return (data || []).map(mapCompany);
}

export async function getCompanyById(companyId) {
  const cached = readCacheEntry('companies');
  if (cached && Array.isArray(cached.data)) {
    const found = cached.data.find(c => c.id === companyId);
    if (found) {
      if (Date.now() - cached.timestamp >= FRESH_TTL_MS) {
        getCompanies({ forceRefresh: true }).catch(() => {});
      }
      return found;
    }
  }
  const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single();
  if (error) { logSafeError('getCompanyById', error); return null; }
  return mapCompany(data);
}

export async function addCompany(company) {
  let effSupervisor = company.supervisor || null;
  let effTecnico = company.tecnicoResponsavel || company.tecnico_responsavel || company.responsible || null;
  let effVisitas = company.visitasTecnicas || company.visitas_tecnicas || null;
  let effRespId = company.responsibleId || '';
  let effSuppId = company.supportResponsibleId || '';

  // Se a empresa pertencer a um grupo, herda Supervisor, Técnico Responsável e Visitas do grupo
  if (company.groupId) {
    try {
      const { data: grp } = await supabase.from('groups').select('*').eq('id', company.groupId).maybeSingle();
      if (grp) {
        if (grp.supervisor) effSupervisor = grp.supervisor;
        if (grp.tecnico_responsavel) effTecnico = grp.tecnico_responsavel;
        if (grp.visitas_tecnicas && grp.visitas_tecnicas !== 'N/A') effVisitas = grp.visitas_tecnicas;

        const { data: profs } = await supabase.from('profiles').select('id, name');
        if (effSupervisor && !effSuppId) {
          const sp = profs?.find(p => isSamePerson(p.name, effSupervisor));
          if (sp) effSuppId = sp.id;
        }
        if (effTecnico && !effRespId) {
          const tp = profs?.find(p => isSamePerson(p.name, effTecnico));
          if (tp) effRespId = tp.id;
        }
      }
    } catch (e) {
      console.warn('Erro ao herdar dados do grupo para a nova empresa:', e);
    }
  }

  const initS2240 = company.gestaoS2240 || company.gestao_s2240 || 'pendente';
  const initS2240Month = initS2240 === 'enviado' ? getCurrentCompetencia() : '';

  const contactStr = serializeContactData({
    contact: company.contact,
    responsible: effTecnico,
    supportResponsible: effSupervisor,
    responsibleId: effRespId,
    supportResponsibleId: effSuppId,
    gestaoS2240: initS2240,
    s2240Month: initS2240Month,
  });

  const basePayload = {
    group_id: company.groupId,
    name: company.name,
    cnpj: company.cnpj,
    contact: contactStr,
    phone: company.phone,
    address: company.address,
    category: `${company.category || 'TotalSafety'} - ${company.region || 'Natal'}`,
    latitude: company.latitude,
    longitude: company.longitude
  };

  const extendedPayload = {
    ...basePayload,
    supervisor: effSupervisor,
    tecnico_responsavel: effTecnico,
    visitas_tecnicas: effVisitas,
    gestao_cipa: company.gestaoCipa || company.gestao_cipa || company.gestaoPgr || company.gestao_pgr || 'pendente',
    gestao_epi: company.gestaoEpi || company.gestao_epi || company.gestaoSipat || company.gestao_sipat || 'pendente',
    gestao_pgr: company.gestaoCipa || company.gestao_cipa || company.gestaoPgr || company.gestao_pgr || 'pendente',
    gestao_sipat: company.gestaoEpi || company.gestao_epi || company.gestaoSipat || company.gestao_sipat || 'pendente',
  };

  let data = null;
  let error = null;

  const res1 = await supabase.from('companies').insert([extendedPayload]).select().single();
  if (res1.error && res1.error.message && (res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
    const fallbackPayload = { ...extendedPayload };
    delete fallbackPayload.gestao_cipa;
    delete fallbackPayload.gestao_epi;
    const res2 = await supabase.from('companies').insert([fallbackPayload]).select().single();
    if (res2.error && res2.error.message && (res2.error.message.includes('column') || res2.error.code === 'PGRST204')) {
      const res3 = await supabase.from('companies').insert([basePayload]).select().single();
      data = res3.data;
      error = res3.error;
    } else {
      data = res2.data;
      error = res2.error;
    }
  } else {
    data = res1.data;
    error = res1.error;
  }

  if (error) { 
    logSafeError('addCompany', error);
    if (error.code === '23505') {
      alert('Erro: Já existe uma empresa cadastrada com este CNPJ!');
    } else {
      alert(sanitizeErrorMessage(error, 'Não foi possível adicionar a empresa.'));
    }
    return null; 
  }

  invalidateStorageCache(['companies', 'groups']);
  return mapCompany(data);
}

export async function updateCompany(companyId, updates) {
  const snakeUpdates = {};
  if (updates.name !== undefined) snakeUpdates.name = updates.name;
  if (updates.cnpj !== undefined) snakeUpdates.cnpj = updates.cnpj;
  if (updates.phone !== undefined) snakeUpdates.phone = updates.phone;

  if (updates.supervisor !== undefined) snakeUpdates.supervisor = updates.supervisor;
  if (updates.tecnicoResponsavel !== undefined) snakeUpdates.tecnico_responsavel = updates.tecnicoResponsavel;
  if (updates.tecnico_responsavel !== undefined) snakeUpdates.tecnico_responsavel = updates.tecnico_responsavel;
  if (updates.visitasTecnicas !== undefined) snakeUpdates.visitas_tecnicas = updates.visitasTecnicas;
  if (updates.visitas_tecnicas !== undefined) snakeUpdates.visitas_tecnicas = updates.visitas_tecnicas;
  if (updates.gestaoCipa !== undefined) {
    snakeUpdates.gestao_cipa = updates.gestaoCipa;
    snakeUpdates.gestao_pgr = updates.gestaoCipa;
  }
  if (updates.gestao_cipa !== undefined) {
    snakeUpdates.gestao_cipa = updates.gestao_cipa;
    snakeUpdates.gestao_pgr = updates.gestao_cipa;
  }
  if (updates.gestaoEpi !== undefined) {
    snakeUpdates.gestao_epi = updates.gestaoEpi;
    snakeUpdates.gestao_sipat = updates.gestaoEpi;
  }
  if (updates.gestao_epi !== undefined) {
    snakeUpdates.gestao_epi = updates.gestao_epi;
    snakeUpdates.gestao_sipat = updates.gestao_epi;
  }
  if (updates.gestaoPgr !== undefined) {
    snakeUpdates.gestao_pgr = updates.gestaoPgr;
    snakeUpdates.gestao_cipa = updates.gestaoPgr;
  }
  if (updates.gestao_pgr !== undefined) {
    snakeUpdates.gestao_pgr = updates.gestao_pgr;
    snakeUpdates.gestao_cipa = updates.gestao_pgr;
  }
  if (updates.gestaoSipat !== undefined) {
    snakeUpdates.gestao_sipat = updates.gestaoSipat;
    snakeUpdates.gestao_epi = updates.gestaoSipat;
  }
  if (updates.gestao_sipat !== undefined) {
    snakeUpdates.gestao_sipat = updates.gestao_sipat;
    snakeUpdates.gestao_epi = updates.gestao_sipat;
  }

  if (
    updates.contact !== undefined ||
    updates.responsible !== undefined ||
    updates.supportResponsible !== undefined ||
    updates.responsibleId !== undefined ||
    updates.supportResponsibleId !== undefined ||
    updates.gestaoS2240 !== undefined ||
    updates.gestao_s2240 !== undefined
  ) {
    const { data: current } = await supabase.from('companies').select('contact').eq('id', companyId).single();
    const currentInfo = parseContactData(current?.contact);
    const newContact = updates.contact !== undefined ? updates.contact : currentInfo.contact;
    const newResp = updates.responsible !== undefined ? updates.responsible : (updates.tecnicoResponsavel !== undefined ? updates.tecnicoResponsavel : currentInfo.responsible);
    const newRespId = updates.responsibleId !== undefined ? updates.responsibleId : currentInfo.responsibleId;
    const newSupp = updates.supportResponsible !== undefined ? updates.supportResponsible : (updates.supervisor !== undefined ? updates.supervisor : currentInfo.supportResponsible);
    const newSuppId = updates.supportResponsibleId !== undefined ? updates.supportResponsibleId : currentInfo.supportResponsibleId;
    const rawNewS2240 = updates.gestaoS2240 !== undefined ? updates.gestaoS2240 : updates.gestao_s2240;
    const newS2240 = rawNewS2240 !== undefined ? rawNewS2240 : (currentInfo.gestaoS2240 || 'pendente');
    const newS2240Month = rawNewS2240 !== undefined
      ? (rawNewS2240 === 'enviado' ? getCurrentCompetencia() : '')
      : currentInfo.s2240Month;

    snakeUpdates.contact = serializeContactData({
      contact: newContact,
      responsible: newResp,
      supportResponsible: newSupp,
      responsibleId: newRespId,
      supportResponsibleId: newSuppId,
      gestaoS2240: newS2240,
      s2240Month: newS2240Month,
    });
  }
  if (updates.address !== undefined) snakeUpdates.address = updates.address;
  if (updates.latitude !== undefined) snakeUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) snakeUpdates.longitude = updates.longitude;

  if (updates.category !== undefined || updates.region !== undefined) {
    const { data: current } = await supabase.from('companies').select('category').eq('id', companyId).single();
    const currentCatStr = current?.category || 'TotalSafety';
    const parts = currentCatStr.split(' - ');
    const oldCat = parts[0];
    const oldReg = parts.length > 1 ? parts[1] : 'Natal';
    
    const newCat = updates.category !== undefined ? updates.category : oldCat;
    const newReg = updates.region !== undefined ? updates.region : oldReg;
    
    snakeUpdates.category = `${newCat} - ${newReg}`;
  }

  let data = null;
  let error = null;

  const res1 = await supabase.from('companies').update(snakeUpdates).eq('id', companyId).select().single();
  if (res1.error && res1.error.message && (res1.error.message.includes('column') || res1.error.code === 'PGRST204')) {
    // Se falhar por causa de gestao_cipa/gestao_epi, tenta salvar com gestao_pgr e gestao_sipat
    const safeUpdates = { ...snakeUpdates };
    delete safeUpdates.gestao_cipa;
    delete safeUpdates.gestao_epi;

    const res2 = await supabase.from('companies').update(safeUpdates).eq('id', companyId).select().single();
    if (res2.error && res2.error.message && (res2.error.message.includes('column') || res2.error.code === 'PGRST204')) {
      delete safeUpdates.gestao_pgr;
      delete safeUpdates.gestao_sipat;
      delete safeUpdates.supervisor;
      delete safeUpdates.tecnico_responsavel;
      delete safeUpdates.visitas_tecnicas;
      const res3 = await supabase.from('companies').update(safeUpdates).eq('id', companyId).select().single();
      data = res3.data;
      error = res3.error;
    } else {
      data = res2.data;
      error = res2.error;
    }
  } else {
    data = res1.data;
    error = res1.error;
  }

  if (error) { console.error('Error updating company:', error); return null; }

  // Se a empresa pertencer a um grupo e foi alterado Supervisor, Técnico Responsável ou Visitas Técnicas,
  // propaga automaticamente para o grupo e para TODAS as outras empresas daquele grupo
  const targetGroupId = data?.group_id;
  const newSupervisor = updates.supervisor !== undefined ? updates.supervisor : (updates.supportResponsible !== undefined ? updates.supportResponsible : undefined);
  const newTecnico = updates.tecnicoResponsavel !== undefined
    ? updates.tecnicoResponsavel
    : (updates.tecnico_responsavel !== undefined ? updates.tecnico_responsavel : (updates.responsible !== undefined ? updates.responsible : undefined));
  const newVisitas = updates.visitasTecnicas !== undefined
    ? updates.visitasTecnicas
    : (updates.visitas_tecnicas !== undefined ? updates.visitas_tecnicas : undefined);

  if (targetGroupId && (newSupervisor !== undefined || newTecnico !== undefined || newVisitas !== undefined)) {
    try {
      // 1. Atualiza o grupo (groups)
      const groupUpdates = {};
      if (newSupervisor !== undefined) groupUpdates.supervisor = newSupervisor;
      if (newTecnico !== undefined) groupUpdates.tecnico_responsavel = newTecnico;
      if (newVisitas !== undefined && newVisitas !== 'N/A') groupUpdates.visitas_tecnicas = newVisitas;

      if (Object.keys(groupUpdates).length > 0) {
        await supabase.from('groups').update(groupUpdates).eq('id', targetGroupId);
      }

      // 2. Atualiza todas as outras empresas do mesmo grupo (siblings)
      const siblingUpdates = {};
      if (newSupervisor !== undefined) siblingUpdates.supervisor = newSupervisor;
      if (newTecnico !== undefined) siblingUpdates.tecnico_responsavel = newTecnico;
      if (newVisitas !== undefined && newVisitas !== 'N/A') siblingUpdates.visitas_tecnicas = newVisitas;

      if (Object.keys(siblingUpdates).length > 0) {
        await supabase.from('companies').update(siblingUpdates).eq('group_id', targetGroupId);
      }

      // 3. Atualiza o JSON do campo contact nas outras empresas do mesmo grupo
      const { data: profs } = await supabase.from('profiles').select('id, name');
      const supProf = newSupervisor ? profs?.find(p => isSamePerson(p.name, newSupervisor)) : null;
      const tecProf = newTecnico ? profs?.find(p => isSamePerson(p.name, newTecnico)) : null;

      const { data: siblings } = await supabase.from('companies').select('id, contact').eq('group_id', targetGroupId);
      if (siblings && siblings.length > 0) {
        for (const sib of siblings) {
          const info = parseContactData(sib.contact);
          const serialized = serializeContactData({
            contact: info.contact,
            responsible: newTecnico !== undefined ? newTecnico : info.responsible,
            responsibleId: tecProf?.id || (newTecnico !== undefined ? '' : info.responsibleId),
            supportResponsible: newSupervisor !== undefined ? newSupervisor : info.supportResponsible,
            supportResponsibleId: supProf?.id || (newSupervisor !== undefined ? '' : info.supportResponsibleId),
            gestaoS2240: info.gestaoS2240,
            s2240Month: info.s2240Month,
          });
          await supabase.from('companies').update({ contact: serialized }).eq('id', sib.id);
        }
      }
    } catch (groupSyncErr) {
      logSafeError('updateCompany.groupSync', groupSyncErr);
    }
  }

  invalidateStorageCache(['companies', 'groups']);
  return mapCompany(data);
}

export async function deleteCompany(companyId) {
  await supabase.from('trainings').delete().eq('company_id', companyId);
  await supabase.from('deliverables').delete().eq('company_id', companyId);
  await supabase.from('contracts').delete().eq('company_id', companyId);
  await supabase.from('company_convocations').delete().eq('company_id', companyId);

  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) {
    logSafeError('deleteCompany', error);
    alert(sanitizeErrorMessage(error, 'Não foi possível excluir a empresa.'));
    return false;
  }
  invalidateStorageCache(['companies', 'groups', 'deliverables', 'contracts', 'trainings']);
  return true;
}

// --- Trainings ---
export async function getTrainings(options = {}) {
  return fetchWithSWR('trainings', async () => {
    const { data, error } = await supabase.from('trainings').select('*').order('date', { ascending: true });
    if (error) { logSafeError('getTrainings', error); return []; }
    return (data || []).map(mapTraining);
  }, options);
}

export async function getTrainingsByCompany(companyId) {
  const cached = readCacheEntry('trainings');
  if (cached && Array.isArray(cached.data)) {
    if (Date.now() - cached.timestamp >= FRESH_TTL_MS) {
      getTrainings({ forceRefresh: true }).catch(() => {});
    }
    return cached.data.filter(t => t.companyId === companyId);
  }
  const { data, error } = await supabase.from('trainings').select('*').eq('company_id', companyId).order('date', { ascending: true });
  if (error) { logSafeError('getTrainingsByCompany', error); return []; }
  return (data || []).map(mapTraining);
}

export async function addTraining(training) {
  let finalDescription = training.description || '';
  if (training.isExternal && training.externalCompanyName) {
    if (!finalDescription.includes('[EXTERNAL_COMPANY:')) {
      finalDescription = `${finalDescription}\n[EXTERNAL_COMPANY:${training.externalCompanyName}]`.trim();
    }
  }

  const basePayload = {
    company_id: training.companyId || null,
    deliverable_id: training.deliverableId || null,
    title: training.title,
    date: training.date,
    time: training.time,
    status: training.status || 'agendado',
    instructor: training.instructor,
    participants: training.participants,
    description: finalDescription,
    responsible_id: training.responsibleId || null,
  };

  const extendedPayload = {
    ...basePayload,
    is_external: training.isExternal || false,
    external_company_name: training.externalCompanyName || null,
    demand_type: training.demandType || (training.isExternal ? 'externa' : 'totalsafety'),
  };

  let data = null;
  let error = null;

  // Tenta inserir com colunas dedicadas primeiro; se ainda não existirem no Supabase, cai para o fallback com a tag na descrição
  const res1 = await supabase.from('trainings').insert([extendedPayload]).select().single();
  if (res1.error && res1.error.message && (res1.error.message.includes('column') || res1.error.message.includes('does not exist'))) {
    const res2 = await supabase.from('trainings').insert([basePayload]).select().single();
    data = res2.data;
    error = res2.error;
  } else {
    data = res1.data;
    error = res1.error;
  }

  if (error) { logSafeError('addTraining', error); return null; }

  if (training.deliverableId) {
    await supabase.from('deliverables').update({ status: 'agendado' }).eq('id', training.deliverableId);
  }

  invalidateStorageCache(['trainings', 'deliverables']);
  return mapTraining(data);
}

export async function updateTraining(trainingId, updates) {
  const snakeUpdates = {};
  if (updates.status !== undefined) snakeUpdates.status = updates.status;
  if (updates.instructor !== undefined) snakeUpdates.instructor = updates.instructor;
  if (updates.participants !== undefined) snakeUpdates.participants = updates.participants;
  if (updates.date !== undefined) snakeUpdates.date = updates.date;
  if (updates.time !== undefined) snakeUpdates.time = updates.time;
  if (updates.title !== undefined) snakeUpdates.title = updates.title;
  if (updates.companyId !== undefined) snakeUpdates.company_id = updates.companyId || null;
  if (updates.responsibleId !== undefined) snakeUpdates.responsible_id = updates.responsibleId;

  let finalDescription = updates.description !== undefined ? updates.description : undefined;
  if (updates.isExternal && updates.externalCompanyName) {
    if (finalDescription !== undefined && !finalDescription.includes('[EXTERNAL_COMPANY:')) {
      finalDescription = `${finalDescription}\n[EXTERNAL_COMPANY:${updates.externalCompanyName}]`.trim();
    }
  } else if (updates.isExternal === false && finalDescription !== undefined) {
    finalDescription = finalDescription.replace(/\[EXTERNAL_COMPANY:[^\]]+\]/g, '').trim();
  }
  if (finalDescription !== undefined) snakeUpdates.description = finalDescription;

  const extendedUpdates = {
    ...snakeUpdates,
  };
  if (updates.isExternal !== undefined) extendedUpdates.is_external = updates.isExternal;
  if (updates.externalCompanyName !== undefined) extendedUpdates.external_company_name = updates.externalCompanyName;
  if (updates.demandType !== undefined) extendedUpdates.demand_type = updates.demandType;

  let data = null;
  let error = null;

  const res1 = await supabase.from('trainings').update(extendedUpdates).eq('id', trainingId).select().single();
  if (res1.error && res1.error.message && (res1.error.message.includes('column') || res1.error.message.includes('does not exist'))) {
    const res2 = await supabase.from('trainings').update(snakeUpdates).eq('id', trainingId).select().single();
    data = res2.data;
    error = res2.error;
  } else {
    data = res1.data;
    error = res1.error;
  }

  if (error) { logSafeError('updateTraining', error); return null; }

  // Sincronizar com deliverables
  if (data.deliverable_id && updates.status) {
    let delivStatus = 'agendado';
    if (updates.status === 'concluido') delivStatus = 'entregue';
    if (updates.status === 'adiado') delivStatus = 'adiado';
    if (updates.status === 'nao_feito') delivStatus = 'pendente';
    
    await supabase.from('deliverables').update({ status: delivStatus }).eq('id', data.deliverable_id);
  }

  invalidateStorageCache(['trainings', 'deliverables']);
  return mapTraining(data);
}

export async function deleteTraining(trainingId) {
  // Fetch training to get deliverable_id before deleting
  const { data: training } = await supabase.from('trainings').select('deliverable_id').eq('id', trainingId).single();

  const { error } = await supabase.from('trainings').delete().eq('id', trainingId);
  if (error) {
    logSafeError('deleteTraining', error);
    return;
  }

  // Revert deliverable to pendente
  if (training && training.deliverable_id) {
    await supabase.from('deliverables').update({ status: 'pendente' }).eq('id', training.deliverable_id);
  }
  invalidateStorageCache(['trainings', 'deliverables']);
}

// --- Contracts ---
export async function getContracts(options = {}) {
  return fetchWithSWR('contracts', async () => {
    const { data, error } = await supabase.from('contracts').select('*');
    if (error) { logSafeError('getContracts', error); return []; }
    return (data || []).map(mapContract);
  }, options);
}

export async function getContractsByCompany(companyId) {
  const cached = readCacheEntry('contracts');
  if (cached && Array.isArray(cached.data)) {
    if (Date.now() - cached.timestamp >= FRESH_TTL_MS) {
      getContracts({ forceRefresh: true }).catch(() => {});
    }
    return cached.data.filter(c => c.companyId === companyId);
  }
  const { data, error } = await supabase.from('contracts').select('*').eq('company_id', companyId);
  if (error) { logSafeError('getContractsByCompany', error); return []; }
  return (data || []).map(mapContract);
}

export async function addContract(contract) {
  // Garantir que o valor seja numérico ou nulo
  let parsedValue = null;
  if (contract.value) {
    const numericString = contract.value.replace(/[^0-9,-]+/g, '').replace(',', '.');
    if (!isNaN(parseFloat(numericString))) {
      parsedValue = parseFloat(numericString);
    }
  }

  const { data, error } = await supabase.from('contracts').insert([{
    company_id: contract.companyId,
    contract_number: contract.contractNumber,
    description: contract.description,
    start_date: contract.startDate,
    end_date: contract.endDate,
    status: contract.status || 'ativo',
    value: parsedValue,
    file_path: contract.filePath
  }]).select().single();
  if (error) {
    logSafeError('addContract', error);
    alert(sanitizeErrorMessage(error, 'Não foi possível adicionar o contrato.'));
    return null;
  }
  invalidateStorageCache(['contracts']);
  return mapContract(data);
}

export async function updateContract(contractId, updates) {
  const snakeUpdates = {};
  if (updates.status !== undefined) snakeUpdates.status = updates.status;
  if (updates.filePath !== undefined) snakeUpdates.file_path = updates.filePath;

  const { data, error } = await supabase.from('contracts').update(snakeUpdates).eq('id', contractId).select().single();
  if (error) { logSafeError('updateContract', error); return null; }
  invalidateStorageCache(['contracts']);
  return mapContract(data);
}

// --- Deliverables ---
function isS2240Row(row) {
  const t = String(row?.title || '').toUpperCase();
  return t.includes('2240');
}

export async function getDeliverables(options = {}) {
  return fetchWithSWR('deliverables', async () => {
    const { data, error } = await supabase.from('deliverables').select('*').order('due_date', { ascending: true });
    if (error) { logSafeError('getDeliverables', error); return []; }
    return (data || []).filter(row => !isS2240Row(row)).map(mapDeliverable);
  }, options);
}

export async function getDeliverablesByCompany(companyId) {
  const cachedDeliv = readCacheEntry('deliverables');
  const cachedComp = readCacheEntry('companies');
  const cachedGrp = readCacheEntry('groups');
  const cachedCtr = readCacheEntry('contracts');

  if (cachedDeliv && cachedComp && cachedGrp) {
    if (Date.now() - cachedDeliv.timestamp >= FRESH_TTL_MS) {
      getDeliverables({ forceRefresh: true }).catch(() => {});
    }
    const allSummary = buildDeliverablesSummary(
      cachedDeliv.data,
      cachedComp.data,
      cachedGrp.data,
      cachedCtr?.data || []
    );
    return allSummary.filter(d => d.companyId === companyId);
  }

  const [{ data, error }, company, groups] = await Promise.all([
    supabase.from('deliverables').select('*').eq('company_id', companyId),
    getCompanyById(companyId),
    getGroups(),
  ]);
  if (error) { logSafeError('getDeliverablesByCompany', error); return []; }
  const siblings = company?.groupId ? await getCompaniesByGroup(company.groupId) : (company ? [company] : []);
  const resolvedList = resolveCompaniesWithHeritage(siblings.length > 0 ? siblings : (company ? [company] : []), groups);
  const resolved = resolvedList.find(c => c.id === companyId) || (company ? resolveCompaniesWithHeritage([company], groups)[0] : null);

  return (data || [])
    .filter(row => !isS2240Row(row))
    .map(mapDeliverable)
    .map(d => ({
      ...d,
      companyName: resolved?.name || 'N/A',
      groupId: resolved?.groupId || null,
      groupName: resolved?.groupName || 'Sem Grupo',
      supervisor: resolved?.effSupervisor || 'Não definido',
      tecnicoResponsavel: resolved?.effTecnico || 'Não definido',
    }));
}

export async function getDeliverablesByContract(contractId) {
  const cached = readCacheEntry('deliverables');
  if (cached && Array.isArray(cached.data)) {
    return cached.data.filter(d => d.contractId === contractId);
  }
  const { data, error } = await supabase.from('deliverables').select('*').eq('contract_id', contractId);
  if (error) { logSafeError('getDeliverablesByContract', error); return []; }
  return (data || []).filter(row => !isS2240Row(row)).map(mapDeliverable);
}

export async function addDeliverable(deliverable) {
  const pcaPprAet = isPcaPprAet(deliverable);
  const isProg = !pcaPprAet && deliverable.type === 'programa' && isProgram(deliverable);
  const emissaoVal = deliverable.dataEmissao || deliverable.dataEnvio || deliverable.dueDate || null;
  let validityVal = isProg ? (deliverable.validityDate || null) : null;
  if (isProg && !validityVal && emissaoVal) {
    const months = getDefaultValidityMonths(deliverable);
    if (months) {
      const base = parseSafeDate(emissaoVal);
      if (base) {
        const c = new Date(base.getTime());
        c.setMonth(c.getMonth() + months);
        if (!isNaN(c.getTime())) {
          validityVal = c.toISOString().split('T')[0];
        }
      }
    }
  }
  const revisaoVal = deliverable.ultimaRevisao || null;
  const resolvedStatus = pcaPprAet
    ? (deliverable.fileName ? 'entregue' : (deliverable.status && deliverable.status !== 'pendente' ? deliverable.status : 'nao_se_aplica'))
    : (deliverable.status || 'pendente');

  // Cada empresa (CNPJ) tem seus próprios programas e entregáveis de forma independente.
  // Se já existir o mesmo programa/documento na MESMA empresa (exceto treinamentos e visitas técnicas), atualiza apenas o registro desta empresa.
  if (deliverable.companyId && deliverable.type !== 'treinamento' && deliverable.type !== 'visita_tecnica') {
    const { data: existingList } = await supabase.from('deliverables')
      .select('id')
      .eq('company_id', deliverable.companyId)
      .eq('title', deliverable.title)
      .eq('type', deliverable.type)
      .limit(1);

    const existing = existingList && existingList.length > 0 ? existingList[0] : null;
    if (existing) {
      const updatePayload = {
        due_date: emissaoVal,
        data_envio: emissaoVal,
        data_emissao: emissaoVal,
        validity_date: validityVal,
        ultima_revisao: revisaoVal,
        status: resolvedStatus,
      };
      if (deliverable.contractId !== undefined) updatePayload.contract_id = deliverable.contractId;
      if (deliverable.description !== undefined) updatePayload.description = deliverable.description;
      if (deliverable.responsibleId !== undefined) updatePayload.responsible_id = deliverable.responsibleId;
      if (deliverable.fileName) updatePayload.file_name = deliverable.fileName;
      if (deliverable.deliveredDate) updatePayload.delivered_date = deliverable.deliveredDate;
      if (deliverable.reason !== undefined) updatePayload.reason = deliverable.reason;

      let upRes = await supabase.from('deliverables').update(updatePayload).eq('id', existing.id).select().single();
      if (upRes.error && upRes.error.message && (upRes.error.message.includes('column') || upRes.error.code === 'PGRST204')) {
        delete updatePayload.data_emissao;
        upRes = await supabase.from('deliverables').update(updatePayload).eq('id', existing.id).select().single();
      }
      if (upRes.error) {
        logSafeError('addDeliverable.updateExisting', upRes.error);
        return null;
      }
      invalidateStorageCache(['deliverables']);
      return mapDeliverable(upRes.data);
    }
  }

  const insertPayload = {
    company_id: deliverable.companyId,
    contract_id: deliverable.contractId,
    title: deliverable.title,
    type: deliverable.type,
    status: resolvedStatus,
    due_date: emissaoVal,
    data_envio: emissaoVal,
    data_emissao: emissaoVal,
    validity_date: validityVal,
    ultima_revisao: revisaoVal,
    delivered_date: deliverable.deliveredDate,
    file_name: deliverable.fileName,
    reason: deliverable.reason,
    description: deliverable.description,
    responsible_id: deliverable.responsibleId || null,
  };
  let insRes = await supabase.from('deliverables').insert([insertPayload]).select().single();
  if (insRes.error && insRes.error.message && (insRes.error.message.includes('column') || insRes.error.code === 'PGRST204')) {
    delete insertPayload.data_emissao;
    insRes = await supabase.from('deliverables').insert([insertPayload]).select().single();
  }
  if (insRes.error) { logSafeError('addDeliverable', insRes.error); return null; }
  invalidateStorageCache(['deliverables']);
  return mapDeliverable(insRes.data);
}

export async function updateDeliverable(deliverableId, updates) {
  // Fetch current deliverable to know title, type, and company_id
  const { data: currentDeliv } = await supabase.from('deliverables')
    .select('company_id, title, type')
    .eq('id', deliverableId)
    .single();

  const effectiveTitle = updates.title !== undefined ? updates.title : currentDeliv?.title;
  const effectiveType = updates.type !== undefined ? updates.type : currentDeliv?.type;
  const targetIsPcaPprAet = isPcaPprAet({ title: effectiveTitle, type: effectiveType });

  const snakeUpdates = {};
  if (updates.title !== undefined) snakeUpdates.title = updates.title;
  if (updates.description !== undefined) snakeUpdates.description = updates.description;
  if (updates.type !== undefined) snakeUpdates.type = updates.type;
  if (updates.contractId !== undefined) snakeUpdates.contract_id = updates.contractId;
  const emissaoVal = updates.dataEmissao !== undefined ? updates.dataEmissao : updates.dataEnvio;
  if (emissaoVal !== undefined) {
    snakeUpdates.data_emissao = emissaoVal;
    snakeUpdates.data_envio = emissaoVal;
    snakeUpdates.due_date = emissaoVal;
  }
  if (updates.dueDate !== undefined && emissaoVal === undefined) snakeUpdates.due_date = updates.dueDate;
  if ((effectiveType && effectiveType !== 'programa') || isLaudo({ title: effectiveTitle, type: effectiveType }) || targetIsPcaPprAet) {
    snakeUpdates.validity_date = null;
  } else if (updates.validityDate !== undefined) {
    snakeUpdates.validity_date = updates.validityDate;
  }
  if (updates.ultimaRevisao !== undefined) snakeUpdates.ultima_revisao = updates.ultimaRevisao;
  if (updates.status !== undefined) {
    snakeUpdates.status = (targetIsPcaPprAet && updates.status === 'pendente') ? 'nao_se_aplica' : updates.status;
  }
  if (updates.reason !== undefined) snakeUpdates.reason = updates.reason;
  if (updates.fileName !== undefined) snakeUpdates.file_name = updates.fileName;
  if (updates.deliveredDate !== undefined) snakeUpdates.delivered_date = updates.deliveredDate;
  if (updates.responsibleId !== undefined) snakeUpdates.responsible_id = updates.responsibleId;

  let { data, error } = await supabase.from('deliverables').update(snakeUpdates).eq('id', deliverableId).select().single();
  if (error && error.message && (error.message.includes('column') || error.code === 'PGRST204')) {
    const safeUpdates = { ...snakeUpdates };
    delete safeUpdates.data_emissao;
    const fbRes = await supabase.from('deliverables').update(safeUpdates).eq('id', deliverableId).select().single();
    data = fbRes.data;
    error = fbRes.error;
  }
  if (error) { logSafeError('updateDeliverable', error); return null; }

  // Sincronizar com treinamentos (se for um treinamento)
  if (updates.status) {
    let trainingStatus = null;
    if (updates.status === 'feito' || updates.status === 'entregue') trainingStatus = 'concluido';
    if (updates.status === 'adiado') trainingStatus = 'adiado';
    if (updates.status === 'cancelado') trainingStatus = 'nao_feito';
    if (updates.status === 'agendado') trainingStatus = 'agendado';
    if (updates.status === 'pendente') trainingStatus = 'agendado';

    if (trainingStatus) {
      await supabase.from('trainings').update({ status: trainingStatus }).eq('deliverable_id', deliverableId);
    }
  }

  invalidateStorageCache(['deliverables', 'trainings']);
  return mapDeliverable(data);
}

export async function deleteDeliverable(deliverableId) {
  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', deliverableId);

  if (error) {
    logSafeError('deleteDeliverable', error);
    throw createSafeError(sanitizeErrorMessage(error, 'Não foi possível excluir o entregável.'));
  }
  invalidateStorageCache(['deliverables']);
  return true;
}

export async function deleteDeliverables(deliverableIds) {
  if (!deliverableIds || deliverableIds.length === 0) return true;
  const { error } = await supabase
    .from('deliverables')
    .delete()
    .in('id', deliverableIds);

  if (error) {
    logSafeError('deleteDeliverables', error);
    throw createSafeError(sanitizeErrorMessage(error, 'Não foi possível excluir os entregáveis selecionados.'));
  }
  invalidateStorageCache(['deliverables']);
  return true;
}

export async function getAllDeliverablesSummary(options = {}) {
  const [deliverables, companies, groups, contracts] = await Promise.all([
    getDeliverables(options),
    getCompanies(options),
    getGroups(options),
    getContracts(options),
  ]);

  return buildDeliverablesSummary(deliverables, companies, groups, contracts);
}

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'webp',
  'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'zip'
]);

// --- Storage (Arquivos) ---
export async function uploadDocument(file, folderPath, options = {}) {
  if (!file) {
    throw createSafeError('Nenhum arquivo selecionado para envio.');
  }

  if (typeof file.size === 'number' && file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw createSafeError('O arquivo excede o tamanho máximo permitido de 25 MB.');
  }

  const originalParts = String(file.name || '').split('.');
  const rawOriginalExt = originalParts.length > 1 ? originalParts.pop() : '';
  const safeOriginalExt = rawOriginalExt.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!safeOriginalExt || !ALLOWED_UPLOAD_EXTENSIONS.has(safeOriginalExt)) {
    throw createSafeError(`Tipo de arquivo não permitido (.${safeOriginalExt || 'desconhecido'}).`);
  }

  let fileToUpload = file;
  if (options.skipCompression !== true) {
    const compressed = await compressFileForUpload(file);
    fileToUpload = compressed.file || file;
  }

  if (typeof fileToUpload.size === 'number' && fileToUpload.size > MAX_UPLOAD_SIZE_BYTES) {
    throw createSafeError('O arquivo comprimido ainda excede o tamanho máximo permitido de 25 MB.');
  }

  const nameParts = String(fileToUpload.name || '').split('.');
  const rawExt = nameParts.length > 1 ? nameParts.pop() : '';
  const safeExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!safeExt || !ALLOWED_UPLOAD_EXTENSIONS.has(safeExt)) {
    throw createSafeError(`Tipo de arquivo não permitido (.${safeExt || 'desconhecido'}).`);
  }

  const safeFolder = String(folderPath || 'misc')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '') || 'misc';

  let randomPart = Math.random().toString(36).substring(2, 15);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    randomPart = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  const fileName = `${randomPart}_${Date.now()}.${safeExt}`;
  const filePath = `${safeFolder}/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, fileToUpload, {
      contentType: fileToUpload.type || undefined,
      upsert: false,
    });

  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  return filePath;
}

export async function deleteDocumentFromStorage(filePath) {
  if (!filePath) return false;
  try {
    const { error } = await supabase.storage.from('documents').remove([filePath]);
    if (error) {
      console.warn('Erro ao remover arquivo do Storage:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Falha ao remover arquivo do Storage:', err);
    return false;
  }
}

export function getDocumentUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
  return data.publicUrl;
}

// --- Inventory ---
export async function getInventory(options = {}) {
  return fetchWithSWR('inventory', async () => {
    const { data, error } = await supabase.from('inventory').select('*').order('name', { ascending: true });
    if (error) { logSafeError('getInventory', error); return []; }
    
    return (data || []).map(item => {
      let sector = 'Clínica';
      let cleanCategory = item.category || '';
      
      if (cleanCategory.startsWith('[SST]')) {
        sector = 'SST';
        cleanCategory = cleanCategory.replace('[SST]', '').trim();
      } else if (cleanCategory.startsWith('[Clínica]')) {
        sector = 'Clínica';
        cleanCategory = cleanCategory.replace('[Clínica]', '').trim();
      }
      
      return { ...item, sector, category: cleanCategory };
    });
  }, options);
}

export async function addInventoryItem(item) {
  const payload = { ...item };
  if (payload.sector) {
    payload.category = `[${payload.sector}] ${payload.category || ''}`.trim();
    delete payload.sector;
  } else {
    payload.category = `[Clínica] ${payload.category || ''}`.trim();
  }
  const { data, error } = await supabase.from('inventory').insert([payload]).select().single();
  if (error) { logSafeError('addInventoryItem', error); return null; }
  invalidateStorageCache(['inventory']);
  return data;
}

export async function updateInventoryItem(itemId, updates) {
  const payload = { ...updates };
  if (payload.sector) {
    payload.category = `[${payload.sector}] ${payload.category || ''}`.trim();
    delete payload.sector;
  }
  const { data, error } = await supabase.from('inventory').update(payload).eq('id', itemId).select().single();
  if (error) { logSafeError('updateInventoryItem', error); return null; }
  invalidateStorageCache(['inventory']);
  return data;
}

export async function deleteInventoryItem(itemId) {
  const { error } = await supabase.from('inventory').delete().eq('id', itemId);
  if (error) logSafeError('deleteInventoryItem', error);
  invalidateStorageCache(['inventory']);
}

// --- Profiles / Users ---
export async function getProfiles(options = {}) {
  return fetchWithSWR('profiles', async () => {
    const { data, error } = await supabase.from('profiles').select('id, name, role').order('name', { ascending: true });
    if (error) { logSafeError('getProfiles', error); return []; }
    return data || [];
  }, options);
}

// --- Custom Trainings (Certificates) ---
export { getCustomTrainings, saveCustomTraining, deleteCustomTraining } from './customTrainingsService';

