import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '../assets/logoBase64.js';

/**
 * Desenha o cabeçalho padrão SGST em uma página específica do documento.
 * O cabeçalho ocupa exatamente da coordenada Y = 10mm até Y = 40mm (altura total de 30mm).
 */
const drawHeader = (doc, pageNum, totalPagesExp, data) => {
  const margin = 10;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2); // 190mm em folha A4

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  // 1. Célula do Logo (x: 10, y: 10, w: 40, h: 22)
  doc.rect(margin, margin, 40, 22);
  if (logoBase64) {
    try {
      const props = doc.getImageProperties(logoBase64);
      const cellW = 40 - 4; // 36mm
      const cellH = 22 - 4; // 18mm
      const ratio = props.width / props.height;
      let renderW = cellW;
      let renderH = renderW / ratio;

      if (renderH > cellH) {
        renderH = cellH;
        renderW = renderH * ratio;
      }

      const imgX = margin + (40 - renderW) / 2;
      const imgY = margin + (22 - renderH) / 2;
      doc.addImage(logoBase64, 'PNG', imgX, imgY, renderW, renderH, undefined, 'FAST');
    } catch (e) {
      console.error('Erro ao renderizar logo no cabeçalho:', e);
    }
  }

  // 2. Célula Superior SGST (x: 50, y: 10, w: 150, h: 13)
  const rightBoxX = margin + 40;
  const rightBoxW = contentWidth - 40;
  doc.rect(rightBoxX, margin, rightBoxW, 13);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  const titleCenterX = rightBoxX + (rightBoxW / 2);
  doc.text('SISTEMA DE GESTÃO DE SEGURANÇA NO TRABALHO - SGST', titleCenterX, margin + 7.5, { align: 'center', baseline: 'middle' });

  // 3. Célula Inferior Título do Relatório (x: 50, y: 23, w: 150, h: 9)
  doc.setFillColor(240, 240, 240);
  doc.rect(rightBoxX, margin + 13, rightBoxW, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  const repTitle = `TÍTULO: ${data.reportTitle || 'RELATÓRIO DE AÇÕES DE SST'}`;
  doc.text(repTitle, titleCenterX, margin + 13 + 4.5, { align: 'center', baseline: 'middle' });

  // 4. Linha de Metadados (4 colunas iguais, x: 10, y: 32, w: 190, h: 8)
  const metaY = margin + 22; // 32mm
  const colW = contentWidth / 4; // 47.5mm

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);

  const metaCols = [
    { line1: 'Nº documento:', line2: 'SGST 001' },
    { line1: 'Revisão:', line2: '000' },
    { line1: 'Data Emissão / Rev.:', line2: data.date || '01/07/2025' },
    { line1: 'Página:', line2: `${pageNum} de ${totalPagesExp}` }
  ];

  metaCols.forEach((col, index) => {
    const colX = margin + (index * colW);
    doc.rect(colX, metaY, colW, 8);
    const centerX = colX + (colW / 2);
    doc.text(col.line1, centerX, metaY + 3, { align: 'center', baseline: 'middle' });
    doc.text(col.line2, centerX, metaY + 6.2, { align: 'center', baseline: 'middle' });
  });
};

export const generateSSTReport = async (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 10;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Total pages placeholder
  const totalPagesExp = '{tp}';
  
  // O conteúdo sempre começa abaixo do cabeçalho (que termina em 40mm)
  let startY = 45;

  // Informações da Empresa e Relatório
  autoTable(doc, {
    startY: startY,
    margin: { top: 45, bottom: 20, left: margin, right: margin },
    theme: 'plain',
    styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
    body: [
      [
        { content: `Relatório nº: ${data.reportNumber || '001/' + new Date().getFullYear()}`, styles: { halign: 'center' } },
        { content: `Data: ${data.date}`, styles: { halign: 'right' } }
      ],
      [
        { content: `Empresa: ${data.companyName}`, colSpan: 2, styles: { fontStyle: 'bold' } }
      ],
      [
        { content: `Local: ${data.siteName || ''}`, colSpan: 2 }
      ]
    ]
  });
  
  startY = doc.lastAutoTable.finalY;

  // Processamento das Ações
  if (data.actions && data.actions.length > 0) {
    data.actions.forEach((action, actionIndex) => {
      
      // Espaçamento entre ações, exceto para a primeira
      if (actionIndex > 0) {
        startY += 5;
      }

      // Estima a altura necessária para esta ação
      let requiredHeight = 30; // Altura base (Ação + Justificativa)
      if (action.irregularities && action.irregularities.trim()) requiredHeight += 20;
      if (action.recommendations && action.recommendations.trim()) requiredHeight += 20;
      if (action.photos && action.photos.length > 0) {
        const maxCols = action.photos.length > 2 ? 3 : 2;
        requiredHeight += 85 * Math.ceil(action.photos.length / maxCols);
      }

      // Se a altura necessária for maior que o espaço disponível na página atual, quebra página
      if (startY > 45 && startY + requiredHeight > pageHeight - 20) {
        doc.addPage();
        startY = 45;
      }

      // Dados da Ação e Justificativa
      const actionBody = [];
      if (action.actionText && action.actionText.trim()) {
        actionBody.push([{ content: `Ação: ${action.actionText}` }]);
      }
      if (action.justificationText && action.justificationText.trim()) {
        actionBody.push([{ content: `Justificativa da ação: ${action.justificationText}` }]);
      }
      if (action.irregularities && action.irregularities.trim()) {
        actionBody.push([{ content: 'Irregularidades apontadas:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
      }

      if (actionBody.length > 0) {
        autoTable(doc, {
          startY: startY + 2,
          margin: { top: 45, bottom: 20, left: margin, right: margin },
          theme: 'plain',
          pageBreak: 'avoid',
          styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
          body: actionBody
        });
        startY = doc.lastAutoTable.finalY;
      } else {
        startY += 2;
      }

      // Lista de Irregularidades
      if (action.irregularities && action.irregularities.trim()) {
        const listBody = action.irregularities.split('\n').map(item => [{ content: `• ${item.trim()}` }]);
        if (listBody.length > 0 && listBody[0][0].content !== '• ') {
          autoTable(doc, {
            startY: startY,
            margin: { top: 45, bottom: 20, left: margin, right: margin },
            theme: 'plain',
            pageBreak: 'avoid',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
            body: listBody
          });
          startY = doc.lastAutoTable.finalY;
        }
      }

      // Fotos da Ação
      if (action.photos && action.photos.length > 0) {
        const maxCols = action.photos.length > 2 ? 3 : 2;
        const padding = 2;
        const photoHeight = 75; 
        const availableWidth = doc.internal.pageSize.getWidth() - (margin * 2);
        const colWidth = availableWidth / maxCols;
        
        const photoRows = [];
        
        for (let i = 0; i < action.photos.length; i += maxCols) {
          const rowImages = [];
          const rowDesc = [];
          let hasAnyDesc = false;
          for (let j = 0; j < maxCols; j++) {
            const photo = action.photos[i + j];
            if (photo) {
              rowImages.push({ content: '', styles: { minCellHeight: photoHeight, cellWidth: colWidth } });
              rowDesc.push({ content: photo.description || ' ', styles: { minCellHeight: 10, halign: 'center', cellWidth: colWidth } }); 
              if (photo.description && photo.description.trim()) hasAnyDesc = true;
            } else {
              rowImages.push({ content: '', styles: { minCellHeight: photoHeight, cellWidth: colWidth } });
              rowDesc.push({ content: ' ', styles: { minCellHeight: 10, cellWidth: colWidth } });
            }
          }
          photoRows.push(rowImages);
          if (hasAnyDesc) {
            photoRows.push(rowDesc);
          }
        }
        
        autoTable(doc, {
          startY: startY,
          margin: { top: 45, bottom: 20, left: margin, right: margin },
          theme: 'plain',
          pageBreak: 'avoid',
          styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 8, cellPadding: 1, halign: 'center', valign: 'middle' },
          body: photoRows,
          didDrawCell: (cellData) => {
            if (cellData.cell.raw && cellData.cell.raw.content === '' && cellData.cell.styles.minCellHeight === photoHeight) {
              let imgRowIndex = 0;
              for (let r = 0; r < cellData.row.index; r++) {
                if (cellData.table.body[r].cells[0].raw.content === '') imgRowIndex++;
              }
              const imgIndex = imgRowIndex * maxCols + cellData.column.index;
              const photo = action.photos[imgIndex];
              if (photo && photo.base64) {
                try {
                  const props = doc.getImageProperties(photo.base64);
                  const cellW = cellData.cell.width - (padding * 2);
                  const cellH = cellData.cell.height - (padding * 2);
                  const imgRatio = props.width / props.height;
                  const cellRatio = cellW / cellH;
                  
                  let renderW, renderH, xOffset = 0, yOffset = 0;
                  
                  if (imgRatio > cellRatio) {
                    renderW = cellW;
                    renderH = cellW / imgRatio;
                    yOffset = (cellH - renderH) / 2;
                  } else {
                    renderH = cellH;
                    renderW = cellH * imgRatio;
                    xOffset = (cellW - renderW) / 2;
                  }
                  
                  const imgType = photo.base64.indexOf('image/png') > -1 ? 'PNG' : 'JPEG';
                  
                  doc.addImage(
                    photo.base64, 
                    imgType, 
                    cellData.cell.x + padding + xOffset, 
                    cellData.cell.y + padding + yOffset, 
                    renderW, 
                    renderH, 
                    undefined, 
                    'FAST'
                  );
                } catch(e) {
                  console.error('Erro desenhando foto no PDF', e);
                }
              }
            }
          }
        });
        
        startY = doc.lastAutoTable.finalY;
      }

      // Ação Recomendada
      if (action.recommendations && action.recommendations.trim()) {
        autoTable(doc, {
          startY: startY,
          margin: { top: 45, bottom: 20, left: margin, right: margin },
          theme: 'plain',
          pageBreak: 'avoid',
          styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
          body: [
            [{ content: 'Ação recomendada:', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
          ]
        });
        startY = doc.lastAutoTable.finalY;
        
        const listBody = action.recommendations.split('\n').map(item => [{ content: `• ${item.trim()}` }]);
        if (listBody.length > 0 && listBody[0][0].content !== '• ') {
          autoTable(doc, {
            startY: startY,
            margin: { top: 45, bottom: 20, left: margin, right: margin },
            theme: 'plain',
            pageBreak: 'avoid',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
            body: listBody
          });
          startY = doc.lastAutoTable.finalY;
        }
      }
    });
  }

  // Observações 
  if (data.observation && data.observation.trim()) {
    autoTable(doc, {
      startY: startY + 8,
      margin: { top: 45, bottom: 20, left: margin, right: margin },
      theme: 'plain',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 10, cellPadding: 2, fillColor: [255, 255, 255], textColor: [0, 0, 0] },
      body: [
        [{ content: 'Observações:\n' + data.observation }]
      ]
    });
    startY = doc.lastAutoTable.finalY;
  }

  // Bloco de Assinatura
  if (pageHeight - startY < 50) {
    doc.addPage();
    startY = 45;
  }

  startY += 30; 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageWidthCenter = pageWidth / 2;
  
  doc.setLineWidth(0.5);
  doc.line(pageWidthCenter - 30, startY, pageWidthCenter + 30, startY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.technicianName?.toUpperCase() || 'TÉCNICO', pageWidthCenter, startY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Técnico em Segurança do Trabalho', pageWidthCenter, startY + 9, { align: 'center' });
  
  const registerText = data.technicianRegister || 'MTE / SRTE N°';
  doc.text(registerText, pageWidthCenter, startY + 13, { align: 'center' });

  // Pós-processamento: Desenha o cabeçalho idêntico e consistente em todas as páginas geradas
  const totalPages = doc.internal.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    drawHeader(doc, pageNum, totalPagesExp, data);
  }

  // Atualiza o total de páginas ({tp} -> totalPages)
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  // Salva o PDF no navegador
  doc.save(`Relatorio_${data.reportTitle || 'SST'}_${data.companyName || 'Empresa'}_${(data.date || '').replace(/\//g, '-')}.pdf`);
};
