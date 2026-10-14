import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  differenceInCalendarDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logoBase64 } from '../assets/logoBase64.js';

export const STATUS_CONFIG = {
  agendado: {
    label: 'Agendado',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#3b82f6',
    rgb: [37, 99, 235],
    rgbBg: [239, 246, 255],
    rgbBorder: [59, 130, 246],
  },
  concluido: {
    label: 'Concluído',
    color: '#16a34a',
    bg: '#ecfdf5',
    border: '#10b981',
    rgb: [22, 163, 74],
    rgbBg: [236, 253, 245],
    rgbBorder: [16, 185, 129],
  },
  adiado: {
    label: 'Adiado',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#f59e0b',
    rgb: [217, 119, 6],
    rgbBg: [255, 251, 235],
    rgbBorder: [245, 158, 11],
  },
  nao_feito: {
    label: 'Não Feito',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#ef4444',
    rgb: [220, 38, 38],
    rgbBg: [254, 242, 242],
    rgbBorder: [239, 68, 68],
  },
};

export const getPeriod = (timeStr) => {
  if (!timeStr) return 'manha';
  const match = timeStr.match(/(\d{1,2})[:h]/i);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour >= 12) return 'tarde';
  }
  return 'manha';
};

export const cleanDescription = (desc) => {
  if (!desc) return '';
  return desc
    .replace(/\[NO_TRAVEL\]/g, '')
    .replace(/\[SHARED_TRIP\]/g, '')
    .replace(/\[RESP2_ID:[^\]]+\]/g, '')
    .replace(/\[EXTERNAL_COMPANY:[^\]]+\]/g, '')
    .trim();
};

export const getSecondaryResponsible = (desc) => {
  if (!desc) return null;
  const match = desc.match(/\[RESP2_ID:([^\]]+)\]/);
  return match ? match[1] : null;
};

// Helper to truncate text to fit a max width in mm in jsPDF
const fitText = (doc, text, maxWidth) => {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 3 && doc.getTextWidth(trimmed + '...') > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + '...';
};

// Safe logo drawer
const drawLogo = (doc, x, y, maxW, maxH) => {
  if (!logoBase64) return;
  try {
    const props = doc.getImageProperties(logoBase64);
    const ratio = props.width / props.height;
    let renderW = maxW;
    let renderH = renderW / ratio;
    if (renderH > maxH) {
      renderH = maxH;
      renderW = renderH * ratio;
    }
    const posX = x + (maxW - renderW) / 2;
    const posY = y + (maxH - renderH) / 2;
    doc.addImage(logoBase64, 'PNG', posX, posY, renderW, renderH, undefined, 'FAST');
  } catch (e) {
    console.warn('Erro ao carregar logo no PDF:', e);
  }
};

/**
 * Draws the A4 Monthly Calendar Grid Page
 */
export const drawCalendarGridPage = (doc, {
  currentDate,
  events = [],
  companies = [],
  groups = [],
  profiles = [],
  filters = {},
  customTitle,
}) => {
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 10;
  const marginTop = 7;
  const contentWidth = pageWidth - marginX * 2; // 277mm

  const getCompName = (id) => companies.find((c) => c.id === id)?.name || id || 'Empresa';
  const getGroupName = (compObj) => {
    if (!compObj || !compObj.groupId) return '';
    const grp = groups.find((g) => g.id === compObj.groupId);
    return grp ? grp.name.replace(/^\d+\s*-\s*/, '').trim() : '';
  };
  const getProfName = (id) => profiles.find((p) => p.id === id)?.name || '';

  // Filter events for this month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const monthEvents = events.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return isSameMonth(d, monthStart);
  });

  const agendadosCount = monthEvents.filter((e) => e.status === 'agendado').length;
  const concluidosCount = monthEvents.filter((e) => e.status === 'concluido').length;
  const adiadosCount = monthEvents.filter((e) => e.status === 'adiado').length;
  const naoFeitosCount = monthEvents.filter((e) => e.status === 'nao_feito').length;

  // 1. TOP HEADER CONTAINER (H = 22mm)
  const headerY = marginTop;
  const headerH = 22;

  // Header Box
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.3);
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(marginX, headerY, contentWidth, headerH, 1.5, 1.5, 'FD');

  // Sub-box 1: Logo (Left: 42mm width)
  const logoAreaW = 44;
  drawLogo(doc, marginX + 2, headerY + 2, logoAreaW - 4, headerH - 4);
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX + logoAreaW, headerY, marginX + logoAreaW, headerY + headerH);

  // Sub-box 2: Center Info (168mm width)
  const centerAreaX = marginX + logoAreaW + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text('SISTEMA INTEGRADO DE GESTÃO DE SEGURANÇA E SAÚDE NO TRABALHO — SGST', centerAreaX, headerY + 4.5);

  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138); // #1e3a8a
  const monthTitle = customTitle || `CRONOGRAMA DE AGENDAMENTOS — ${format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`;
  doc.text(monthTitle, centerAreaX, headerY + 10);

  // Filters subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const filterDesc = [
    filters.scope ? `Escopo: ${filters.scope}` : null,
    filters.region && filters.region !== 'all' ? `Região: ${filters.region}` : null,
    filters.status && filters.status !== 'all' ? `Status: ${STATUS_CONFIG[filters.status]?.label || filters.status}` : null,
    filters.companyName ? `Empresa: ${filters.companyName}` : null,
  ].filter(Boolean).join(' • ') || 'Exibição: Geral • Todas as Regiões • Todos os Status';
  doc.text(filterDesc, centerAreaX, headerY + 14.5);

  // Legend Bar
  const legY = headerY + 18.5;
  let legX = centerAreaX;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');

  // Agendado
  doc.setFillColor(37, 99, 235);
  doc.circle(legX + 1.2, legY - 0.9, 1.2, 'F');
  doc.setTextColor(37, 99, 235);
  doc.text('Agendado', legX + 3.2, legY);
  legX += doc.getTextWidth('Agendado') + 6;

  // Concluido
  doc.setFillColor(22, 163, 74);
  doc.circle(legX + 1.2, legY - 0.9, 1.2, 'F');
  doc.setTextColor(22, 163, 74);
  doc.text('Concluído', legX + 3.2, legY);
  legX += doc.getTextWidth('Concluído') + 6;

  // Adiado
  doc.setFillColor(217, 119, 6);
  doc.circle(legX + 1.2, legY - 0.9, 1.2, 'F');
  doc.setTextColor(217, 119, 6);
  doc.text('Adiado', legX + 3.2, legY);
  legX += doc.getTextWidth('Adiado') + 6;

  // Não Feito
  doc.setFillColor(220, 38, 38);
  doc.circle(legX + 1.2, legY - 0.9, 1.2, 'F');
  doc.setTextColor(220, 38, 38);
  doc.text('Não Feito', legX + 3.2, legY);
  legX += doc.getTextWidth('Não Feito') + 8;

  // Turnos
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Turnos: [M] Manhã (<12h)  •  [T] Tarde (≥12h)', legX, legY);

  // Sub-box 3: Right KPI (65mm width)
  const kpiAreaW = 65;
  const kpiAreaX = marginX + contentWidth - kpiAreaW;
  doc.setDrawColor(226, 232, 240);
  doc.line(kpiAreaX, headerY, kpiAreaX, headerY + headerH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL NO MÊS', kpiAreaX + 4, headerY + 4.5);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(`${monthEvents.length} Atividades`, kpiAreaX + 4, headerY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${agendadosCount} agendados • ${concluidosCount} concluídos`,
    kpiAreaX + 4,
    headerY + 14
  );
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    kpiAreaX + 4,
    headerY + 18.5
  );

  // 2. DAY-OF-WEEK HEADER BAR (H = 6mm)
  const weekBarY = headerY + headerH + 2;
  const weekBarH = 6;
  const colWidth = contentWidth / 7; // 39.57mm per column

  const weekDayNames = [
    'DOMINGO',
    'SEGUNDA-FEIRA',
    'TERÇA-FEIRA',
    'QUARTA-FEIRA',
    'QUINTA-FEIRA',
    'SEXTA-FEIRA',
    'SÁBADO',
  ];

  doc.setFillColor(30, 58, 138); // #1e3a8a
  doc.rect(marginX, weekBarY, contentWidth, weekBarH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  weekDayNames.forEach((dName, idx) => {
    const colX = marginX + idx * colWidth;
    doc.text(dName, colX + colWidth / 2, weekBarY + 4.2, { align: 'center' });
  });

  // 3. CALENDAR GRID
  const gridStartY = weekBarY + weekBarH;
  const footerH = 6;
  const footerY = pageHeight - footerH - 2;
  const availableGridH = footerY - gridStartY - 1; // ~164mm

  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const totalDays = differenceInCalendarDays(calEnd, calStart) + 1;
  const weeksCount = Math.ceil(totalDays / 7); // usually 5 or 6

  const rowHeight = availableGridH / weeksCount;

  let currentCalDay = calStart;

  for (let rowIdx = 0; rowIdx < weeksCount; rowIdx++) {
    for (let colIdx = 0; colIdx < 7; colIdx++) {
      const cellX = marginX + colIdx * colWidth;
      const cellY = gridStartY + rowIdx * rowHeight;
      const isCurrentM = isSameMonth(currentCalDay, monthStart);
      const isToday = isSameDay(currentCalDay, new Date());
      const dateStr = format(currentCalDay, 'yyyy-MM-dd');
      const dayEvents = isCurrentM ? monthEvents.filter((e) => e.date === dateStr) : [];

      // Sort events by period / time
      dayEvents.sort((a, b) => {
        const periodA = getPeriod(a.time);
        const periodB = getPeriod(b.time);
        if (periodA !== periodB) return periodA === 'manha' ? -1 : 1;
        return (a.time || '').localeCompare(b.time || '');
      });

      // Cell background & border
      if (!isCurrentM) {
        doc.setFillColor(248, 250, 252); // #f8fafc
        doc.setDrawColor(226, 232, 240); // #e2e8f0
        doc.setLineWidth(0.2);
        doc.rect(cellX, cellY, colWidth, rowHeight, 'FD');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(isToday ? 59 : 203, isToday ? 130 : 213, isToday ? 246 : 225);
        doc.setLineWidth(isToday ? 0.4 : 0.2);
        doc.rect(cellX, cellY, colWidth, rowHeight, 'FD');
      }

      // Day Sub-header inside Cell (height = 4.5mm)
      const subHeaderH = 4.2;
      doc.setFillColor(isCurrentM ? 241 : 248, isCurrentM ? 245 : 250, isCurrentM ? 249 : 252);
      doc.rect(cellX + 0.2, cellY + 0.2, colWidth - 0.4, subHeaderH, 'F');

      // Day number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isToday ? 8.5 : 7.5);
      if (isToday) {
        // Today circle
        doc.setFillColor(37, 99, 235);
        doc.circle(cellX + colWidth - 4, cellY + subHeaderH / 2 + 0.2, 2.2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(format(currentCalDay, 'd'), cellX + colWidth - 4, cellY + 3.1, { align: 'center' });
      } else {
        doc.setTextColor(isCurrentM ? 15 : 148, isCurrentM ? 23 : 163, isCurrentM ? 42 : 184);
        doc.text(format(currentCalDay, 'd'), cellX + colWidth - 2, cellY + 3.1, { align: 'right' });
      }

      // Day events count badge (if current month & has events)
      if (isCurrentM && dayEvents.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(37, 99, 235);
        doc.text(`${dayEvents.length} ${dayEvents.length === 1 ? 'atividade' : 'atividades'}`, cellX + 1.8, cellY + 3.1);
      }

      // Render Events inside the cell
      if (isCurrentM && dayEvents.length > 0) {
        const itemH = weeksCount === 6 ? 4.3 : 4.8;
        const itemGap = 0.8;
        const availableItemsH = rowHeight - subHeaderH - 1.5;
        const maxItems = Math.max(1, Math.floor(availableItemsH / (itemH + itemGap)));

        const willOverflow = dayEvents.length > maxItems;
        const itemsToRenderCount = willOverflow ? maxItems - 1 : Math.min(dayEvents.length, maxItems);

        for (let i = 0; i < itemsToRenderCount; i++) {
          const ev = dayEvents[i];
          const sc = STATUS_CONFIG[ev.status] || STATUS_CONFIG.agendado;
          const period = getPeriod(ev.time);
          const periodTag = period === 'manha' ? 'M' : 'T';
          const timeTag = ev.time ? ev.time.split(' ')[0] : '';
          const isExt = ev.isExternal || ev.demandType === 'externa' || (ev.description && ev.description.includes('[EXTERNAL_COMPANY:'));
          const compObj = companies.find((c) => c.id === ev.companyId);
          const compName = isExt ? (ev.externalCompanyName || ev.companyName || 'Demanda Externa') : (compObj ? compObj.name : ev.companyName || '');
          const groupName = getGroupName(compObj);
          const companyDisplay = isExt ? `⚡ ${compName}` : (groupName ? `${groupName}/${compName}` : compName);

          const itemY = cellY + subHeaderH + 1 + i * (itemH + itemGap);
          const itemX = cellX + 1;
          const itemW = colWidth - 2;

          // Event Box Fill
          doc.setFillColor(...sc.rgbBg);
          doc.setDrawColor(...sc.rgbBorder);
          doc.setLineWidth(0.15);
          doc.roundedRect(itemX, itemY, itemW, itemH, 0.8, 0.8, 'FD');

          // Left status accent bar
          doc.setFillColor(...sc.rgb);
          doc.rect(itemX, itemY, 1.2, itemH, 'F');

          // Event text
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.2);
          doc.setTextColor(...sc.rgb);

          const timePrefix = timeTag ? `[${timeTag} ${periodTag}] ` : `[${periodTag}] `;
          const textContent = `${timePrefix}${ev.title}${companyDisplay ? ` • ${companyDisplay}` : ''}`;
          const formattedText = fitText(doc, textContent, itemW - 3);

          doc.text(formattedText, itemX + 2, itemY + itemH - 1.3);
        }

        // Overflow "+N mais" indicator
        if (willOverflow) {
          const remainingCount = dayEvents.length - itemsToRenderCount;
          const overflowY = cellY + subHeaderH + 1 + itemsToRenderCount * (itemH + itemGap) + 2.5;
          doc.setFont('helvetica', 'bolditalic');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`+ ${remainingCount} agendamento(s) a mais...`, cellX + 2, overflowY);
        }
      }

      currentCalDay = addDays(currentCalDay, 1);
    }
  }

  // 4. FOOTER BAR
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(marginX, footerY, marginX + contentWidth, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'TOTALSAFETY & ECOCLINIC • SISTEMA DE GESTÃO DE SAÚDE E SEGURANÇA NO TRABALHO',
    marginX,
    footerY + 4
  );

  doc.setFont('helvetica', 'bold');
  doc.text(
    'CRONOGRAMA MENSAL EM FORMATO CALENDÁRIO A4',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.text(
    `Gerado via Sistema Web • Página 1 de 1`,
    marginX + contentWidth,
    footerY + 4,
    { align: 'right' }
  );
};

/**
 * Draws the A4 Table / Analytical Schedule Pages
 */
export const drawTableSchedulePages = (doc, {
  currentDate,
  events = [],
  companies = [],
  groups = [],
  profiles = [],
  filters = {},
  customTitle,
}, startOnNewPage = false) => {
  if (startOnNewPage) {
    doc.addPage('a4', 'l');
  }

  const margin = 10;
  const monthStart = startOfMonth(currentDate);

  const getCompName = (id) => companies.find((c) => c.id === id)?.name || id || 'Empresa';
  const getGroupName = (compObj) => {
    if (!compObj || !compObj.groupId) return '';
    const grp = groups.find((g) => g.id === compObj.groupId);
    return grp ? grp.name.replace(/^\d+\s*-\s*/, '').trim() : '';
  };
  const getProfName = (id) => profiles.find((p) => p.id === id)?.name || '';

  // Filter events for this month
  const monthEvents = events.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + 'T12:00:00');
    return isSameMonth(d, monthStart);
  });

  monthEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 1. Header Table
  autoTable(doc, {
    startY: margin,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      fontSize: 8.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
    },
    body: [
      [
        { content: '', rowSpan: 2, styles: { minCellWidth: 44, minCellHeight: 18 } },
        {
          content: 'SISTEMA INTEGRADO DE GESTÃO DE SEGURANÇA E SAÚDE NO TRABALHO — SGST',
          styles: { fontStyle: 'bold', fontSize: 10, textColor: [30, 58, 138] },
        },
      ],
      [
        {
          content: customTitle || `CRONOGRAMA DE AGENDAMENTOS (LISTA ANALÍTICA) — ${format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`,
          styles: { fontStyle: 'bold', fillColor: [241, 245, 249], fontSize: 9.5, textColor: [15, 23, 42] },
        },
      ],
    ],
    didDrawCell: (cellData) => {
      if (cellData.section === 'body' && cellData.column.index === 0 && cellData.row.index === 0) {
        drawLogo(doc, cellData.cell.x + 2, cellData.cell.y + 1, cellData.cell.width - 4, cellData.cell.height - 2);
      }
    },
  });

  // 2. Data Table
  const tableData = monthEvents.map((t) => {
    const isExt = t.isExternal || t.demandType === 'externa' || (t.description && t.description.includes('[EXTERNAL_COMPANY:'));
    const compObj = companies.find((c) => c.id === t.companyId);
    const cName = isExt ? (t.externalCompanyName || t.companyName || 'Demanda Externa') : (compObj ? compObj.name : t.companyName || getCompName(t.companyId));
    const gName = getGroupName(compObj);
    const companyDisplay = isExt ? `⚡ [Demanda Externa] ${cName}` : (gName ? `${gName} / ${cName}` : cName);

    const resp1 = getProfName(t.responsibleId);
    const resp2Id = getSecondaryResponsible(t.description);
    const resp2 = resp2Id ? getProfName(resp2Id) : '';
    const responsible = [resp1, resp2].filter(Boolean).join(' e ') || 'Não atribuído';

    const dateFormatted = format(new Date(t.date + 'T12:00:00'), 'dd/MM/yyyy');
    const period = getPeriod(t.time) === 'manha' ? 'Manhã' : 'Tarde';
    const timeDisplay = t.time ? `${period} (${t.time})` : period;

    return [
      dateFormatted,
      timeDisplay,
      companyDisplay,
      t.title,
      STATUS_CONFIG[t.status]?.label || t.status,
      responsible,
    ];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    margin: { left: margin, right: margin, bottom: margin + 8 },
    head: [['Data', 'Turno / Horário', 'Empresa / Unidade', 'Treinamento / Atividade', 'Status', 'Responsável']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 32 },
      2: { cellWidth: 62 },
      3: { cellWidth: 70 },
      4: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
      5: { cellWidth: 61 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const item = monthEvents[data.row.index];
        if (!item) return;
        const sc = STATUS_CONFIG[item.status];
        if (sc) {
          data.cell.styles.fillColor = sc.rgbBg;
          if (data.column.index === 4) {
            data.cell.styles.textColor = sc.rgb;
          }
        }
      }
    },
    didDrawPage: (data) => {
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height || pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `TotalSafety SGST • Cronograma Analítico • Página ${doc.internal.getNumberOfPages()}`,
        pageSize.width / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    },
  });

  // 3. KPI Summary Table after data table
  const finalY = doc.lastAutoTable.finalY + 4;
  if (finalY < 185) {
    const agendados = monthEvents.filter((t) => t.status === 'agendado').length;
    const concluidos = monthEvents.filter((t) => t.status === 'concluido').length;
    const adiados = monthEvents.filter((t) => t.status === 'adiado').length;
    const naoFeitos = monthEvents.filter((t) => t.status === 'nao_feito').length;

    autoTable(doc, {
      startY: finalY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { fontSize: 7.5, cellPadding: 2, halign: 'center' },
      body: [
        [
          { content: `Total de Atividades: ${monthEvents.length}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
          { content: `Agendados: ${agendados}`, styles: { fontStyle: 'bold', textColor: [37, 99, 235], fillColor: [239, 246, 255] } },
          { content: `Concluídos: ${concluidos}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74], fillColor: [236, 253, 245] } },
          { content: `Adiados: ${adiados}`, styles: { fontStyle: 'bold', textColor: [217, 119, 6], fillColor: [255, 251, 235] } },
          { content: `Não Feitos: ${naoFeitos}`, styles: { fontStyle: 'bold', textColor: [220, 38, 38], fillColor: [254, 242, 242] } },
        ],
      ],
    });
  }
};

/**
 * Generate A4 Calendar Grid PDF (Single Page A4 Landscape)
 */
export const generateCalendarGridPdf = (options) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  drawCalendarGridPage(doc, options);
  const monthStr = format(options.currentDate, 'MM_yyyy');
  doc.save(`cronograma_calendario_${monthStr}.pdf`);
  return doc;
};

/**
 * Generate A4 Table Schedule PDF (Landscape A4 Table)
 */
export const generateTableSchedulePdf = (options) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  drawTableSchedulePages(doc, options, false);
  const monthStr = format(options.currentDate, 'MM_yyyy');
  doc.save(`cronograma_tabela_${monthStr}.pdf`);
  return doc;
};

/**
 * Generate Combined Schedule Package (Page 1 = Calendar Grid A4, Page 2+ = Analytical Table A4)
 */
export const generateCombinedSchedulePdf = (options) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  // Page 1: Calendar Grid
  drawCalendarGridPage(doc, options);
  // Page 2+: Analytical Table
  drawTableSchedulePages(doc, options, true);
  const monthStr = format(options.currentDate, 'MM_yyyy');
  doc.save(`cronograma_completo_${monthStr}.pdf`);
  return doc;
};

/**
 * Generate IPA Schedule PDF (Campaigns & Partner Appointments in Calendar and Table A4 format)
 */
export const generateIpaSchedulePdf = ({
  currentDate,
  campaigns = [],
  partners = [],
  formatType = 'calendar', // 'calendar' | 'table' | 'combined'
  title,
}) => {
  // Normalize IPA campaigns & partners to the standard event structure
  const mappedCampaigns = campaigns.map((c) => ({
    id: `camp_${c.id}`,
    title: `${c.company} (${c.eventType === 'campanha' ? 'Unid. Móvel' : c.eventType === 'acao' ? 'Ação In-Company' : 'Palestra'})`,
    date: c.date,
    time: c.eventType === 'campanha' ? '08:00' : '14:00',
    companyName: c.company,
    status: c.attendedCount > 0 ? 'concluido' : 'agendado',
    description: `Previstos: ${c.expectedCount} | Atendidos: ${c.attendedCount}`,
  }));

  const mappedPartners = partners.map((p) => ({
    id: `part_${p.id}`,
    title: `${p.client} — Clínica: ${p.partnerClinic}`,
    date: p.date,
    time: '09:00',
    companyName: p.client,
    status: p.paid ? 'concluido' : 'agendado',
    description: `UF: ${p.state} | Valor: R$ ${p.value}`,
  }));

  const allEvents = [...mappedCampaigns, ...mappedPartners];
  const defaultTitle = title || `CRONOGRAMA OPERACIONAL IPA — ${format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`;

  const options = {
    currentDate,
    events: allEvents,
    companies: [],
    groups: [],
    profiles: [],
    filters: {
      scope: 'Operação IPA (Unidade Móvel & Parceiras)',
    },
    customTitle: defaultTitle,
  };

  if (formatType === 'table') {
    return generateTableSchedulePdf(options);
  } else if (formatType === 'combined') {
    return generateCombinedSchedulePdf(options);
  }
  return generateCalendarGridPdf(options);
};
