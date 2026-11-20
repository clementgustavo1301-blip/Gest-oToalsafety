import { supabase } from '../lib/supabase';
import { getInstructorSignatureUrl } from '../data/officialTrainingModels.js';

/**
 * Serviço de Gestão e Sincronização em Tempo Real das Assinaturas Manuais da Turma.
 * Suporta múltiplos instrutores e geração de links de uso único que expiram após a assinatura.
 */

const STORAGE_PREFIX = 'totalsafety_turma_signatures_';
const TOKENS_STORAGE_KEY = 'totalsafety_signing_tokens';
const CHANNEL_NAME = 'totalsafety_turma_signatures';
const VALID_ROLE_KEY_REGEX = /^(instructor(?:_\d+)?|tech_lead|coordinator)$/;
const MAX_SIGNATURE_DATA_URL_LENGTH = 600000;

function generateSecureTokenString() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `sig_${hex}`;
  }
  return `sig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isValidSignatureImage(value) {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > MAX_SIGNATURE_DATA_URL_LENGTH) return false;
  return value.startsWith('data:image/png;base64,') || value.startsWith('/signatures/') || value.startsWith('/certificate-templates/');
}

function isUuidString(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function mergeTokenLists(remoteTokens = [], localTokens = []) {
  const map = new Map();
  const statusRank = { pending: 1, revoked: 2, signed: 3 };

  const upsert = (t) => {
    if (!t || !t.token) return;
    const prev = map.get(t.token);
    if (!prev) {
      map.set(t.token, { ...t });
      return;
    }
    const prevRank = statusRank[prev.status] || 0;
    const nextRank = statusRank[t.status] || 0;
    if (nextRank >= prevRank) {
      map.set(t.token, {
        ...prev,
        ...t,
        signatureDataUrl: t.signatureDataUrl || prev.signatureDataUrl || null,
        signedAt: t.signedAt || prev.signedAt || null
      });
    }
  };

  (Array.isArray(remoteTokens) ? remoteTokens : []).forEach(upsert);
  (Array.isArray(localTokens) ? localTokens : []).forEach(upsert);

  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/**
 * Hidrata assinaturas locais a partir de um registro de turma vindo do Supabase.
 */
export function hydrateTurmaSigningStateFromClass(turma) {
  if (!turma?.id || typeof window === 'undefined' || !window.localStorage) return;

  try {
    const turmaId = String(turma.id);
    const remoteSigs = turma.signatures && typeof turma.signatures === 'object' ? turma.signatures : {};

    if (Object.keys(remoteSigs).length > 0) {
      const localSigs = getTurmaSignatures(turmaId);
      const mergedSigs = { ...localSigs };
      let sigChanged = false;
      Object.entries(remoteSigs).forEach(([roleKey, entry]) => {
        if (roleKey === 'updatedAt') return;
        if (entry?.dataUrl && (!mergedSigs[roleKey]?.dataUrl || (!mergedSigs[roleKey].signedAt && entry.signedAt))) {
          mergedSigs[roleKey] = entry;
          sigChanged = true;
        }
      });
      if (sigChanged) {
        localStorage.setItem(`${STORAGE_PREFIX}${turmaId}`, JSON.stringify(mergedSigs));
      }
    }
  } catch (e) {
    console.warn('[TurmaSignatureService] Erro ao hidratar assinaturas remotas:', e);
  }
}

export async function fetchRemoteSigningToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string' || tokenString.length < 12) return null;
  try {
    const { data, error } = await supabase.rpc('get_turma_signing_token', {
      p_token: tokenString
    });
    if (!error && data && data.token) {
      const all = getAllSigningTokens();
      const merged = mergeTokenLists([data], all);
      saveAllSigningTokens(merged);
      return getSigningToken(tokenString);
    }
  } catch {
    // RPC pode não estar instalada ainda; usa fallback local
  }
  return getSigningToken(tokenString);
}

export async function syncTurmaSigningStateToSupabase(turmaId) {
  if (!isUuidString(turmaId)) return;
  try {
    const localSigs = getTurmaSignatures(turmaId);
    const localTokens = getTurmaTokens(turmaId).slice(0, 20);

    const { data: row, error: fetchErr } = await supabase
      .from('training_classes')
      .select('signatures')
      .eq('id', turmaId)
      .maybeSingle();

    if (!fetchErr && row) {
      const mergedSigs = {
        ...(row.signatures && typeof row.signatures === 'object' ? row.signatures : {}),
        ...localSigs
      };

      await supabase
        .from('training_classes')
        .update({
          signatures: mergedSigs,
          updated_at: new Date().toISOString()
        })
        .eq('id', turmaId);
    }

    if (localTokens.length > 0) {
      const tokenRows = localTokens.map((t) => ({
        token: t.token,
        turma_id: turmaId,
        role_key: t.roleKey,
        instructor_id: t.instructorId || null,
        signer_name: t.signerName || '',
        role_title: t.roleTitle || '',
        turma_name: t.turmaName || '',
        course_name: t.courseName || '',
        status: t.status || 'pending',
        signed_at: t.signedAt || null,
        signature_data_url: t.signatureDataUrl || null
      }));

      await supabase
        .from('turma_signing_tokens')
        .upsert(tokenRows, { onConflict: 'token' });
    }
  } catch {
    // Usuário público sem sessão autenticada não altera diretamente (tratado via RPC)
  }
}

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel indisponível
}

/**
 * Obtém as assinaturas manuais coletadas para uma turma
 */
export function getTurmaSignatures(turmaId) {
  if (!turmaId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${turmaId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[TurmaSignatureService] Erro ao ler assinaturas:', e);
  }
  return {};
}

/**
 * Retorna objeto de assinatura padrão oficial correspondente a um nome
 */
export function getDefaultSignatureForName(name, roleTitle = '') {
  if (!name) return null;
  const url = getInstructorSignatureUrl(name);
  if (!url) return null;
  return {
    dataUrl: url,
    signerName: name,
    roleTitle: roleTitle,
    isDefaultOfficial: true
  };
}

/**
 * Inicializa ou preenche as assinaturas oficiais padrão de uma turma com base nos instrutores/responsáveis configurados
 */
export function initializeDefaultSignaturesForTurma(turma) {
  if (!turma || !turma.id) return {};
  const current = getTurmaSignatures(turma.id);
  const updated = { ...current };
  let changed = false;

  // 1. Instrutor principal / lista de instrutores
  const instructors = Array.isArray(turma.instructors) && turma.instructors.length > 0
    ? turma.instructors
    : (turma.instructor_name ? [{ name: turma.instructor_name, role: turma.instructor_role }] : []);

  instructors.forEach((inst, idx) => {
    const key = idx === 0 ? 'instructor' : `instructor_${idx}`;
    if (!updated[key]?.dataUrl && inst.name) {
      const sigUrl = getInstructorSignatureUrl(inst.name);
      if (sigUrl) {
        updated[key] = {
          dataUrl: sigUrl,
          signerName: inst.name,
          roleTitle: inst.role || 'Instrutor',
          isDefaultOfficial: true
        };
        if (key === 'instructor') {
          updated.instructor_0 = updated[key];
        }
        changed = true;
      }
    }
  });

  // 2. Responsável Técnico
  const techLeadName = turma.tech_lead?.name || turma.tech_lead_name;
  if (!updated.tech_lead?.dataUrl && techLeadName && techLeadName.trim()) {
    const sigUrl = getInstructorSignatureUrl(techLeadName);
    if (sigUrl) {
      updated.tech_lead = {
        dataUrl: sigUrl,
        signerName: techLeadName,
        roleTitle: turma.tech_lead?.role || turma.tech_lead_role || 'Responsável Técnico',
        isDefaultOfficial: true
      };
      changed = true;
    }
  }

  // 3. Coordenação Técnica
  const coordName = turma.coordinator?.name || turma.tech_lead?.coordinator?.name;
  if (!updated.coordinator?.dataUrl && coordName && coordName.trim()) {
    const sigUrl = getInstructorSignatureUrl(coordName);
    if (sigUrl) {
      updated.coordinator = {
        dataUrl: sigUrl,
        signerName: coordName,
        roleTitle: turma.coordinator?.role || 'Coordenação Técnica',
        isDefaultOfficial: true
      };
      changed = true;
    }
  }

  if (changed) {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${turma.id}`, JSON.stringify(updated));
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'SIGNATURE_UPDATED',
          turmaId: String(turma.id),
          signatures: updated
        });
      }
    } catch (e) {
      console.warn('Erro ao persistir assinaturas padrão:', e);
    }
  }

  return updated;
}

/**
 * Salva ou atualiza uma assinatura manual de um papel específico na turma
 * @param {string} turmaId
 * @param {string} roleKey 'instructor' | 'instructor_0' | 'instructor_1' | 'tech_lead' | 'coordinator'
 * @param {string} signatureDataUrl Base64 PNG data URL
 * @param {object} meta { signerName, signedAt, roleTitle, instructorId }
 */
export function saveRoleSignature(turmaId, roleKey, signatureDataUrl, meta = {}) {
  if (!turmaId || !roleKey || !VALID_ROLE_KEY_REGEX.test(roleKey)) return null;
  if (!isValidSignatureImage(signatureDataUrl)) {
    console.warn('[TurmaSignatureService] Imagem de assinatura inválida rejeitada.');
    return null;
  }
  try {
    const existing = getTurmaSignatures(turmaId);
    const signatureEntry = {
      dataUrl: signatureDataUrl,
      signerName: meta.signerName || '',
      roleTitle: meta.roleTitle || '',
      signedAt: meta.signedAt || new Date().toISOString(),
      instructorId: meta.instructorId || null
    };

    const updated = {
      ...existing,
      [roleKey]: signatureEntry,
      updatedAt: new Date().toISOString()
    };

    // Sincroniza alias entre 'instructor' e 'instructor_0' para compatibilidade total
    if (roleKey === 'instructor') {
      updated.instructor_0 = signatureEntry;
    } else if (roleKey === 'instructor_0') {
      updated.instructor = signatureEntry;
    }

    localStorage.setItem(`${STORAGE_PREFIX}${turmaId}`, JSON.stringify(updated));

    // Também atualiza o registro da turma na lista de turmas locais
    try {
      const classesRaw = localStorage.getItem('totalsafety_training_classes');
      if (classesRaw) {
        const classes = JSON.parse(classesRaw);
        const idx = classes.findIndex(c => String(c.id) === String(turmaId));
        if (idx >= 0) {
          classes[idx].signatures = updated;
          localStorage.setItem('totalsafety_training_classes', JSON.stringify(classes));
        }
      }
    } catch (e) {
      console.warn('[TurmaSignatureService] Erro ao sincronizar turma:', e);
    }

    // Notifica outros contextos/abas em tempo real
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'SIGNATURE_UPDATED',
        turmaId: String(turmaId),
        roleKey,
        signatures: updated
      });
    }

    if (!meta.skipRemoteSync) {
      syncTurmaSigningStateToSupabase(turmaId).catch(() => {});
    }

    return updated;
  } catch (e) {
    console.error('[TurmaSignatureService] Erro ao salvar assinatura:', e);
    return null;
  }
}

/**
 * Limpa uma ou todas as assinaturas da turma
 */
export function clearTurmaSignature(turmaId, roleKey = null) {
  if (!turmaId) return;
  try {
    if (roleKey) {
      const current = getTurmaSignatures(turmaId);
      delete current[roleKey];
      if (roleKey === 'instructor') delete current.instructor_0;
      if (roleKey === 'instructor_0') delete current.instructor;

      localStorage.setItem(`${STORAGE_PREFIX}${turmaId}`, JSON.stringify(current));
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'SIGNATURE_UPDATED', turmaId: String(turmaId), roleKey, signatures: current });
      }
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${turmaId}`);
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'SIGNATURE_CLEARED', turmaId: String(turmaId), signatures: {} });
      }
    }
  } catch (e) {
    console.warn('[TurmaSignatureService] Erro ao limpar assinatura:', e);
  }
}

/**
 * ---------------- TOKENS DE LINKS EXCLUSIVOS / DE USO ÚNICO ----------------
 */

export function getAllSigningTokens() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(TOKENS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('[TurmaSignatureService] Erro ao ler tokens de assinatura:', e);
    return [];
  }
}

function saveAllSigningTokens(tokens) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.warn('[TurmaSignatureService] Erro ao salvar tokens:', e);
  }
}

/**
 * Retorna todos os tokens vinculados a uma turma
 */
export function getTurmaTokens(turmaId) {
  if (!turmaId) return [];
  const all = getAllSigningTokens();
  return all.filter(t => String(t.turmaId) === String(turmaId));
}

/**
 * Cria ou recupera o token exclusivo de assinatura para um papel/instrutor da turma
 */
export function createOrGetSigningToken(turmaId, roleKey, meta = {}) {
  if (!turmaId || !roleKey || !VALID_ROLE_KEY_REGEX.test(roleKey)) return null;
  const all = getAllSigningTokens();
  const sigs = getTurmaSignatures(turmaId);
  const isAlreadySigned = !!(sigs[roleKey]?.dataUrl || (roleKey === 'instructor_0' && sigs.instructor?.dataUrl));

  // Procura token existente ativo (não revogado) para este papel
  const existingIdx = all.findIndex(t => 
    String(t.turmaId) === String(turmaId) && 
    t.status !== 'revoked' &&
    (t.roleKey === roleKey || (roleKey === 'instructor_0' && t.roleKey === 'instructor')) &&
    (!meta.instructorId || t.instructorId === meta.instructorId)
  );

  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    let dirty = false;
    // Sincroniza estado caso já tenha sido assinado externamente
    if (isAlreadySigned && existing.status !== 'signed') {
      const activeSig = sigs[roleKey] || sigs.instructor;
      existing.status = 'signed';
      existing.signedAt = activeSig.signedAt || new Date().toISOString();
      existing.signatureDataUrl = activeSig.dataUrl;
      dirty = true;
    }
    // Atualiza metadados se necessário
    if (meta.signerName && meta.signerName !== existing.signerName) {
      existing.signerName = meta.signerName;
      existing.roleTitle = meta.roleTitle || existing.roleTitle;
      dirty = true;
    }
    if (dirty) {
      saveAllSigningTokens(all);
    }
    return existing;
  }

  // Gera novo token criptograficamente seguro
  const token = generateSecureTokenString();

  const activeSig = sigs[roleKey] || (roleKey === 'instructor_0' ? sigs.instructor : null);

  const newToken = {
    token,
    turmaId: String(turmaId),
    roleKey,
    instructorId: meta.instructorId || null,
    signerName: meta.signerName || '',
    roleTitle: meta.roleTitle || 'Instrutor(a)',
    turmaName: meta.turmaName || '',
    courseName: meta.courseName || '',
    status: isAlreadySigned ? 'signed' : 'pending',
    createdAt: new Date().toISOString(),
    signedAt: isAlreadySigned ? (activeSig?.signedAt || new Date().toISOString()) : null,
    signatureDataUrl: isAlreadySigned ? activeSig?.dataUrl : null
  };

  all.unshift(newToken);
  saveAllSigningTokens(all);
  syncTurmaSigningStateToSupabase(turmaId).catch(() => {});
  return newToken;
}

/**
 * Força a geração de um novo link descartável (revogando token pendente anterior)
 */
export function generateNewSigningToken(turmaId, roleKey, meta = {}) {
  if (!turmaId || !roleKey || !VALID_ROLE_KEY_REGEX.test(roleKey)) return null;
  const all = getAllSigningTokens();

  // Marca anteriores deste papel como revogados se ainda estavam pendentes
  all.forEach(t => {
    if (String(t.turmaId) === String(turmaId) && t.roleKey === roleKey && t.status === 'pending') {
      t.status = 'revoked';
    }
  });

  const token = generateSecureTokenString();

  const newToken = {
    token,
    turmaId: String(turmaId),
    roleKey,
    instructorId: meta.instructorId || null,
    signerName: meta.signerName || '',
    roleTitle: meta.roleTitle || 'Instrutor(a)',
    turmaName: meta.turmaName || '',
    courseName: meta.courseName || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    signedAt: null,
    signatureDataUrl: null
  };

  all.unshift(newToken);
  saveAllSigningTokens(all);

  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'TOKEN_CREATED',
      turmaId: String(turmaId),
      token: newToken
    });
  }

  syncTurmaSigningStateToSupabase(turmaId).catch(() => {});
  return newToken;
}

/**
 * Busca os dados de um token de assinatura específico
 */
export function getSigningToken(tokenString) {
  if (!tokenString || typeof tokenString !== 'string' || tokenString.length < 12) return null;
  const all = getAllSigningTokens();
  const found = all.find(t => t.token === tokenString);
  if (!found) return null;

  // Cross-check com assinaturas salvas da turma
  const sigs = getTurmaSignatures(found.turmaId);
  const currentSig = sigs[found.roleKey] || (found.roleKey === 'instructor_0' ? sigs.instructor : null);

  if (currentSig?.dataUrl && found.status !== 'signed') {
    found.status = 'signed';
    found.signedAt = currentSig.signedAt || new Date().toISOString();
    found.signatureDataUrl = currentSig.dataUrl;
    saveAllSigningTokens(all);
  }

  return found;
}

/**
 * Conclui e finaliza o token após o usuário assinar.
 * Uma vez concluído, o link NÃO aceita novas assinaturas.
 */
export function completeSigningToken(tokenString, signatureDataUrl) {
  if (!tokenString || !signatureDataUrl) {
    return { success: false, error: 'Dados insuficientes para concluir a assinatura.' };
  }
  if (!isValidSignatureImage(signatureDataUrl) || !signatureDataUrl.startsWith('data:image/png;base64,')) {
    return { success: false, error: 'Formato de assinatura inválido.' };
  }

  const all = getAllSigningTokens();
  const tokenObj = all.find(t => t.token === tokenString);

  if (!tokenObj) {
    return { success: false, error: 'Link de assinatura inválido ou não encontrado.' };
  }

  if (!VALID_ROLE_KEY_REGEX.test(tokenObj.roleKey)) {
    return { success: false, error: 'Papel de assinatura inválido no token.' };
  }

  if (tokenObj.status === 'signed') {
    return { 
      success: false, 
      alreadyCompleted: true, 
      error: 'Este link de assinatura já foi utilizado e finalizado com sucesso.',
      token: tokenObj 
    };
  }

  if (tokenObj.status === 'revoked') {
    return { 
      success: false, 
      error: 'Este link de assinatura foi cancelado ou substituído por um novo link.',
      token: tokenObj 
    };
  }

  const signedAt = new Date().toISOString();
  tokenObj.status = 'signed';
  tokenObj.signedAt = signedAt;
  tokenObj.signatureDataUrl = signatureDataUrl;

  saveAllSigningTokens(all);

  // Aplica a assinatura na turma
  saveRoleSignature(tokenObj.turmaId, tokenObj.roleKey, signatureDataUrl, {
    signerName: tokenObj.signerName,
    roleTitle: tokenObj.roleTitle,
    signedAt,
    instructorId: tokenObj.instructorId,
    skipRemoteSync: true
  });

  if (isUuidString(tokenObj.turmaId)) {
    Promise.resolve(
      supabase.rpc('complete_turma_signing_token', {
        p_turma_id: tokenObj.turmaId,
        p_token: tokenString,
        p_signature_data_url: signatureDataUrl
      })
    )
      .then(({ error }) => {
        if (error) {
          syncTurmaSigningStateToSupabase(tokenObj.turmaId).catch(() => {});
        }
      })
      .catch(() => {
        syncTurmaSigningStateToSupabase(tokenObj.turmaId).catch(() => {});
      });
  }

  if (broadcastChannel) {
    broadcastChannel.postMessage({
      type: 'TOKEN_COMPLETED',
      token: tokenObj
    });
  }

  return { success: true, token: tokenObj };
}

/**
 * Subscreve a atualizações de assinaturas e tokens em tempo real
 */
export function subscribeToTurmaSignatures(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcast = (event) => {
    if (event.data && (
      event.data.type === 'SIGNATURE_UPDATED' || 
      event.data.type === 'SIGNATURE_CLEARED' ||
      event.data.type === 'TOKEN_COMPLETED' ||
      event.data.type === 'TOKEN_CREATED'
    )) {
      callback(event.data);
    }
  };

  const handleStorage = (event) => {
    if (event.key && event.key.startsWith(STORAGE_PREFIX)) {
      const turmaId = event.key.replace(STORAGE_PREFIX, '');
      try {
        const signatures = event.newValue ? JSON.parse(event.newValue) : {};
        callback({ type: 'SIGNATURE_UPDATED', turmaId, signatures });
      } catch {
        // Ignora
      }
    } else if (event.key === TOKENS_STORAGE_KEY) {
      callback({ type: 'TOKENS_UPDATED' });
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
