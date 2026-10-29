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

/**
 * Identifica se um item é um Laudo Técnico (LTCAT, LI, LP, AET, etc.).
 * Laudos retratam condições ambientais e periciais e NÃO possuem prazo de validade normativa.
 */
export function isLaudo(item) {
  if (!item) return false;
  const type = (item.type || '').trim().toLowerCase();
  if (type === 'laudo') return true;

  const title = (item.title || item.name || '').trim().toLowerCase();
  if (
    title === 'ltcat' ||
    title === 'li' ||
    title === 'lp' ||
    title === 'aet' ||
    title.startsWith('laudo') ||
    title.includes('laudo técnico') ||
    title.includes('laudo tecnico') ||
    title.includes('laudo pericial') ||
    title.includes('ltcat') ||
    title.includes('insalubridade') ||
    title.includes('periculosidade') ||
    title.includes('análise ergonômica') ||
    title.includes('analise ergonomica') ||
    title.includes('ergonômico') ||
    title.includes('ergonomico') ||
    title.includes('psicossocial') ||
    title.includes('relatório analítico') ||
    title.includes('relatorio analitico')
  ) {
    if (!title.includes('pgr') && !title.includes('pca') && !title.includes('ppr') && title !== 'pcmso') {
      return true;
    }
  }

  return false;
}

/**
 * Identifica se um item é um Programa de SST (PGR, PCMSO, PCA, PPR, etc.).
 * Apenas PROGRAMAS possuem periodicidade normativa e prazo de validade.
 * Documentos (Ordem de Serviço, PPP, APR, etc.), laudos e outros NÃO possuem validade.
 */
export function isProgram(item) {
  if (!item) return false;
  const type = (item.type || '').trim().toLowerCase();
  if (type === 'laudo' || isLaudo(item)) return false;
  if (type === 'documento' || type === 'contrato' || type === 'treinamento' || type === 'visita_tecnica') return false;
  if (type === 'programa') return true;

  const title = (item.title || item.name || '').trim().toLowerCase();
  return (
    title.includes('pgr') ||
    title.includes('pcmso') ||
    title.includes('pca') ||
    title.includes('ppr') ||
    title.includes('gro') ||
    title.includes('gerenciamento de risco') ||
    title.includes('controle médico') ||
    title.includes('controle medico')
  );
}

// Identifica itens padrão gerados em lote (seed) que ainda não tiveram validade ou emissão real configurada
export function isUnconfiguredSeedItem(d) {
  if (!d) return false;
  const target = d.dueDate || d.dataEnvio || d.dataEmissao;
  return !d.validityDate && d.status === 'pendente' && target === '2026-11-15' && !d.deliveredDate && !d.fileName && !d.ultimaRevisao;
}

/**
 * Retorna a quantidade de meses padrão de validade conforme normas regulamentadoras de SST.
 * Retorna null para documentos, laudos e outros sem periodicidade normativa fixa.
 * APENAS PROGRAMAS POSSUEM PRAZO DE VALIDADE.
 */
export function getDefaultValidityMonths(item) {
  if (!item) return null;

  // Apenas programas possuem data de validade normativa
  if (!isProgram(item)) {
    return null;
  }

  const title = (item.title || '').trim().toLowerCase();

  // 1. Programas com validade bianual (24 meses / 2 anos)
  // PGR (NR-01 item 1.5.7.2), GRO
  if (title.includes('pgr') || title.includes('gerenciamento de risco') || title.includes('gro')) {
    return 24;
  }

  // 2. Programas com periodicidade anual (12 meses / 1 ano)
  // PCMSO (NR-07), PCA, PPR
  if (
    title.includes('pcmso') ||
    title.includes('controle m') ||
    title.includes('pca') ||
    title.includes('ppr')
  ) {
    return 12;
  }

  // Demais programas: padrão 12 meses
  return 12;
}

/**
 * Retorna a data real de validade do documento.
 * Retorna null para Documentos, Laudos e itens que não sejam programas de SST.
 * Apenas PROGRAMAS possuem data de validade.
 */
export function getEffectiveValidityDate(d) {
  if (!d) return null;

  // Apenas PROGRAMAS possuem data de validade
  if (!isProgram(d)) {
    return null;
  }

  // 1. Data de validade explícita preenchida
  if (d.validityDate) {
    const parsed = parseSafeDate(d.validityDate);
    if (parsed) return parsed;
  }

  // 2. Cálculo a partir da data de emissão
  const baseDateStr = d.dataEmissao || d.dataEnvio || d.deliveredDate;
  if (baseDateStr) {
    const baseDate = parseSafeDate(baseDateStr);
    if (baseDate) {
      const months = getDefaultValidityMonths(d);
      if (months) {
        const calcDate = new Date(baseDate.getTime());
        calcDate.setMonth(calcDate.getMonth() + months);
        return isNaN(calcDate.getTime()) ? null : calcDate;
      }
    }
  }

  return null;
}

export function formatEffectiveValidityDateBR(d) {
  if (!isProgram(d)) return 'Sem validade';
  const vDate = getEffectiveValidityDate(d);
  if (!vDate) return 'Sem validade';
  const day = String(vDate.getUTCDate()).padStart(2, '0');
  const month = String(vDate.getUTCMonth() + 1).padStart(2, '0');
  const year = vDate.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function getExpirationTargetDate(d) {
  if (!d || !isProgram(d)) return null;
  return getEffectiveValidityDate(d);
}

export function getDaysUntilExpiration(d, refDate = new Date()) {
  if (!d || !isProgram(d)) return null;
  const targetDate = getExpirationTargetDate(d);
  if (!targetDate) return null;
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const t = new Date(targetDate);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isItemExpired(d, refDate = new Date()) {
  if (!d || !isProgram(d)) return false;
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
  if (isUnconfiguredSeedItem(d)) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  // Validade real do programa: se já passou da data de validade, está vencido
  const effValidity = getEffectiveValidityDate(d);
  if (effValidity) {
    const vDate = new Date(effValidity.getTime());
    vDate.setHours(0, 0, 0, 0);
    return vDate < today;
  }

  return false;
}

export function isItemExpiring30(d, refDate = new Date(), in30 = null) {
  if (!d || !isProgram(d)) return false;
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
  if (isUnconfiguredSeedItem(d)) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const in30Days = in30 || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (isItemExpired(d, today)) return false;

  const effValidity = getEffectiveValidityDate(d);
  if (!effValidity) return false;

  const vDate = new Date(effValidity.getTime());
  vDate.setHours(0, 0, 0, 0);
  return vDate >= today && vDate <= in30Days;
}

export function isItemExpiring60(d, refDate = new Date(), in30 = null, in60 = null) {
  if (!d || !isProgram(d)) return false;
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
  if (isUnconfiguredSeedItem(d)) return false;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);
  const in30Days = in30 || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = in60 || new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

  if (isItemExpired(d, today)) return false;
  if (isItemExpiring30(d, today, in30Days)) return false;

  const effValidity = getEffectiveValidityDate(d);
  if (!effValidity) return false;

  const vDate = new Date(effValidity.getTime());
  vDate.setHours(0, 0, 0, 0);
  return vDate > in30Days && vDate <= in60Days;
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

  // Apenas PROGRAMAS possuem prazo de validade normativa e vencimento.
  // Documentos, Laudos e demais entregáveis nunca vencem por validade.
  if (!isProgram(d)) {
    if (isDelivered(d)) {
      return { statusKey: 'entregue', label: 'Entregue', bg: '#dcfce7', color: '#15803d', border: '#86efac', isDelivered: true };
    }
    if (d.status === 'em_elaboracao') {
      return { statusKey: 'em_elaboracao', label: 'Em Elaboração', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
    return { statusKey: 'pendente', label: 'Pendente', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
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
