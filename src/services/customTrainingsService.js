import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'total_safety_custom_trainings';

const safeGetLocal = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
  } catch (e) {
    console.warn('Erro ao ler do localStorage:', e);
  }
  return [];
};

const safeSetLocal = (list) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Erro ao gravar no localStorage:', e);
  }
};

/**
 * Busca todos os treinamentos personalizados salvos.
 * Prioriza o banco de dados Supabase e utiliza localStorage como fallback/cache resiliente.
 */
export async function getCustomTrainings() {
  let dbTrainings = [];
  let tableMissing = false;
  let dbError = null;

  try {
    const { data, error } = await supabase
      .from('custom_trainings')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      dbTrainings = data;
      const localList = safeGetLocal();
      const merged = data.map(item => {
        const local = localList.find(l => (l.id && l.id === item.id) || (l.name && item.name && l.name.toLowerCase() === item.name.toLowerCase()));
        return {
          ...item,
          validade: local?.validade || item.validade || '24 meses',
          cert_model: local?.cert_model || item.cert_model || 'modelo1'
        };
      });
      safeSetLocal(merged);
      return { trainings: merged, tableMissing: false, error: null };
    } else if (error) {
      dbError = error;
      if (error.code === 'PGRST205') {
        tableMissing = true;
      }
      console.warn('[CustomTrainings] Aviso ao buscar do Supabase:', error.message);
    }
  } catch (err) {
    dbError = err;
    console.warn('[CustomTrainings] Exceção ao consultar Supabase:', err.message);
  }

  // Fallback para localStorage
  const localTrainings = safeGetLocal();

  return {
    trainings: localTrainings,
    tableMissing,
    error: dbError
  };
}

/**
 * Salva ou atualiza um treinamento personalizado.
 * Salva no banco de dados Supabase (upsert pelo nome) e no localStorage.
 */
export async function saveCustomTraining(training) {
  if (!training || !training.name || !training.name.trim()) {
    throw new Error('O nome do treinamento é obrigatório para salvar.');
  }

  const trimmedName = training.name.trim();
  const payload = {
    name: trimmedName,
    duracao: training.duracao || '',
    conteudo: training.conteudo || '',
    descricao: training.descricao || '',
    instrutor_nome: training.instrutorNome || '',
    instrutor_cargo: training.instrutorCargo || '',
    instrutor_registro: training.instrutorRegistro || '',
    updated_at: new Date().toISOString()
  };

  let savedData = null;
  let savedToDb = false;
  let dbError = null;

  try {
    const { data, error } = await supabase
      .from('custom_trainings')
      .upsert([payload], { onConflict: 'name' })
      .select()
      .single();

    if (!error && data) {
      savedData = data;
      savedToDb = true;
    } else if (error) {
      dbError = error;
      console.warn('[CustomTrainings] Não foi possível salvar no banco de dados:', error.message);
    }
  } catch (err) {
    dbError = err;
    console.warn('[CustomTrainings] Erro de rede/conexão ao salvar no Supabase:', err.message);
  }

  // Sempre sincroniza com localStorage para garantir que nada seja perdido
  try {
    const list = safeGetLocal();
    const index = list.findIndex(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    
    const localItem = {
      ...(savedData || {}),
      id: savedData?.id || training.id || `local-${Date.now()}`,
      ...payload,
      validade: training.validade || '24 meses',
      cert_model: training.cert_model || 'modelo1',
      created_at: savedData?.created_at || new Date().toISOString()
    };

    if (index >= 0) {
      list[index] = { ...list[index], ...localItem };
    } else {
      list.push(localItem);
    }

    safeSetLocal(list);
    if (!savedData) savedData = localItem;
  } catch (e) {
    console.error('Erro ao sincronizar com localStorage:', e);
  }

  return {
    success: true,
    data: savedData,
    savedToDb,
    error: dbError
  };
}

/**
 * Exclui um treinamento personalizado pelo ID ou Nome.
 */
export async function deleteCustomTraining(id, name) {
  let dbError = null;

  try {
    let query = supabase.from('custom_trainings').delete();
    if (id && !String(id).startsWith('local-')) {
      query = query.eq('id', id);
    } else if (name) {
      query = query.eq('name', name);
    }
    const { error } = await query;
    if (error) dbError = error;
  } catch (err) {
    dbError = err;
  }

  // Remove do localStorage
  try {
    let list = safeGetLocal();
    list = list.filter(t => (id && t.id !== id) && (!name || t.name !== name));
    safeSetLocal(list);
  } catch (e) {
    console.error('Erro ao excluir do localStorage:', e);
  }

  return { success: true, error: dbError };
}
