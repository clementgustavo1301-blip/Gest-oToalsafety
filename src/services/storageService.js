import { supabase } from '../lib/supabase';
import { getDefaultValidityMonths, parseSafeDate, isLaudo } from '../utils/deliverableTiming';

// --- Helpers to map between DB (snake_case) and Frontend (camelCase) ---

export function parseContactData(rawContact) {
  if (!rawContact) return { contact: '', responsible: '', supportResponsible: '', responsibleId: '', supportResponsibleId: '' };
  try {
    if (typeof rawContact === 'string' && rawContact.trim().startsWith('{') && rawContact.trim().endsWith('}')) {
      const parsed = JSON.parse(rawContact);
      return {
        contact: parsed.contact || parsed.clientContact || '',
        responsible: parsed.responsible || '',
        supportResponsible: parsed.supportResponsible || '',
        responsibleId: parsed.responsibleId || '',
        supportResponsibleId: parsed.supportResponsibleId || '',
      };
    }
  } catch (e) {
    // fallback
  }
  return { contact: rawContact, responsible: '', supportResponsible: '', responsibleId: '', supportResponsibleId: '' };
}

export function serializeContactData({ contact, responsible, supportResponsible, responsibleId, supportResponsibleId }) {
  if (!responsible && !supportResponsible && !responsibleId && !supportResponsibleId) {
    return contact || '';
  }
  return JSON.stringify({
    contact: contact || '',
    responsible: responsible || '',
    supportResponsible: supportResponsible || '',
    responsibleId: responsibleId || '',
    supportResponsibleId: supportResponsibleId || '',
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
  return {
    id: row.id,
    companyId: row.company_id,
    contractId: row.contract_id,
    title: row.title,
    type: row.type,
    status: row.status || 'pendente',
    dueDate: row.due_date || row.data_envio || row.data_emissao,
    dataEnvio: row.data_envio || row.data_emissao || row.due_date || row.delivered_date,
    dataEmissao: row.data_emissao || row.data_envio || row.due_date || row.delivered_date,
    validityDate: row.validity_date,
    deliveredDate: row.delivered_date,
    ultimaRevisao: row.ultima_revisao,
    fileName: row.file_name,
    reason: row.reason,
    description: row.description,
    responsibleId: row.responsible_id,
  };
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
export async function getGroups() {
  const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: true });
  if (error) { console.error('Error fetching groups:', error); return []; }
  return data.map(mapGroup);
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
    if (res2.error) { console.error('Error adding group:', res2.error); return null; }
    return mapGroup(res2.data);
  }
  if (res1.error) { console.error('Error adding group:', res1.error); return null; }
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
          });
          await supabase.from('companies').update({ contact: serialized }).eq('id', comp.id);
        }
      }
    }
  } catch (syncErr) {
    console.error('Erro ao sincronizar empresas do grupo:', syncErr);
  }

  return groupResult;
}

export async function deleteGroup(groupId) {
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) console.error('Error deleting group:', error);
}

// --- Companies ---
export async function getCompanies() {
  const { data, error } = await supabase.from('companies').select('*').order('name', { ascending: true });
  if (error) { console.error('Error fetching companies:', error); return []; }
  return data.map(mapCompany);
}

export async function getCompaniesByGroup(groupId) {
  const { data, error } = await supabase.from('companies').select('*').eq('group_id', groupId);
  if (error) { console.error('Error fetching companies by group:', error); return []; }
  return data.map(mapCompany);
}

export async function getCompanyById(companyId) {
  const { data, error } = await supabase.from('companies').select('*').eq('id', companyId).single();
  if (error) { console.error('Error fetching company:', error); return null; }
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

  const contactStr = serializeContactData({
    contact: company.contact,
    responsible: effTecnico,
    supportResponsible: effSupervisor,
    responsibleId: effRespId,
    supportResponsibleId: effSuppId,
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
    console.error('Error adding company:', error); 
    if (error.code === '23505') {
      alert('Erro: Já existe uma empresa cadastrada com este CNPJ!');
    } else {
      alert(`Erro ao adicionar empresa: ${error.message}`);
    }
    return null; 
  }

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
    updates.supportResponsibleId !== undefined
  ) {
    const { data: current } = await supabase.from('companies').select('contact').eq('id', companyId).single();
    const currentInfo = parseContactData(current?.contact);
    const newContact = updates.contact !== undefined ? updates.contact : currentInfo.contact;
    const newResp = updates.responsible !== undefined ? updates.responsible : (updates.tecnicoResponsavel !== undefined ? updates.tecnicoResponsavel : currentInfo.responsible);
    const newRespId = updates.responsibleId !== undefined ? updates.responsibleId : currentInfo.responsibleId;
    const newSupp = updates.supportResponsible !== undefined ? updates.supportResponsible : (updates.supervisor !== undefined ? updates.supervisor : currentInfo.supportResponsible);
    const newSuppId = updates.supportResponsibleId !== undefined ? updates.supportResponsibleId : currentInfo.supportResponsibleId;

    snakeUpdates.contact = serializeContactData({
      contact: newContact,
      responsible: newResp,
      supportResponsible: newSupp,
      responsibleId: newRespId,
      supportResponsibleId: newSuppId,
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
          });
          await supabase.from('companies').update({ contact: serialized }).eq('id', sib.id);
        }
      }
    } catch (groupSyncErr) {
      console.warn('Erro ao sincronizar dados com o grupo e empresas irmãs:', groupSyncErr);
    }
  }

  return mapCompany(data);
}

export async function deleteCompany(companyId) {
  await supabase.from('trainings').delete().eq('company_id', companyId);
  await supabase.from('deliverables').delete().eq('company_id', companyId);
  await supabase.from('contracts').delete().eq('company_id', companyId);
  await supabase.from('company_convocations').delete().eq('company_id', companyId);

  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) {
    console.error('Error deleting company:', error);
    alert(`Erro ao excluir empresa: ${error.message}`);
    return false;
  }
  return true;
}

// --- Trainings ---
export async function getTrainings() {
  const { data, error } = await supabase.from('trainings').select('*').order('date', { ascending: true });
  if (error) { console.error('Error fetching trainings:', error); return []; }
  return data.map(mapTraining);
}

export async function getTrainingsByCompany(companyId) {
  const { data, error } = await supabase.from('trainings').select('*').eq('company_id', companyId).order('date', { ascending: true });
  if (error) { console.error('Error fetching trainings by company:', error); return []; }
  return data.map(mapTraining);
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

  if (error) { console.error('Error adding training:', error); return null; }

  if (training.deliverableId) {
    await supabase.from('deliverables').update({ status: 'agendado' }).eq('id', training.deliverableId);
  }

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

  if (error) { console.error('Error updating training:', error); return null; }

  // Sincronizar com deliverables
  if (data.deliverable_id && updates.status) {
    let delivStatus = 'agendado';
    if (updates.status === 'concluido') delivStatus = 'entregue';
    if (updates.status === 'adiado') delivStatus = 'adiado';
    if (updates.status === 'nao_feito') delivStatus = 'pendente';
    
    await supabase.from('deliverables').update({ status: delivStatus }).eq('id', data.deliverable_id);
  }

  return mapTraining(data);
}

export async function deleteTraining(trainingId) {
  // Fetch training to get deliverable_id before deleting
  const { data: training } = await supabase.from('trainings').select('deliverable_id').eq('id', trainingId).single();

  const { error } = await supabase.from('trainings').delete().eq('id', trainingId);
  if (error) {
    console.error('Error deleting training:', error);
    return;
  }

  // Revert deliverable to pendente
  if (training && training.deliverable_id) {
    await supabase.from('deliverables').update({ status: 'pendente' }).eq('id', training.deliverable_id);
  }
}

// --- Contracts ---
export async function getContracts() {
  const { data, error } = await supabase.from('contracts').select('*');
  if (error) { console.error('Error fetching contracts:', error); return []; }
  return data.map(mapContract);
}

export async function getContractsByCompany(companyId) {
  const { data, error } = await supabase.from('contracts').select('*').eq('company_id', companyId);
  if (error) { console.error('Error fetching contracts by company:', error); return []; }
  return data.map(mapContract);
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
    console.error('Error adding contract:', error);
    alert(`Erro ao adicionar contrato: ${error.message}`);
    return null;
  }
  return mapContract(data);
}

export async function updateContract(contractId, updates) {
  const snakeUpdates = {};
  if (updates.status !== undefined) snakeUpdates.status = updates.status;
  if (updates.filePath !== undefined) snakeUpdates.file_path = updates.filePath;

  const { data, error } = await supabase.from('contracts').update(snakeUpdates).eq('id', contractId).select().single();
  if (error) { console.error('Error updating contract:', error); return null; }
  return mapContract(data);
}

// --- Deliverables ---
export async function getDeliverables() {
  const { data, error } = await supabase.from('deliverables').select('*').order('due_date', { ascending: true });
  if (error) { console.error('Error fetching deliverables:', error); return []; }
  return data.map(mapDeliverable);
}

export async function getDeliverablesByCompany(companyId) {
  const { data, error } = await supabase.from('deliverables').select('*').eq('company_id', companyId);
  if (error) { console.error('Error fetching deliverables by company:', error); return []; }
  return data.map(mapDeliverable);
}

export async function getDeliverablesByContract(contractId) {
  const { data, error } = await supabase.from('deliverables').select('*').eq('contract_id', contractId);
  if (error) { console.error('Error fetching deliverables by contract:', error); return []; }
  return data.map(mapDeliverable);
}

export async function addDeliverable(deliverable) {
  const isLaudoDoc = deliverable.type === 'laudo' || isLaudo(deliverable);
  const emissaoVal = deliverable.dataEmissao || deliverable.dataEnvio || deliverable.dueDate || null;
  let validityVal = isLaudoDoc ? null : (deliverable.validityDate || null);
  if (!isLaudoDoc && !validityVal && emissaoVal) {
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

  // 1. Get the company's group_id
  const { data: company } = await supabase.from('companies').select('group_id').eq('id', deliverable.companyId).single();
  
  if (company && company.group_id) {
    // 2. Get all companies in the same group
    const { data: groupCompanies } = await supabase.from('companies').select('id').eq('group_id', company.group_id);
    
    if (groupCompanies && groupCompanies.length > 0) {
      let createdDeliverable = null;
      for (const gc of groupCompanies) {
        // Check if exists
        const { data: existing } = await supabase.from('deliverables')
          .select('id')
          .eq('company_id', gc.id)
          .eq('title', deliverable.title)
          .eq('type', deliverable.type)
          .maybeSingle();
          
        if (!existing) {
          const insertPayload = {
            company_id: gc.id,
            contract_id: gc.id === deliverable.companyId ? deliverable.contractId : null,
            title: deliverable.title,
            type: deliverable.type,
            status: deliverable.status || 'pendente',
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

          if (insRes.error) console.error('Error adding deliverable to group company:', insRes.error);
          
          if (gc.id === deliverable.companyId && insRes.data) {
            createdDeliverable = insRes.data;
          }
        } else {
          // Já existe entregável com este título no grupo: atualiza emissão, validade e status
          const updatePayload = {
            due_date: emissaoVal,
            data_envio: emissaoVal,
            data_emissao: emissaoVal,
            validity_date: validityVal,
            ultima_revisao: revisaoVal,
            status: deliverable.status || 'pendente',
          };
          if (deliverable.description !== undefined) updatePayload.description = deliverable.description;
          if (deliverable.responsibleId !== undefined) updatePayload.responsible_id = deliverable.responsibleId;
          if (deliverable.fileName) updatePayload.file_name = deliverable.fileName;
          if (deliverable.deliveredDate) updatePayload.delivered_date = deliverable.deliveredDate;

          let upRes = await supabase.from('deliverables').update(updatePayload).eq('id', existing.id).select().single();
          if (upRes.error && upRes.error.message && (upRes.error.message.includes('column') || upRes.error.code === 'PGRST204')) {
            delete updatePayload.data_emissao;
            upRes = await supabase.from('deliverables').update(updatePayload).eq('id', existing.id).select().single();
          }

          if (gc.id === deliverable.companyId) {
            createdDeliverable = upRes.data || existing;
          }
        }
      }
      
      if (!createdDeliverable) {
         const insertPayload = {
            company_id: deliverable.companyId,
            contract_id: deliverable.contractId,
            title: deliverable.title,
            type: deliverable.type,
            status: deliverable.status || 'pendente',
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
         createdDeliverable = insRes.data;
      }
      return mapDeliverable(createdDeliverable);
    }
  }

  // Fallback
  const insertPayload = {
    company_id: deliverable.companyId,
    contract_id: deliverable.contractId,
    title: deliverable.title,
    type: deliverable.type,
    status: deliverable.status || 'pendente',
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
  if (insRes.error) { console.error('Error adding deliverable:', insRes.error); return null; }
  return mapDeliverable(insRes.data);
}

export async function updateDeliverable(deliverableId, updates) {
  // Fetch current deliverable to know title, type, and company_id
  const { data: currentDeliv } = await supabase.from('deliverables')
    .select('company_id, title, type')
    .eq('id', deliverableId)
    .single();

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
  if (updates.type === 'laudo' || isLaudo(updates)) {
    snakeUpdates.validity_date = null;
  } else if (updates.validityDate !== undefined) {
    snakeUpdates.validity_date = updates.validityDate;
  }
  if (updates.ultimaRevisao !== undefined) snakeUpdates.ultima_revisao = updates.ultimaRevisao;
  if (updates.status !== undefined) snakeUpdates.status = updates.status;
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
  if (error) { console.error('Error updating deliverable:', error); return null; }



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

  return mapDeliverable(data);
}

export async function deleteDeliverable(deliverableId) {
  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', deliverableId);

  if (error) {
    console.error('Error deleting deliverable:', error);
    throw error;
  }
  return true;
}

export async function deleteDeliverables(deliverableIds) {
  if (!deliverableIds || deliverableIds.length === 0) return true;
  const { error } = await supabase
    .from('deliverables')
    .delete()
    .in('id', deliverableIds);

  if (error) {
    console.error('Error bulk deleting deliverables:', error);
    throw error;
  }
  return true;
}

export async function getAllDeliverablesSummary() {
  // To avoid multiple queries, we can fetch all and map
  const deliverables = await getDeliverables();
  const companies = await getCompanies();
  const contracts = await getContracts();

  return deliverables.map(d => ({
    ...d,
    companyName: companies.find(c => c.id === d.companyId)?.name || 'N/A',
    contractNumber: contracts.find(c => c.id === d.contractId)?.contractNumber || 'N/A',
  }));
}

// --- Storage (Arquivos) ---
export async function uploadDocument(file, folderPath) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${folderPath}/${fileName}`;

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading file:', error);
    return null;
  }
  return filePath;
}

export function getDocumentUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
  return data.publicUrl;
}

// --- Inventory ---
export async function getInventory() {
  const { data, error } = await supabase.from('inventory').select('*').order('name', { ascending: true });
  if (error) { console.error('Error fetching inventory:', error); return []; }
  
  return data.map(item => {
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
  if (error) { console.error('Error adding inventory item:', error); return null; }
  return data;
}

export async function updateInventoryItem(itemId, updates) {
  const payload = { ...updates };
  if (payload.sector) {
    payload.category = `[${payload.sector}] ${payload.category || ''}`.trim();
    delete payload.sector;
  }
  const { data, error } = await supabase.from('inventory').update(payload).eq('id', itemId).select().single();
  if (error) { console.error('Error updating inventory item:', error); return null; }
  return data;
}

export async function deleteInventoryItem(itemId) {
  const { error } = await supabase.from('inventory').delete().eq('id', itemId);
  if (error) console.error('Error deleting inventory item:', error);
}

// --- Profiles / Users ---
export async function getProfiles() {
  const { data, error } = await supabase.from('profiles').select('id, name, role').order('name', { ascending: true });
  if (error) { console.error('Error fetching profiles:', error); return []; }
  return data;
}

// --- Custom Trainings (Certificates) ---
export { getCustomTrainings, saveCustomTraining, deleteCustomTraining } from './customTrainingsService';

