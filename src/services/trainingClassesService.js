import { supabase } from '../lib/supabase';

const LOCAL_CLASSES_KEY = 'totalsafety_training_classes';
const LOCAL_ENROLLMENTS_KEY = 'totalsafety_training_enrollments';

// Helper local storage
const getLocal = (key) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    }
  } catch (e) {
    console.warn(`[TrainingStorage] Erro ao ler ${key}:`, e);
  }
  return [];
};

const setLocal = (key, data) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    console.warn(`[TrainingStorage] Erro ao gravar ${key}:`, e);
  }
};

const normalizeTrainingClass = (trainingClass) => {
  const c = { ...trainingClass };
  if (!Array.isArray(c.instructors) || c.instructors.length === 0) {
    c.instructors = c.instructor_name ? [{
      id: 'inst-1',
      name: c.instructor_name || '',
      role: c.instructor_role || '',
      registration: c.instructor_registration || ''
    }] : [];
  }
  c.coordinator = c.coordinator || c.tech_lead?.coordinator || null;
  return c;
};

/**
 * ---------------- TURMAS (CLASSES) ----------------
 */

export async function getTrainingClasses() {
  try {
    const { data, error } = await supabase
      .from('training_classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const normalizedData = data.map(normalizeTrainingClass);
      setLocal(LOCAL_CLASSES_KEY, normalizedData);
      return normalizedData;
    }
  } catch (err) {
    console.warn('[TrainingClasses] Supabase indisponível, usando cache:', err.message);
  }

  const local = getLocal(LOCAL_CLASSES_KEY);
  return local.map(normalizeTrainingClass);
}

export async function getTrainingClassById(id) {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from('training_classes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const normalizedClass = normalizeTrainingClass(data);
    const localList = getLocal(LOCAL_CLASSES_KEY);
    const existingIdx = localList.findIndex(c => String(c.id) === String(normalizedClass.id));
    if (existingIdx >= 0) {
      localList[existingIdx] = normalizedClass;
    } else {
      localList.unshift(normalizedClass);
    }
    setLocal(LOCAL_CLASSES_KEY, localList);
    return normalizedClass;
  } catch (err) {
    const cachedClass = getLocal(LOCAL_CLASSES_KEY)
      .find(c => String(c.id) === String(id));

    if (cachedClass) return normalizeTrainingClass(cachedClass);

    console.warn('[TrainingClasses] Falha ao carregar a turma pública:', err.message);
    throw new Error('Não foi possível carregar os dados desta turma. Tente novamente.');
  }
}

export async function saveTrainingClass(turma) {
  const isNew = !turma.id || String(turma.id).startsWith('local-');

  const instructors = Array.isArray(turma.instructors) && turma.instructors.length > 0
    ? turma.instructors.map((inst, idx) => ({
        id: inst.id || `inst-${idx + 1}-${Date.now()}`,
        name: (inst.name || '').trim(),
        role: (inst.role || '').trim(),
        registration: (inst.registration || '').trim()
      }))
    : [
        {
          id: 'inst-1',
          name: (turma.instructor_name || turma.instrutorNome || '').trim(),
          role: (turma.instructor_role || turma.instrutorCargo || '').trim(),
          registration: (turma.instructor_registration || turma.instrutorRegistro || '').trim()
        }
      ];

  const coordinator = turma.coordinator || turma.tech_lead?.coordinator || null;
  const techLead = {
    ...(turma.tech_lead || {
    name: (turma.tech_lead_name || 'Eider Gomes do Nascimento').trim(),
    role: (turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança').trim(),
    registration: (turma.tech_lead_registration || 'CREA 210874512-0 / MTE 0009995/RN').trim()
    }),
    coordinator
  };
  const primaryInstructor = (instructors && instructors.length > 0) ? instructors[0] : {};

  const payload = {
    name: turma.name,
    course_name: turma.course_name || turma.curso || '',
    description: turma.description || turma.descricao || '',
    instructors: instructors,
    instructor_name: primaryInstructor.name || '',
    instructor_role: primaryInstructor.role || '',
    instructor_registration: primaryInstructor.registration || '',
    tech_lead: techLead,
    tech_lead_name: techLead.name || '',
    tech_lead_role: techLead.role || '',
    tech_lead_registration: techLead.registration || '',
    duration: turma.duration || turma.duracao || '',
    validade: turma.validade || '24 meses',
    cert_model: turma.cert_model || 'modelo1',
    start_date: turma.start_date || turma.data || null,
    location: turma.location || turma.local || '',
    company: turma.company || turma.empresa || '',
    content: turma.content || turma.conteudo || '',
    status: turma.status || 'Aberta',
    updated_at: new Date().toISOString()
  };

  try {
    let response;
    if (isNew) {
      response = await supabase
        .from('training_classes')
        .insert([payload])
        .select()
        .single();
    } else {
      response = await supabase
        .from('training_classes')
        .update(payload)
        .eq('id', turma.id)
        .select()
        .single();
    }

    if (response.error) throw response.error;
    if (!response.data) throw new Error('O banco não retornou a turma salva.');

    const savedItem = response.data;
    if (!savedItem.instructors || savedItem.instructors.length === 0) {
      savedItem.instructors = instructors;
    }

    const localList = getLocal(LOCAL_CLASSES_KEY);
    const existingIdx = localList.findIndex(c => String(c.id) === String(savedItem.id));
    if (existingIdx >= 0) {
      localList[existingIdx] = savedItem;
    } else {
      localList.unshift(savedItem);
    }
    setLocal(LOCAL_CLASSES_KEY, localList);

    return normalizeTrainingClass(savedItem);
  } catch (err) {
    console.error('[TrainingClasses] Falha ao persistir no Supabase:', err.message);
    throw new Error('Não foi possível salvar a turma no servidor. Verifique a conexão e tente novamente.');
  }
}

export async function deleteTrainingClass(id) {
  try {
    await supabase.from('training_classes').delete().eq('id', id);
  } catch (e) {
    console.warn('[TrainingClasses] Erro ao deletar no Supabase:', e);
  }

  const localList = getLocal(LOCAL_CLASSES_KEY).filter(c => c.id !== id);
  setLocal(LOCAL_CLASSES_KEY, localList);
  return true;
}

/**
 * ---------------- INSCRIÇÕES (ENROLLMENTS) ----------------
 */

export async function getTrainingEnrollments(turmaId = null) {
  try {
    let query = supabase
      .from('training_enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (turmaId) {
      query = query.eq('turma_id', turmaId);
    }

    const { data, error } = await query;
    if (!error && data) {
      // Atualiza o local storage
      const existing = getLocal(LOCAL_ENROLLMENTS_KEY);
      const combined = [...data];
      // Mantém locais que não estão no banco (se houver)
      existing.forEach(e => {
        if (!combined.some(c => c.id === e.id)) {
          combined.push(e);
        }
      });
      setLocal(LOCAL_ENROLLMENTS_KEY, combined);
      return data;
    }
  } catch (err) {
    console.warn('[TrainingEnrollments] Supabase indisponível, usando cache:', err.message);
  }

  const local = getLocal(LOCAL_ENROLLMENTS_KEY);
  if (turmaId) {
    return local.filter(e => e.turma_id === turmaId);
  }
  return local;
}

export async function registerStudent(studentData) {
  if (!studentData.turma_id) {
    throw new Error('O link de inscrição não está vinculado a uma turma.');
  }

  const cpfDigits = String(studentData.cpf || '').replace(/\D/g, '').slice(0, 11);
  if (cpfDigits.length !== 11 || !(studentData.nome || '').trim()) {
    throw new Error('Os dados do participante estão incompletos.');
  }

  const normalizedCpf = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  const payload = {
    turma_id: studentData.turma_id,
    nome: studentData.nome.trim(),
    cpf: normalizedCpf,
    matricula: studentData.matricula ? String(studentData.matricula).trim() : null,
    data_nascimento: studentData.data_nascimento || null,
    telefone: studentData.telefone || null,
    empresa: studentData.empresa || null,
    status: studentData.status || 'Inscrito',
    created_at: new Date().toISOString()
  };

  try {
    const { error } = await supabase
      .from('training_enrollments')
      .insert([payload]);

    if (error?.code === '23505') {
      return { ...payload, already_registered: true };
    }
    if (error) throw error;

    return payload;
  } catch (err) {
    console.error('[TrainingEnrollments] Falha ao registrar no Supabase:', err.message);
    throw new Error('Não foi possível registrar sua presença no servidor. Tente novamente.');
  }
}

export async function importTrainingEnrollments(turmaId, participants = []) {
  if (!turmaId) {
    throw new Error('Selecione uma turma antes de importar a planilha.');
  }

  const importParticipant = async (participant) => {
    try {
      const saved = await registerStudent({
        turma_id: turmaId,
        nome: participant.nome,
        cpf: participant.cpf,
        matricula: participant.matricula || null,
        status: 'Inscrito'
      });
      return {
        participant,
        status: saved?.already_registered ? 'duplicate' : 'imported'
      };
    } catch (error) {
      return {
        participant,
        status: 'failed',
        message: error?.message || 'Não foi possível importar este participante.'
      };
    }
  };

  const results = [];
  const batchSize = 8;
  for (let start = 0; start < participants.length; start += batchSize) {
    const batch = participants.slice(start, start + batchSize);
    results.push(...await Promise.all(batch.map(importParticipant)));
  }

  return {
    imported: results.filter(result => result.status === 'imported').length,
    duplicates: results.filter(result => result.status === 'duplicate').length,
    failed: results.filter(result => result.status === 'failed'),
    results
  };
}

export async function updateStudent(id, updates) {
  try {
    await supabase.from('training_enrollments').update(updates).eq('id', id);
  } catch (e) {
    console.warn('[TrainingEnrollments] Erro update no Supabase:', e);
  }

  const localList = getLocal(LOCAL_ENROLLMENTS_KEY).map(item => {
    if (item.id === id) return { ...item, ...updates };
    return item;
  });
  setLocal(LOCAL_ENROLLMENTS_KEY, localList);
  return true;
}

export async function deleteStudent(id) {
  try {
    await supabase.from('training_enrollments').delete().eq('id', id);
  } catch (e) {
    console.warn('[TrainingEnrollments] Erro delete no Supabase:', e);
  }

  const localList = getLocal(LOCAL_ENROLLMENTS_KEY).filter(item => item.id !== id);
  setLocal(LOCAL_ENROLLMENTS_KEY, localList);
  return true;
}

/**
 * Assina atualizações em tempo real das inscrições
 */
export function subscribeToEnrollments(onNewEnrollment) {
  try {
    const channel = supabase
      .channel('public:training_enrollments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'training_enrollments' }, (payload) => {
        if (payload?.new) {
          onNewEnrollment(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn('Erro ao configurar canal realtime:', e);
    return () => {};
  }
}
