// Relatório de Programas (PGR, PCMSO) e Laudos (LTCAT, Insalubridade, Periculosidade)
// por Empresa, por Responsável ou Empresa e Responsável, nos modelos Analítico, Sintético ou Ambos (.xlsx)
import {
  isItemExpired, isDelivered, isProgram, getEffectiveValidityDate,
  isItemExpiring30, isItemExpiring60, parseSafeDate
} from './deliverableTiming';
import { buildXlsxBlob, downloadBlob, columnLetter, XLSX_STYLES as S } from './xlsxWriter';

export const REPORT_DOC_ITEMS = [
  { key: 'pgr', label: 'PGR', shortHeader: 'PGR', category: 'programa', order: 1 },
  { key: 'pcmso', label: 'PCMSO', shortHeader: 'PCMSO', category: 'programa', order: 2 },
  { key: 'ltcat', label: 'LTCAT', shortHeader: 'LTCAT', category: 'laudo', order: 3 },
  { key: 'insalubridade', label: 'Laudo de Insalubridade (LI)', shortHeader: 'Insalubridade (LI)', category: 'laudo', order: 4 },
  { key: 'periculosidade', label: 'Laudo de Periculosidade (LP)', shortHeader: 'Periculosidade (LP)', category: 'laudo', order: 5 },
];

export const REPORT_DOC_KEYS = REPORT_DOC_ITEMS.map(i => i.key);

export const REPORT_STATUS_ITEMS = [
  { key: 'vencido', label: 'Vencido', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  { key: 'a_vencer', label: 'Próximos a Vencer', color: '#c2410c', bg: '#ffedd5', border: '#fdba74' },
  { key: 'pendente', label: 'Pendente', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  { key: 'entregue', label: 'Entregue', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
];

export const REPORT_STATUS_KEYS = REPORT_STATUS_ITEMS.map(s => s.key);
export const NO_RESPONSIBLE = 'Sem responsável definido';

const DOC_META_BY_KEY = new Map(REPORT_DOC_ITEMS.map(i => [i.key, i]));

const TYPE_LABEL = { programa: 'Programa', laudo: 'Laudo' };

const STATUS_LABEL = {
  entregue: 'Entregue',
  feito: 'Feito',
  concluido: 'Concluído',
  pendente: 'Pendente',
  agendado: 'Agendado',
  em_elaboracao: 'Em Elaboração',
  adiado: 'Adiado',
  cancelado: 'Cancelado',
  nao_se_aplica: 'Não Se Aplica',
};

/**
 * Identifica se o entregável é um dos 5 documentos permitidos no relatório:
 * PGR, PCMSO, LTCAT, Laudo de Insalubridade (LI) ou Laudo de Periculosidade (LP).
 */
export function identifyReportDocKey(deliverable) {
  if (!deliverable) return null;
  const type = (deliverable.type || '').trim().toLowerCase();
  if (type && type !== 'programa' && type !== 'laudo') return null;

  const rawTitle = (deliverable.title || '').trim();
  if (!rawTitle) return null;
  const t = rawTitle.toLowerCase();
  const upper = rawTitle.toUpperCase();

  // Exclui Relatório Analítico do PCMSO, Mapeamento Psicossocial, AET, PCA, PPR, etc.
  if (/anal[íi]tico/i.test(t) || /psicossocial/i.test(t) || /\baet\b/i.test(t) || /ergon[ôo]mic/i.test(t)) {
    return null;
  }

  if (upper === 'PGR' || /\bpgr\b/i.test(t) || /gerenciamento de risco/i.test(t)) {
    return 'pgr';
  }
  if (upper === 'PCMSO' || /\bpcmso\b/i.test(t) || /controle m[ée]dico/i.test(t)) {
    return 'pcmso';
  }
  if (upper === 'LTCAT' || /\bltcat\b/i.test(t) || /condi[çc][õo]es ambientais/i.test(t)) {
    return 'ltcat';
  }
  if (upper === 'LI' || /^li\s*[-–/(:]/i.test(rawTitle) || /insalubridade/i.test(t) || /\bltip\b/i.test(t)) {
    return 'insalubridade';
  }
  if (upper === 'LP' || /^lp\s*[-–/(:]/i.test(rawTitle) || /periculosidade/i.test(t)) {
    return 'periculosidade';
  }

  return null;
}

function formatDocTitle(rawTitle, docKey) {
  const trimmed = (rawTitle || '').trim();
  if (docKey === 'insalubridade' && trimmed.toUpperCase() === 'LI') {
    return 'Laudo de Insalubridade (LI)';
  }
  if (docKey === 'periculosidade' && trimmed.toUpperCase() === 'LP') {
    return 'Laudo de Periculosidade (LP)';
  }
  return trimmed;
}

/** Resolve o nome do responsável: técnico do entregável → técnico responsável da empresa. */
export function resolveResponsible(deliverable, company, profilesById) {
  const prof = deliverable.responsibleId ? profilesById.get(deliverable.responsibleId) : null;
  if (prof?.name) return prof.name.trim();
  const fromCompany = (company?.tecnicoResponsavel || company?.responsible || '').trim();
  return fromCompany || NO_RESPONSIBLE;
}

/**
 * Classifica o entregável nas 4 categorias de filtro (vencido, a_vencer, pendente, entregue)
 * ou inativo (cancelado / não se aplica).
 */
function classify(d, today) {
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') {
    return { key: 'inativo', filterKey: 'inativo', label: STATUS_LABEL[d.status] };
  }
  if (isItemExpired(d, today)) {
    return { key: 'vencido', filterKey: 'vencido', label: 'Vencido' };
  }
  if (isItemExpiring30(d, today)) {
    return { key: 'a_vencer', filterKey: 'a_vencer', label: 'A Vencer (≤ 30d)', isDelivered: isDelivered(d) };
  }
  if (isItemExpiring60(d, today)) {
    return { key: 'a_vencer', filterKey: 'a_vencer', label: 'A Vencer (≤ 60d)', isDelivered: isDelivered(d) };
  }
  if (isDelivered(d)) {
    return { key: 'entregue', filterKey: 'entregue', label: STATUS_LABEL[d.status] || 'Entregue', isDelivered: true };
  }
  if (d.status === 'em_elaboracao') {
    return { key: 'em_elaboracao', filterKey: 'pendente', label: 'Em Elaboração' };
  }
  const label = d.status === 'vencido' ? 'Pendente' : (STATUS_LABEL[d.status] || 'Pendente');
  return { key: 'pendente', filterKey: 'pendente', label };
}

function validityInfo(d, today) {
  if (!isProgram(d)) return { date: null, label: 'Sem validade (laudo)' };
  const date = getEffectiveValidityDate(d);
  if (!date) return { date: null, label: 'Sem validade definida' };
  if (isItemExpired(d, today)) return { date, label: 'Vencido' };
  if (isItemExpiring30(d, today)) return { date, label: 'A vencer (≤ 30 dias)' };
  if (isItemExpiring60(d, today)) return { date, label: 'A vencer (≤ 60 dias)' };
  return { date, label: 'Válido' };
}

/**
 * Monta as linhas do relatório filtrando exclusivamente PGR, PCMSO, LTCAT, Insalubridade e Periculosidade,
 * e aplicando o filtro de status (vencido, a_vencer, pendente, entregue).
 */
export function buildReportRows({
  deliverables,
  companies,
  contracts,
  profiles,
  docKeys = REPORT_DOC_KEYS,
  statusKeys = REPORT_STATUS_KEYS,
  includeInactive = false,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const companiesById = new Map(companies.map(c => [c.id, c]));
  const contractsById = new Map(contracts.map(c => [c.id, c]));
  const profilesById = new Map((profiles || []).map(p => [p.id, p]));
  const allowedDocs = new Set(docKeys);
  const allowedStatuses = new Set(statusKeys);

  return deliverables
    .map(d => {
      const docKey = identifyReportDocKey(d);
      if (!docKey || !allowedDocs.has(docKey)) return null;

      const meta = DOC_META_BY_KEY.get(docKey);
      const company = companiesById.get(d.companyId);
      const situation = classify(d, today);
      const validity = validityInfo(d, today);

      if (situation.filterKey === 'inativo') {
        if (!includeInactive) return null;
      } else if (!allowedStatuses.has(situation.filterKey)) {
        return null;
      }

      return {
        raw: d,
        docKey,
        docOrder: meta?.order || 99,
        companyId: d.companyId,
        companyName: company?.name || d.companyName || 'N/A',
        cnpj: company?.cnpj || '',
        responsible: resolveResponsible(d, company, profilesById),
        typeLabel: TYPE_LABEL[meta?.category || d.type] || d.type,
        title: formatDocTitle(d.title, docKey),
        situation,
        validity,
        emissionDate: parseSafeDate(d.dataEmissao || d.dataEnvio),
        revisionDate: parseSafeDate(d.ultimaRevisao),
        deliveredDate: parseSafeDate(d.deliveredDate),
        contract: contractsById.get(d.contractId)?.contractNumber || d.contractNumber || '',
        reason: d.reason || '',
      };
    })
    .filter(Boolean);
}

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function compareResponsible(a, b) {
  if (a === b) return 0;
  if (a === NO_RESPONSIBLE) return 1;
  if (b === NO_RESPONSIBLE) return -1;
  return collator.compare(a, b);
}

function sortRows(rows, groupBy) {
  return [...rows].sort((a, b) => {
    let primary = 0;
    if (groupBy === 'responsavel') {
      primary = compareResponsible(a.responsible, b.responsible) || collator.compare(a.companyName, b.companyName);
    } else if (groupBy === 'empresa_responsavel') {
      primary = collator.compare(a.companyName, b.companyName) || compareResponsible(a.responsible, b.responsible);
    } else {
      primary = collator.compare(a.companyName, b.companyName);
    }
    return primary || (a.docOrder - b.docOrder) || collator.compare(a.title, b.title);
  });
}

function statusStyle(key) {
  switch (key) {
    case 'vencido': return S.STATUS_RED;
    case 'entregue': return S.STATUS_GREEN;
    case 'em_elaboracao': return S.STATUS_BLUE;
    case 'inativo': return S.STATUS_GRAY;
    default: return S.STATUS_AMBER;
  }
}

function validityStyle(label) {
  if (label === 'Vencido') return S.STATUS_RED;
  if (label.startsWith('A vencer')) return S.STATUS_AMBER;
  if (label === 'Válido') return S.STATUS_GREEN;
  return S.STATUS_GRAY;
}

function emptyCounters() {
  return {
    total: 0,
    programas: 0,
    laudos: 0,
    entregue: 0,
    a_vencer: 0,
    pendente: 0,
    em_elaboracao: 0,
    vencido: 0,
    inativo: 0,
    byDoc: {
      pgr: [],
      pcmso: [],
      ltcat: [],
      insalubridade: [],
      periculosidade: [],
    },
  };
}

function accumulate(counter, r) {
  counter.total++;
  if (r.docKey === 'pgr' || r.docKey === 'pcmso') counter.programas++;
  else counter.laudos++;
  counter[r.situation.key] = (counter[r.situation.key] || 0) + 1;
  if (counter.byDoc[r.docKey]) {
    counter.byDoc[r.docKey].push(r);
  }
}

export function groupRows(rows, groupBy) {
  const groups = new Map();
  rows.forEach(r => {
    let key;
    if (groupBy === 'responsavel') {
      key = r.responsible;
    } else if (groupBy === 'empresa_responsavel') {
      key = `${r.companyName}|||${r.responsible}`;
    } else {
      key = r.companyName;
    }

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        companyName: r.companyName,
        cnpj: r.cnpj,
        responsible: r.responsible,
        sheetLabel: groupBy === 'empresa_responsavel'
          ? `${r.companyName} - ${r.responsible}`
          : (groupBy === 'responsavel' ? r.responsible : r.companyName),
        rows: [],
        counters: emptyCounters(),
        companies: new Set(),
        responsibles: new Set(),
      });
    }
    const g = groups.get(key);
    g.rows.push(r);
    if (!g.cnpj && r.cnpj) g.cnpj = r.cnpj;
    g.companies.add(r.companyName);
    g.responsibles.add(r.responsible);
    accumulate(g.counters, r);
  });

  return [...groups.values()].sort((a, b) => {
    if (groupBy === 'responsavel') {
      return compareResponsible(a.responsible, b.responsible);
    }
    if (groupBy === 'empresa_responsavel') {
      return collator.compare(a.companyName, b.companyName) || compareResponsible(a.responsible, b.responsible);
    }
    return collator.compare(a.companyName, b.companyName);
  });
}

function formatNow() {
  const now = new Date();
  return now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function headerBlock(title, subtitle, colCount) {
  return {
    rows: [
      [{ v: title, s: S.TITLE }],
      [{ v: subtitle, s: S.SUBTITLE }],
      [],
    ],
    merges: [`A1:${columnLetter(colCount - 1)}1`, `A2:${columnLetter(colCount - 1)}2`],
  };
}

/** Resume o status de um documento específico (PGR, PCMSO, LTCAT, LI, LP) para a célula da aba Sintético. */
function summarizeDocCell(items, isByResponsible) {
  if (!items || items.length === 0) {
    return { v: isByResponsible ? 0 : '—', s: S.STATUS_GRAY };
  }
  if (isByResponsible) {
    const regular = items.filter(i => i.situation.key === 'entregue' || i.situation.isDelivered).length;
    const expired = items.filter(i => i.situation.key === 'vencido').length;
    const style = expired > 0 ? S.STATUS_RED : (regular === items.length ? S.STATUS_GREEN : S.CENTER);
    return { v: `${regular}/${items.length}`, s: style };
  }
  const item = items[0];
  return { v: item.situation.label, s: statusStyle(item.situation.key) };
}

function buildSummarySheet(groups, groupBy, docKeys, title, subtitle) {
  const isResp = groupBy === 'responsavel';
  const isBoth = groupBy === 'empresa_responsavel';
  const activeDocs = REPORT_DOC_ITEMS.filter(d => docKeys.includes(d.key));

  const leadingHeaders = isBoth
    ? ['Empresa', 'CNPJ', 'Responsável']
    : isResp
      ? ['Responsável', 'Empresas']
      : ['Empresa', 'CNPJ', 'Responsável(is)'];

  const docHeaders = activeDocs.map(d => (isResp ? `${d.shortHeader} (Entr./Total)` : d.shortHeader));
  const metricHeaders = ['Total', 'Entregues', 'Próximos a Vencer', 'Pendentes', 'Em Elaboração', 'Vencidos', '% Entregue'];
  const headers = [...leadingHeaders, ...docHeaders, ...metricHeaders];

  const head = headerBlock(title, subtitle, headers.length);
  const headerRowIndex = head.rows.length + 1;
  const rows = [...head.rows, headers.map(h => ({ v: h, s: S.HEADER }))];
  const totals = emptyCounters();
  const docTotals = Object.fromEntries(activeDocs.map(d => [d.key, { delivered: 0, total: 0 }]));

  const pct = (c) => {
    const base = c.total - c.inativo;
    return base > 0 ? `${Math.round((c.entregue / base) * 100)}%` : '-';
  };

  groups.forEach(g => {
    const c = g.counters;
    ['total', 'programas', 'laudos', 'entregue', 'a_vencer', 'pendente', 'em_elaboracao', 'vencido', 'inativo'].forEach(k => {
      totals[k] += c[k] || 0;
    });

    const leadingCells = isBoth
      ? [{ v: g.companyName, s: S.CELL }, { v: g.cnpj, s: S.CELL }, { v: g.responsible, s: S.CELL }]
      : isResp
        ? [{ v: g.responsible, s: S.CELL }, { v: g.companies.size, s: S.CENTER }]
        : [{ v: g.companyName, s: S.CELL }, { v: g.cnpj, s: S.CELL }, { v: [...g.responsibles].join(', '), s: S.CELL }];

    const docCells = activeDocs.map(d => {
      const list = c.byDoc[d.key] || [];
      docTotals[d.key].total += list.length;
      docTotals[d.key].delivered += list.filter(i => i.situation.key === 'entregue' || i.situation.isDelivered).length;
      return summarizeDocCell(list, isResp);
    });

    rows.push([
      ...leadingCells,
      ...docCells,
      { v: c.total, s: S.TOTAL },
      { v: c.entregue, s: c.entregue ? S.STATUS_GREEN : S.CENTER },
      { v: c.a_vencer, s: c.a_vencer ? S.STATUS_AMBER : S.CENTER },
      { v: c.pendente, s: c.pendente ? S.STATUS_AMBER : S.CENTER },
      { v: c.em_elaboracao, s: c.em_elaboracao ? S.STATUS_BLUE : S.CENTER },
      { v: c.vencido, s: c.vencido ? S.STATUS_RED : S.CENTER },
      { v: pct(c), s: S.CENTER },
    ]);
  });

  const allCompanies = new Set(groups.flatMap(g => [...g.companies]));
  const allResponsibles = new Set(groups.flatMap(g => [...g.responsibles]));

  const totalLeadingCells = isBoth
    ? [{ v: `TOTAL GERAL (${allCompanies.size} emp.)`, s: S.GROUP }, { v: '', s: S.GROUP }, { v: `${allResponsibles.size} resp.`, s: S.TOTAL }]
    : isResp
      ? [{ v: 'TOTAL GERAL', s: S.GROUP }, { v: allCompanies.size, s: S.TOTAL }]
      : [{ v: 'TOTAL GERAL', s: S.GROUP }, { v: '', s: S.GROUP }, { v: `${allResponsibles.size} resp.`, s: S.TOTAL }];

  const totalDocCells = activeDocs.map(d => {
    const dt = docTotals[d.key];
    return { v: `${dt.delivered}/${dt.total}`, s: S.TOTAL };
  });

  rows.push([
    ...totalLeadingCells,
    ...totalDocCells,
    { v: totals.total, s: S.TOTAL },
    { v: totals.entregue, s: S.TOTAL },
    { v: totals.a_vencer, s: S.TOTAL },
    { v: totals.pendente, s: S.TOTAL },
    { v: totals.em_elaboracao, s: S.TOTAL },
    { v: totals.vencido, s: S.TOTAL },
    { v: pct(totals), s: S.TOTAL },
  ]);

  const leadingCols = isBoth
    ? [{ width: 42 }, { width: 20 }, { width: 28 }]
    : isResp
      ? [{ width: 34 }, { width: 12 }]
      : [{ width: 42 }, { width: 20 }, { width: 30 }];

  const docCols = activeDocs.map(d => ({ width: d.key === 'insalubridade' || d.key === 'periculosidade' ? 20 : 15 }));
  const metricCols = [{ width: 9 }, { width: 12 }, { width: 18 }, { width: 12 }, { width: 15 }, { width: 11 }, { width: 12 }];
  const lastDataRow = headerRowIndex + Math.max(groups.length, 1);

  return {
    name: 'Sintético',
    rows,
    merges: head.merges,
    freezeRow: headerRowIndex,
    autoFilter: `A${headerRowIndex}:${columnLetter(headers.length - 1)}${lastDataRow}`,
    columns: [...leadingCols, ...docCols, ...metricCols],
  };
}

function detailColumns(groupBy) {
  const first = groupBy === 'responsavel'
    ? [{ h: 'Responsável', w: 30 }, { h: 'Empresa', w: 44 }, { h: 'CNPJ', w: 20 }]
    : [{ h: 'Empresa', w: 44 }, { h: 'CNPJ', w: 20 }, { h: 'Responsável', w: 30 }];
  return [
    ...first,
    { h: 'Tipo', w: 11 },
    { h: 'Entregável', w: 34 },
    { h: 'Status', w: 17 },
    { h: 'Data de Emissão', w: 15 },
    { h: 'Validade', w: 13 },
    { h: 'Situação da Validade', w: 22 },
    { h: 'Última Revisão', w: 15 },
    { h: 'Entregue em', w: 13 },
    { h: 'Contrato', w: 18 },
    { h: 'Motivo / Observação', w: 34 },
  ];
}

function detailRow(r, groupBy) {
  const first = groupBy === 'responsavel'
    ? [{ v: r.responsible, s: S.CELL }, { v: r.companyName, s: S.CELL }, { v: r.cnpj, s: S.CELL }]
    : [{ v: r.companyName, s: S.CELL }, { v: r.cnpj, s: S.CELL }, { v: r.responsible, s: S.CELL }];
  return [
    ...first,
    { v: r.typeLabel, s: S.CENTER },
    { v: r.title, s: S.CELL },
    { v: r.situation.label, s: statusStyle(r.situation.key) },
    { v: r.emissionDate, s: S.DATE },
    { v: r.validity.date, s: S.DATE },
    { v: r.validity.label, s: validityStyle(r.validity.label) },
    { v: r.revisionDate, s: S.DATE },
    { v: r.deliveredDate, s: S.DATE },
    { v: r.contract, s: S.CELL },
    { v: r.reason, s: S.CELL },
  ];
}

function buildDetailSheet(name, rows, groupBy, title, subtitle) {
  const cols = detailColumns(groupBy);
  const head = headerBlock(title, subtitle, cols.length);
  const headerRowIndex = head.rows.length + 1;
  const sheetRows = [
    ...head.rows,
    cols.map(c => ({ v: c.h, s: S.HEADER })),
    ...rows.map(r => detailRow(r, groupBy)),
  ];
  const lastRow = headerRowIndex + Math.max(rows.length, 1);
  return {
    name,
    rows: sheetRows,
    merges: head.merges,
    freezeRow: headerRowIndex,
    autoFilter: `A${headerRowIndex}:${columnLetter(cols.length - 1)}${lastRow}`,
    columns: cols.map(c => ({ width: c.w })),
  };
}

function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase().substring(0, 40);
}

/**
 * Gera e baixa a planilha do relatório (restrito a PGR, PCMSO, LTCAT, Insalubridade e Periculosidade).
 */
export async function generateDeliverablesReport({
  groupBy,
  reportFormat = 'ambos',
  rows,
  sheetPerGroup = false,
  selectionLabel = '',
  docKeys = REPORT_DOC_KEYS,
}) {
  const sorted = sortRows(rows, groupBy);
  const groups = groupRows(sorted, groupBy);

  const selectedLabels = REPORT_DOC_ITEMS.filter(d => docKeys.includes(d.key)).map(d => d.shortHeader).join(', ');
  const groupLabelMap = {
    empresa: 'Empresa',
    responsavel: 'Responsável',
    empresa_responsavel: 'Empresa e Responsável',
  };
  const groupCountMap = {
    empresa: 'empresa(s)',
    responsavel: 'responsável(is)',
    empresa_responsavel: 'vínculo(s) empresa × responsável',
  };
  const formatLabelMap = {
    sintetico: 'Sintético',
    analitico: 'Analítico',
    ambos: 'Sintético e Analítico',
  };

  const groupLabel = groupLabelMap[groupBy] || 'Empresa';
  const formatLabel = formatLabelMap[reportFormat] || 'Sintético e Analítico';
  const title = `Relatório ${formatLabel} (${selectedLabels}) por ${groupLabel}${selectionLabel ? ` — ${selectionLabel}` : ''}`;
  const subtitle = `Gerado em ${formatNow()} • ${sorted.length} entregável(is) • ${groups.length} ${groupCountMap[groupBy] || 'grupo(s)'}`;

  const sheets = [];

  if (reportFormat === 'sintetico' || reportFormat === 'ambos') {
    sheets.push(buildSummarySheet(groups, groupBy, docKeys, title, subtitle));
  }

  if (reportFormat === 'analitico' || reportFormat === 'ambos') {
    sheets.push(buildDetailSheet('Analítico', sorted, groupBy, title, subtitle));

    if (sheetPerGroup) {
      groups.forEach(g => {
        sheets.push(buildDetailSheet(
          g.sheetLabel,
          g.rows,
          groupBy,
          `${selectedLabels} — ${g.sheetLabel}`,
          `Gerado em ${formatNow()} • ${g.rows.length} entregável(is)`
        ));
      });
    }
  }

  const blob = await buildXlsxBlob(sheets);
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = selectionLabel ? `-${slugify(selectionLabel)}` : '';
  const fmtSlug = reportFormat === 'ambos' ? '' : `-${reportFormat}`;
  downloadBlob(blob, `relatorio${fmtSlug}-programas-laudos-por-${slugify(groupBy)}${suffix}-${dateStr}.xlsx`);
}
