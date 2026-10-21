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
      const normalizedData = data.map(c => {
        if (!Array.isArray(c.instructors) || c.instructors.length === 0) {
          c.instructors = [
            {
              id: 'inst-1',
              name: c.instructor_name || '',
              role: c.instructor_role || '',
              registration: c.instructor_registration || ''
            }
          ];
        }
        return c;
      });
      setLocal(LOCAL_CLASSES_KEY, normalizedData);
      return normalizedData;
    }
  } catch (err) {
    console.warn('[TrainingClasses] Supabase indisponível, usando cache:', err.message);
  }

  const local = getLocal(LOCAL_CLASSES_KEY);
  return local.map(c => {
    if (!Array.isArray(c.instructors) || c.instructors.length === 0) {
      c.instructors = [
        {
          id: 'inst-1',
          name: c.instructor_name || '',
          role: c.instructor_role || '',
          registration: c.instructor_registration || ''
        }
      ];
    }
    return c;
  });
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

  const techLead = turma.tech_lead || {
    name: (turma.tech_lead_name || 'Eider Gomes do Nascimento').trim(),
    role: (turma.tech_lead_role || 'Responsável Técnico / Engenheiro de Segurança').trim(),
    registration: (turma.tech_lead_registration || 'CREA 210874512-0 / MTE 0009995/RN').trim()
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

  let savedItem = null;

  try {
    if (isNew) {
      const { data, error } = await supabase
        .from('training_classes')
        .insert([payload])
        .select()
        .single();
      if (!error && data) savedItem = data;
    } else {
      const { data, error } = await supabase
        .from('training_classes')
        .update(payload)
        .eq('id', turma.id)
        .select()
        .single();
      if (!error && data) savedItem = data;
    }
  } catch (err) {
    console.warn('[TrainingClasses] Falha ao persistir no Supabase:', err.message);
  }

  // Local sync
  const localList = getLocal(LOCAL_CLASSES_KEY);
  if (!savedItem) {
    savedItem = {
      id: turma.id || `local-${Date.now()}`,
      ...payload,
      created_at: turma.created_at || new Date().toISOString()
    };
  } else if (!savedItem.instructors || savedItem.instructors.length === 0) {
    savedItem.instructors = instructors;
  }

  const existingIdx = localList.findIndex(c => c.id === savedItem.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = savedItem;
  } else {
    localList.unshift(savedItem);
  }
  setLocal(LOCAL_CLASSES_KEY, localList);

  return savedItem;
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
  const payload = {
    turma_id: studentData.turma_id || null,
    nome: studentData.nome.trim(),
    cpf: studentData.cpf.trim(),
    data_nascimento: studentData.data_nascimento || null,
    telefone: studentData.telefone || null,
    empresa: studentData.empresa || null,
    status: studentData.status || 'Inscrito',
    created_at: new Date().toISOString()
  };

  let savedItem = null;

  try {
    const { data, error } = await supabase
      .from('training_enrollments')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      savedItem = data;
    }
  } catch (err) {
    console.warn('[TrainingEnrollments] Falha ao registrar no Supabase:', err.message);
  }

  if (!savedItem) {
    savedItem = {
      id: `local-${Date.now()}`,
      ...payload
    };
  }

  // Local sync
  const localList = getLocal(LOCAL_ENROLLMENTS_KEY);
  localList.unshift(savedItem);
  setLocal(LOCAL_ENROLLMENTS_KEY, localList);

  return savedItem;
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
