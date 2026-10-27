// Utilitários padronizados para status e prazos de entregáveis e programas SST

export function parseSafeDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const s = val.trim();
    // Verifica formato DD/MM/YYYY ou DD-MM-YYYY
    const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // Verifica formato YYYY-MM-DD
    const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function isDelivered(d) {
  if (!d) return false;
  return ['entregue', 'feito', 'concluido'].includes(d.status);
}

// Identifica itens padrão gerados em lote (seed) que ainda não tiveram validade ou emissão real configurada
export function isUnconfiguredSeedItem(d) {
  if (!d) return false;
  const target = d.dueDate || d.dataEnvio || d.dataEmissao;
  return !d.validityDate && d.status === 'pendente' && target === '2026-11-15' && !d.deliveredDate && !d.fileName && !d.ultimaRevisao;
}

export function getExpirationTargetDate(d) {
  if (!d) return null;
  if (d.validityDate) {
    return parseSafeDate(d.validityDate);
  }
  if (!isDelivered(d) && !isUnconfiguredSeedItem(d)) {
    const target = d.dueDate || d.dataEnvio || d.dataEmissao;
    return parseSafeDate(target);
  }
  return null;
}

export function getDaysUntilExpiration(d, refDate = new Date()) {
  const targetDate = getExpirationTargetDate(d);
  if (!targetDate) return null;
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isItemExpired(d, refDate = new Date()) {
  if (!d) return false;
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
  if (d.status === 'vencido') return true;
  if (isUnconfiguredSeedItem(d)) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  // 1. Validade (se preenchida): se a data de validade já passou, está vencido
  // (independente de ter sido entregue anteriormente ou não)
  if (d.validityDate) {
    const vDate = parseSafeDate(d.validityDate);
    if (vDate && vDate < today) return true;
  }

  // 2. Se não foi entregue, verifica a data limite / prazo de envio
  if (!isDelivered(d)) {
    const target = d.dueDate || d.dataEnvio || d.dataEmissao;
    if (target) {
      const tDate = parseSafeDate(target);
      if (tDate && tDate < today) return true;
    }
  }

  return false;
}

export function isItemExpiring30(d, refDate = new Date(), in30 = null) {
  if (!d) return false;
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
  if (isUnconfiguredSeedItem(d)) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const in30Days = in30 || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (isItemExpired(d, today)) return false;

  if (d.validityDate) {
    const vDate = parseSafeDate(d.validityDate);
    if (vDate && vDate >= today && vDate <= in30Days) return true;
  }

  if (!isDelivered(d)) {
    const target = d.dueDate || d.dataEnvio || d.dataEmissao;
    if (target) {
      const tDate = parseSafeDate(target);
      if (tDate && tDate >= today && tDate <= in30Days) return true;
    }
  }

  return false;
}

export function isItemExpiring60(d, refDate = new Date(), in30 = null, in60 = null) {
  if (!d) return false;
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
  if (isUnconfiguredSeedItem(d)) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const in30Days = in30 || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = in60 || new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  if (isItemExpired(d, today)) return false;
  if (isItemExpiring30(d, today, in30Days)) return false;

  if (d.validityDate) {
    const vDate = parseSafeDate(d.validityDate);
    if (vDate && vDate > in30Days && vDate <= in60Days) return true;
  }

  if (!isDelivered(d)) {
    const target = d.dueDate || d.dataEnvio || d.dataEmissao;
    if (target) {
      const tDate = parseSafeDate(target);
      if (tDate && tDate > in30Days && tDate <= in60Days) return true;
    }
  }

  return false;
}

export function getDeliverableTimingInfo(d, refDate = new Date()) {
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  if (!d) {
    return { statusKey: 'pendente', label: 'Pendente', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
  }

  if (d.status === 'cancelado') {
    return { statusKey: 'cancelado', label: 'Cancelado', bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  }
  if (d.status === 'nao_se_aplica') {
    return { statusKey: 'nao_se_aplica', label: 'Não Se Aplica', bg: '#f1f5f9', color: '#94a3b8', border: '#e2e8f0' };
  }

  const expired = isItemExpired(d, today);
  if (expired) {
    return { statusKey: 'vencido', label: 'Vencido', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', isExpired: true };
  }

  const exp30 = isItemExpiring30(d, today, in30Days);
  if (exp30) {
    return { statusKey: 'expiring30', label: 'A Vencer (≤30d)', bg: '#fff7ed', color: '#c2410c', border: '#fdba74', isExpiring30: true };
  }

  const exp60 = isItemExpiring60(d, today, in30Days, in60Days);
  if (exp60) {
    return { statusKey: 'expiring60', label: 'A Vencer (≤60d)', bg: '#fffbeb', color: '#b45309', border: '#fde68a', isExpiring60: true };
  }

  if (isDelivered(d)) {
    return { statusKey: 'entregue', label: 'Entregue', bg: '#dcfce7', color: '#15803d', border: '#86efac', isDelivered: true };
  }

  if (d.status === 'em_elaboracao') {
    return { statusKey: 'em_elaboracao', label: 'Em Elaboração', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
  }

  if (d.status === 'agendado') {
    return { statusKey: 'agendado', label: 'Agendado', bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' };
  }

  return { statusKey: 'pendente', label: 'Pendente', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
}
