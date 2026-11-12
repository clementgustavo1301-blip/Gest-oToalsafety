// Gerador leve de planilhas Excel (.xlsx) usando JSZip (sem dependências extras).
// Suporta múltiplas abas, estilos básicos, larguras de coluna, mesclagem,
// congelamento de linhas e autofiltro.

import JSZip from 'jszip';

// Índices de estilo (cellXfs) disponíveis para as células
export const XLSX_STYLES = {
  DEFAULT: 0,
  HEADER: 1,
  CELL: 2,
  DATE: 3,
  GROUP: 4,
  STATUS_RED: 5,
  STATUS_GREEN: 6,
  STATUS_AMBER: 7,
  TITLE: 8,
  TOTAL: 9,
  SUBTITLE: 10,
  STATUS_BLUE: 11,
  STATUS_GRAY: 12,
  CENTER: 13,
};

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>
  <fonts count="10">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFDC2626"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/></font>
    <font><b/><sz val="15"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF2563EB"/><name val="Calibri"/></font>
    <font><sz val="11"/><color rgb="FF64748B"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0369A1"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="8" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="9" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function escapeXml(value) {
  return String(value)
    // Remove caracteres de controle inválidos em XML
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function columnLetter(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function dateToSerial(date) {
  // Usa os componentes locais da data (sem deslocamento de fuso)
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return (utc - Date.UTC(1899, 11, 30)) / 86400000;
}

function sanitizeSheetName(name, used) {
  let base = String(name || 'Planilha').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) base = 'Planilha';
  base = base.substring(0, 31);
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i++})`;
    candidate = base.substring(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function buildCell(ref, cell) {
  if (cell === null || cell === undefined) return '';
  const isObj = typeof cell === 'object' && !(cell instanceof Date);
  const value = isObj ? cell.v : cell;
  let style = isObj && cell.s !== undefined ? cell.s : null;

  if (value === null || value === undefined || value === '') {
    return style !== null ? `<c r="${ref}" s="${style}"/>` : '';
  }
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return style !== null ? `<c r="${ref}" s="${style}"/>` : '';
    return `<c r="${ref}" s="${style ?? XLSX_STYLES.DATE}"><v>${dateToSerial(value)}</v></c>`;
  }
  const sAttr = style !== null ? ` s="${style}"` : '';
  if (typeof value === 'number' && isFinite(value)) {
    return `<c r="${ref}"${sAttr}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function buildSheetXml(sheet) {
  const { rows = [], columns = [], merges = [], freezeRow = 0, autoFilter = null } = sheet;

  const colsXml = columns.length
    ? `<cols>${columns.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 14}" customWidth="1"/>`).join('')}</cols>`
    : '';

  const sheetView = freezeRow > 0
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freezeRow + 1}" sqref="A${freezeRow + 1}"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';

  const rowsXml = rows.map((row, rIdx) => {
    const cells = (row || []).map((cell, cIdx) => buildCell(`${columnLetter(cIdx)}${rIdx + 1}`, cell)).join('');
    const height = row && row.height ? ` ht="${row.height}" customHeight="1"` : '';
    return `<row r="${rIdx + 1}"${height}>${cells}</row>`;
  }).join('');

  const autoFilterXml = autoFilter ? `<autoFilter ref="${autoFilter}"/>` : '';
  const mergesXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${sheetView}<sheetFormatPr defaultRowHeight="15"/>${colsXml}<sheetData>${rowsXml}</sheetData>${autoFilterXml}${mergesXml}<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}

/**
 * Gera um Blob .xlsx a partir de uma lista de abas.
 * @param {Array<{name: string, rows: Array<Array<any>>, columns?: Array<{width:number}>, merges?: string[], freezeRow?: number, autoFilter?: string}>} sheets
 * Cada célula pode ser um valor (string, number, Date) ou um objeto { v, s } com estilo de XLSX_STYLES.
 */
export async function buildXlsxBlob(sheets) {
  const zip = new JSZip();
  const used = new Set();
  const named = sheets.map(s => ({ ...s, name: sanitizeSheetName(s.name, used) }));

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${named.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n  ')}
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  // Necessário para o Excel reconhecer o autofiltro de cada aba
  const toAbsoluteRef = (ref) => ref.split(':').map(p => p.replace(/([A-Z]+)(\d+)/, '$$$1$$$2')).join(':');
  const definedNames = named
    .map((s, i) => (s.autoFilter
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${escapeXml(`'${s.name.replace(/'/g, "''")}'`)}!${toAbsoluteRef(s.autoFilter)}</definedName>`
      : ''))
    .join('');

  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets>${named.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
  ${definedNames ? `<definedNames>${definedNames}</definedNames>` : ''}
</workbook>`);

  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${named.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('\n  ')}
  <Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('xl/styles.xml', STYLES_XML);
  named.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, buildSheetXml(s)));

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
