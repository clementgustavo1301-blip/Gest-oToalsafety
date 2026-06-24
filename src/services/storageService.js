import { supabase } from '../lib/supabase';

// --- Helpers to map between DB (snake_case) and Frontend (camelCase) ---

function mapCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    cnpj: row.cnpj,
    contact: row.contact,
    phone: row.phone,
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
    dueDate: row.due_date,
    validityDate: row.validity_date,
    deliveredDate: row.delivered_date,
    fileName: row.file_name,
    reason: row.reason,
    description: row.description,
  };
}

function mapTraining(row) {
  if (!row) return null;
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
    description: row.description
  };
}

// --- Groups ---
export async function getGroups() {
  const { data, error } = await supabase.from('groups').select('*').order('created_at', { ascending: true });
  if (error) { console.error('Error fetching groups:', error); return []; }
  return data;
}

export async function addGroup(group) {
  const { data, error } = await supabase.from('groups').insert([{ name: group.name }]).select().single();
  if (error) { console.error('Error adding group:', error); return null; }
  return data;
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
  const { data, error } = await supabase.from('companies').insert([{
    group_id: company.groupId,
    name: company.name,
    cnpj: company.cnpj,
    contact: company.contact,
    phone: company.phone
  }]).select().single();
  if (error) { 
    console.error('Error adding company:', error); 
    if (error.code === '23505') {
      alert('Erro: Já existe uma empresa cadastrada com este CNPJ!');
    } else {
      alert(`Erro ao adicionar empresa: ${error.message}`);
    }
    return null; 
  }

  const standardDeliverables = [
    { company_id: data.id, title: 'Visita Técnica In Loco', type: 'visita_tecnica', status: 'pendente', description: 'Mensal (4h/Visita)' },
    { company_id: data.id, title: 'PGR & Mapa de Riscos', type: 'programa', status: 'pendente', description: 'Anual / Alteração' },
    { company_id: data.id, title: 'Avaliações Psicossociais', type: 'laudo', status: 'pendente', description: 'Estruturação Inicial' },
    { company_id: data.id, title: 'LTCAT & LTIP', type: 'laudo', status: 'pendente', description: 'Conforme Legislação' },
    { company_id: data.id, title: 'PCA (Conservação Auditiva)', type: 'programa', status: 'pendente', description: 'Anual' },
    { company_id: data.id, title: 'Apoio Técnico e Perícias', type: 'programa', status: 'pendente', description: 'Sob Demanda' },
    { company_id: data.id, title: 'Treinamentos Digitais (EaD)', type: 'treinamento', status: 'pendente', description: 'Contínuo' },
    { company_id: data.id, title: 'Palestras Preventivas', type: 'treinamento', status: 'pendente', description: 'Conforme PGR' },
    { company_id: data.id, title: 'PCMSO Base & Relatório', type: 'programa', status: 'pendente', description: 'Anual' },
    { company_id: data.id, title: 'Eventos eSocial (S-2240)', type: 'programa', status: 'pendente', description: 'Contínuo' },
    { company_id: data.id, title: 'PPP Digital', type: 'programa', status: 'pendente', description: 'Contínuo' }
  ];

  const { error: delivError } = await supabase.from('deliverables').insert(standardDeliverables);
  if (delivError) {
    console.error('Error adding standard deliverables:', delivError);
  }

  return mapCompany(data);
}

export async function updateCompany(companyId, updates) {
  const snakeUpdates = {};
  if (updates.name !== undefined) snakeUpdates.name = updates.name;
  if (updates.cnpj !== undefined) snakeUpdates.cnpj = updates.cnpj;
  if (updates.contact !== undefined) snakeUpdates.contact = updates.contact;
  if (updates.phone !== undefined) snakeUpdates.phone = updates.phone;

  const { data, error } = await supabase.from('companies').update(snakeUpdates).eq('id', companyId).select().single();
  if (error) { console.error('Error updating company:', error); return null; }
  return mapCompany(data);
}

export async function deleteCompany(companyId) {
  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) console.error('Error deleting company:', error);
}

// --- Trainings ---
export async function getTrainings() {
  const { data, error } = await supabase.from('trainings').select('*').order('date', { ascending: true });
  if (error) { console.error('Error fetching trainings:', error); return []; }
  return data.map(mapTraining);
}

export async function getTrainingsByCompany(companyId) {
  const { data, error } = await supabase.from('trainings').select('*').eq('company_id', companyId);
  if (error) { console.error('Error fetching trainings by company:', error); return []; }
  return data.map(mapTraining);
}

export async function addTraining(training) {
  const { data, error } = await supabase.from('trainings').insert([{
    company_id: training.companyId,
    deliverable_id: training.deliverableId,
    title: training.title,
    date: training.date,
    time: training.time,
    status: training.status,
    instructor: training.instructor,
    participants: training.participants,
    description: training.description
  }]).select().single();
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
  if (updates.description !== undefined) snakeUpdates.description = updates.description;
  if (updates.date !== undefined) snakeUpdates.date = updates.date;
  if (updates.time !== undefined) snakeUpdates.time = updates.time;

  const { data, error } = await supabase.from('trainings').update(snakeUpdates).eq('id', trainingId).select().single();
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
          const { data, error } = await supabase.from('deliverables').insert([{
            company_id: gc.id,
            contract_id: gc.id === deliverable.companyId ? deliverable.contractId : null,
            title: deliverable.title,
            type: deliverable.type,
            status: deliverable.status,
            due_date: deliverable.dueDate,
            validity_date: deliverable.validityDate,
            delivered_date: deliverable.deliveredDate,
            file_name: deliverable.fileName,
            reason: deliverable.reason,
            description: deliverable.description
          }]).select().single();
          
          if (error) console.error('Error adding deliverable to group company:', error);
          
          if (gc.id === deliverable.companyId && data) {
            createdDeliverable = data;
          }
        } else if (gc.id === deliverable.companyId) {
           const { data } = await supabase.from('deliverables').select('*').eq('id', existing.id).single();
           createdDeliverable = data;
        }
      }
      
      if (!createdDeliverable) {
         const { data } = await supabase.from('deliverables').insert([{
            company_id: deliverable.companyId,
            contract_id: deliverable.contractId,
            title: deliverable.title,
            type: deliverable.type,
            status: deliverable.status,
            due_date: deliverable.dueDate,
            validity_date: deliverable.validityDate,
            delivered_date: deliverable.deliveredDate,
            file_name: deliverable.fileName,
            reason: deliverable.reason,
            description: deliverable.description
         }]).select().single();
         createdDeliverable = data;
      }
      return mapDeliverable(createdDeliverable);
    }
  }

  // Fallback
  const { data, error } = await supabase.from('deliverables').insert([{
    company_id: deliverable.companyId,
    contract_id: deliverable.contractId,
    title: deliverable.title,
    type: deliverable.type,
    status: deliverable.status,
    due_date: deliverable.dueDate,
    validity_date: deliverable.validityDate,
    delivered_date: deliverable.deliveredDate,
    file_name: deliverable.fileName,
    reason: deliverable.reason,
    description: deliverable.description
  }]).select().single();
  if (error) { console.error('Error adding deliverable:', error); return null; }
  return mapDeliverable(data);
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
  if (updates.dueDate !== undefined) snakeUpdates.due_date = updates.dueDate;
  if (updates.validityDate !== undefined) snakeUpdates.validity_date = updates.validityDate;
  if (updates.status !== undefined) snakeUpdates.status = updates.status;
  if (updates.reason !== undefined) snakeUpdates.reason = updates.reason;
  if (updates.fileName !== undefined) snakeUpdates.file_name = updates.fileName;
  if (updates.deliveredDate !== undefined) snakeUpdates.delivered_date = updates.deliveredDate;

  const { data, error } = await supabase.from('deliverables').update(snakeUpdates).eq('id', deliverableId).select().single();
  if (error) { console.error('Error updating deliverable:', error); return null; }

  // Sincronizar com outras empresas do grupo se o status for 'entregue'
  if (currentDeliv && updates.status === 'entregue') {
     const { data: company } = await supabase.from('companies').select('group_id').eq('id', currentDeliv.company_id).single();
     if (company && company.group_id) {
       const { data: groupCompanies } = await supabase.from('companies').select('id').eq('group_id', company.group_id);
       if (groupCompanies && groupCompanies.length > 0) {
         const companyIds = groupCompanies.map(c => c.id).filter(id => id !== currentDeliv.company_id);
         
         if (companyIds.length > 0) {
           const syncUpdates = { status: 'entregue' };
           if (updates.fileName !== undefined) syncUpdates.file_name = updates.fileName;
           if (updates.deliveredDate !== undefined) syncUpdates.delivered_date = updates.deliveredDate;

           await supabase.from('deliverables')
             .update(syncUpdates)
             .in('company_id', companyIds)
             .eq('title', currentDeliv.title)
             .eq('type', currentDeliv.type);
         }
       }
     }
  }

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
  return data;
}

export async function addInventoryItem(item) {
  const { data, error } = await supabase.from('inventory').insert([item]).select().single();
  if (error) { console.error('Error adding inventory item:', error); return null; }
  return data;
}

export async function updateInventoryItem(itemId, updates) {
  const { data, error } = await supabase.from('inventory').update(updates).eq('id', itemId).select().single();
  if (error) { console.error('Error updating inventory item:', error); return null; }
  return data;
}

export async function deleteInventoryItem(itemId) {
  const { error } = await supabase.from('inventory').delete().eq('id', itemId);
  if (error) console.error('Error deleting inventory item:', error);
}
