// Relatório de Programas e Laudos (por Empresa, por Responsável ou Empresa e Responsável,
// nos modelos Analítico, Sintético ou Ambos) em planilha Excel (.xlsx)
import {
  isItemExpired, isDelivered, isProgram, getEffectiveValidityDate,
  isItemExpiring30, isItemExpiring60, parseSafeDate
} from './deliverableTiming';
import { buildXlsxBlob, downloadBlob, columnLetter, XLSX_STYLES as S } from './xlsxWriter';

export const REPORT_TYPES = ['programa', 'laudo'];
export const NO_RESPONSIBLE = 'Sem responsável definido';

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

/** Resolve o nome do responsável: técnico do entregável → técnico responsável da empresa. */
export function resolveResponsible(deliverable, company, profilesById) {
  const prof = deliverable.responsibleId ? profilesById.get(deliverable.responsibleId) : null;
  if (prof?.name) return prof.name.trim();
  const fromCompany = (company?.tecnicoResponsavel || company?.responsible || '').trim();
  return fromCompany || NO_RESPONSIBLE;
}

/** Classifica a situação do entregável (mesma regra exibida na tela de Entregáveis). */
function classify(d, today) {
  const expired = isItemExpired(d, today);
  if (expired) return { key: 'vencido', label: 'Vencido' };
  if (d.status === 'cancelado' || d.status === 'nao_se_aplica') {
    return { key: 'inativo', label: STATUS_LABEL[d.status] };
  }
  if (isDelivered(d)) return { key: 'entregue', label: STATUS_LABEL[d.status] || 'Entregue' };
  if (d.status === 'em_elaboracao') return { key: 'em_elaboracao', label: 'Em Elaboração' };
  // Status 'vencido' gravado em item que não é programa é tratado como pendente (igual à tela)
  const label = d.status === 'vencido' ? 'Pendente' : (STATUS_LABEL[d.status] || 'Pendente');
  return { key: 'pendente', label };
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
 * Monta as linhas do relatório já enriquecidas (empresa, responsável, situação, validade).
 */
export function buildReportRows({ deliverables, companies, contracts, profiles, types = REPORT_TYPES, includeInactive = false }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const companiesById = new Map(companies.map(c => [c.id, c]));
  const contractsById = new Map(contracts.map(c => [c.id, c]));
  const profilesById = new Map((profiles || []).map(p => [p.id, p]));

  return deliverables
    .filter(d => types.includes(d.type))
    .map(d => {
      const company = companiesById.get(d.companyId);
      const situation = classify(d, today);
      const validity = validityInfo(d, today);
      return {
        raw: d,
        companyId: d.companyId,
        companyName: company?.name || d.companyName || 'N/A',
        cnpj: company?.cnpj || '',
        responsible: resolveResponsible(d, company, profilesById),
        typeLabel: TYPE_LABEL[d.type] || d.type,
        title: d.title || '',
        situation,
        validity,
        emissionDate: parseSafeDate(d.dataEmissao || d.dataEnvio),
        revisionDate: parseSafeDate(d.ultimaRevisao),
        deliveredDate: parseSafeDate(d.deliveredDate),
        contract: contractsById.get(d.contractId)?.contractNumber || d.contractNumber || '',
        reason: d.reason || '',
      };
    })
    .filter(r => includeInactive || r.situation.key !== 'inativo');
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
    return primary || collator.compare(a.typeLabel, b.typeLabel) || collator.compare(a.title, b.title);
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
  return { total: 0, programas: 0, laudos: 0, entregue: 0, pendente: 0, em_elaboracao: 0, vencido: 0, aVencer: 0, inativo: 0 };
}

function accumulate(counter, r) {
  counter.total++;
  if (r.raw.type === 'programa') counter.programas++;
  if (r.raw.type === 'laudo') counter.laudos++;
  counter[r.situation.key] = (counter[r.situation.key] || 0) + 1;
  if (r.validity.label.startsWith('A vencer')) counter.aVencer++;
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

function buildSummarySheet(groups, groupBy, title, subtitle) {
  const isResp = groupBy === 'responsavel';
  const isBoth = groupBy === 'empresa_responsavel';

  const leadingHeaders = isBoth
    ? ['Empresa', 'CNPJ', 'Responsável']
    : isResp
      ? ['Responsável', 'Empresas']
      : ['Empresa', 'CNPJ', 'Responsável(is)'];

  const metricHeaders = ['Total', 'Programas', 'Laudos', 'Entregues', 'Pendentes', 'Em Elaboração', 'Vencidos', 'A Vencer (≤60d)', 'Canc. / N.A.', '% Entregue'];
  const headers = [...leadingHeaders, ...metricHeaders];

  const head = headerBlock(title, subtitle, headers.length);
  const headerRowIndex = head.rows.length + 1;
  const rows = [...head.rows, headers.map(h => ({ v: h, s: S.HEADER }))];
  const totals = emptyCounters();

  const pct = (c) => {
    const base = c.total - c.inativo;
    return base > 0 ? `${Math.round((c.entregue / base) * 100)}%` : '-';
  };

  groups.forEach(g => {
    const c = g.counters;
    Object.keys(totals).forEach(k => { totals[k] += c[k] || 0; });

    const leadingCells = isBoth
      ? [{ v: g.companyName, s: S.CELL }, { v: g.cnpj, s: S.CELL }, { v: g.responsible, s: S.CELL }]
      : isResp
        ? [{ v: g.responsible, s: S.CELL }, { v: g.companies.size, s: S.CENTER }]
        : [{ v: g.companyName, s: S.CELL }, { v: g.cnpj, s: S.CELL }, { v: [...g.responsibles].join(', '), s: S.CELL }];

    rows.push([
      ...leadingCells,
      { v: c.total, s: S.TOTAL },
      { v: c.programas, s: S.CENTER },
      { v: c.laudos, s: S.CENTER },
      { v: c.entregue, s: c.entregue ? S.STATUS_GREEN : S.CENTER },
      { v: c.pendente, s: c.pendente ? S.STATUS_AMBER : S.CENTER },
      { v: c.em_elaboracao, s: c.em_elaboracao ? S.STATUS_BLUE : S.CENTER },
      { v: c.vencido, s: c.vencido ? S.STATUS_RED : S.CENTER },
      { v: c.aVencer, s: c.aVencer ? S.STATUS_AMBER : S.CENTER },
      { v: c.inativo, s: S.STATUS_GRAY },
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

  rows.push([
    ...totalLeadingCells,
    { v: totals.total, s: S.TOTAL },
    { v: totals.programas, s: S.TOTAL },
    { v: totals.laudos, s: S.TOTAL },
    { v: totals.entregue, s: S.TOTAL },
    { v: totals.pendente, s: S.TOTAL },
    { v: totals.em_elaboracao, s: S.TOTAL },
    { v: totals.vencido, s: S.TOTAL },
    { v: totals.aVencer, s: S.TOTAL },
    { v: totals.inativo, s: S.TOTAL },
    { v: pct(totals), s: S.TOTAL },
  ]);

  const leadingCols = isBoth
    ? [{ width: 42 }, { width: 20 }, { width: 28 }]
    : isResp
      ? [{ width: 34 }, { width: 12 }]
      : [{ width: 42 }, { width: 20 }, { width: 30 }];

  const metricCols = [{ width: 9 }, { width: 12 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 11 }, { width: 16 }, { width: 13 }, { width: 12 }];
  const lastDataRow = headerRowIndex + Math.max(groups.length, 1);

  return {
    name: 'Sintético',
    rows,
    merges: head.merges,
    freezeRow: headerRowIndex,
    autoFilter: `A${headerRowIndex}:${columnLetter(headers.length - 1)}${lastDataRow}`,
    columns: [...leadingCols, ...metricCols],
  };
}

function detailColumns(groupBy) {
  const first = groupBy === 'responsavel'
    ? [{ h: 'Responsável', w: 30 }, { h: 'Empresa', w: 44 }, { h: 'CNPJ', w: 20 }]
    : [{ h: 'Empresa', w: 44 }, { h: 'CNPJ', w: 20 }, { h: 'Responsável', w: 30 }];
  return [
    ...first,
    { h: 'Tipo', w: 11 },
    { h: 'Entregável', w: 40 },
    { h: 'Status', w: 15 },
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
  const headerRowIndex = head.rows.length + 1; // linha (1-based) do cabeçalho
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
 * Gera e baixa a planilha do relatório.
 * @param {object} opts
 * @param {'empresa'|'responsavel'|'empresa_responsavel'} opts.groupBy
 * @param {'analitico'|'sintetico'|'ambos'} [opts.reportFormat='ambos']
 * @param {Array} opts.rows - linhas de buildReportRows (já filtradas)
 * @param {boolean} opts.sheetPerGroup - cria uma aba por grupo
 * @param {string} [opts.selectionLabel] - descrição do filtro selecionado
 * @param {string[]} opts.types
 */
export async function generateDeliverablesReport({
  groupBy,
  reportFormat = 'ambos',
  rows,
  sheetPerGroup = false,
  selectionLabel = '',
  types = REPORT_TYPES,
}) {
  const sorted = sortRows(rows, groupBy);
  const groups = groupRows(sorted, groupBy);

  const typesLabel = types.length === 2 ? 'Programas e Laudos' : (types[0] === 'programa' ? 'Programas' : 'Laudos');
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
  const title = `Relatório ${formatLabel} de ${typesLabel} por ${groupLabel}${selectionLabel ? ` — ${selectionLabel}` : ''}`;
  const subtitle = `Gerado em ${formatNow()} • ${sorted.length} entregável(is) • ${groups.length} ${groupCountMap[groupBy] || 'grupo(s)'}`;

  const sheets = [];

  if (reportFormat === 'sintetico' || reportFormat === 'ambos') {
    sheets.push(buildSummarySheet(groups, groupBy, title, subtitle));
  }

  if (reportFormat === 'analitico' || reportFormat === 'ambos') {
    sheets.push(buildDetailSheet('Analítico', sorted, groupBy, title, subtitle));

    if (sheetPerGroup) {
      groups.forEach(g => {
        sheets.push(buildDetailSheet(
          g.sheetLabel,
          g.rows,
          groupBy,
          `${typesLabel} — ${g.sheetLabel}`,
          `Gerado em ${formatNow()} • ${g.rows.length} entregável(is)`
        ));
      });
    }
  }

  const blob = await buildXlsxBlob(sheets);
  const dateStr = new Date().toISOString().slice(0, 10);
  const suffix = selectionLabel ? `-${slugify(selectionLabel)}` : '';
  const fmtSlug = reportFormat === 'ambos' ? '' : `-${reportFormat}`;
  downloadBlob(blob, `relatorio${fmtSlug}-${slugify(typesLabel)}-por-${slugify(groupBy)}${suffix}-${dateStr}.xlsx`);
}
