/**
 * Serviço de Gestão e Sincronização em Tempo Real das Assinaturas Manuais da Turma.
 * As assinaturas são desenhadas no celular ou na tela e aplicadas em lote para todos
 * os certificados da turma selecionada.
 */

const STORAGE_PREFIX = 'totalsafety_turma_signatures_';
const CHANNEL_NAME = 'totalsafety_turma_signatures';

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
 * Salva ou atualiza uma assinatura manual de um papel específico na turma
 * @param {string} turmaId
 * @param {string} roleKey 'instructor' | 'tech_lead' | 'coordinator'
 * @param {string} signatureDataUrl Base64 PNG data URL
 * @param {object} meta { signerName, signedAt, roleTitle }
 */
export function saveRoleSignature(turmaId, roleKey, signatureDataUrl, meta = {}) {
  if (!turmaId || !roleKey) return null;
  try {
    const existing = getTurmaSignatures(turmaId);
    const updated = {
      ...existing,
      [roleKey]: {
        dataUrl: signatureDataUrl,
        signerName: meta.signerName || '',
        roleTitle: meta.roleTitle || '',
        signedAt: meta.signedAt || new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

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
 * Subscreve a atualizações de assinaturas em tempo real
 */
export function subscribeToTurmaSignatures(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleBroadcast = (event) => {
    if (event.data && (event.data.type === 'SIGNATURE_UPDATED' || event.data.type === 'SIGNATURE_CLEARED')) {
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
