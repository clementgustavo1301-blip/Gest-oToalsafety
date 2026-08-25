import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { logoBase64 } from '../assets/logoBase64';

export const generateSSTReport = async (data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 10;
  
  // Total pages placeholder
  const totalPagesExp = '{tp}';
  
  const didDrawPage = (data_hook) => {
    // Save current Y to restore later
    const currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 0;
    
    autoTable(doc, {
      startY: margin,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, halign: 'center', valign: 'middle', cellPadding: 2 },
      body: [
        [
          { content: '', rowSpan: 2, styles: { minCellWidth: 40 } }, // Placeholder para logo
          { content: 'SISTEMA DE GESTÃO DE SEGURANÇA NO TRABALHO - SGST', styles: { fontStyle: 'bold', fontSize: 11, minCellHeight: 15 } }
        ],
        [
          { content: `TÍTULO: ${data.reportTitle || 'RELATÓRIO DE AÇÕES DE SST'}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ]
      ],
      didDrawCell: (cellData) => {
        if (cellData.row.index === 0 && cellData.column.index === 0 && logoBase64) {
          try {
             const props = doc.getImageProperties(logoBase64);
             const cellW = cellData.cell.width - 4;
             const cellH = cellData.cell.height - 4;
             const ratio = props.width / props.height;
             
             let renderW = cellW;
             let renderH = renderW / ratio;
             
             if(renderH > cellH) {
                renderH = cellH;
                renderW = renderH * ratio;
             }
             
             const x = cellData.cell.x + (cellData.cell.width - renderW) / 2;
             const y = cellData.cell.y + (cellData.cell.height - renderH) / 2;
             
             doc.addImage(logoBase64, 'PNG', x, y, renderW, renderH, undefined, 'FAST');
          } catch(e) {}
        }
      }
    });

    const finalY1 = doc.lastAutoTable.finalY;

    autoTable(doc, {
      startY: finalY1,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 1 },
      body: [
        [
          { content: 'Nº documento:\nSGST 001' },
          { content: 'Revisão:\n000' },
          { content: `Data Emissão / Rev.:\n${data.date || '01/07/2025'}` },
          { content: `Página:\n${data_hook.pageNumber} de ${totalPagesExp}` }
        ]
      ]
    });
    
    // Top margin for subsequent autoTables
    data_hook.settings.margin.top = doc.lastAutoTable.finalY + 5;
  };

  // We use a dummy table just to trigger the first page header properly and set startY
  autoTable(doc, {
    startY: 0,
    margin: { top: 40 }, // will be overridden by didDrawPage on next pages
    body: [],
    didDrawPage: didDrawPage
  });
  
  let startY = 40; // Approx finalY of header

  // Header and initial tables (Company Info)
  autoTable(doc, {
    startY: startY,
    margin: { left: margin, right: margin },
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
    ],
    didDrawPage: didDrawPage
  });
  
  startY = doc.lastAutoTable.finalY;

  // Process Actions
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

      // Se a altura necessária for maior que o espaço disponível, força quebra de página
      if (startY + requiredHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        const hookData = { pageNumber: doc.internal.getNumberOfPages(), settings: { margin: { top: margin } } };
        didDrawPage(hookData);
        startY = hookData.settings.margin.top;
      }

      // Actions and Justification
      const actionBody = [];
      if (action.actionText && action.actionText.trim()) {
        actionBody.push([{ content: `Ação: ${action.actionText}` }]);
      }
      if (action.justificationText && action.justificationText.trim()) {
        actionBody.push([{ content: `Justificativa da ação: ${action.justificationText}` }]);
      }
      if (action.irregularities && action.irregularities.trim()) {
        actionBody.push([{ content: 'Irregularidades apontadas:', styles: { fontStyle: 'bold', fillColor: [240,240,240] } }]);
      }

      if (actionBody.length > 0) {
        autoTable(doc, {
          startY: startY + 2,
          margin: { left: margin, right: margin },
          theme: 'plain',
          pageBreak: 'avoid',
          styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
          body: actionBody,
          didDrawPage: didDrawPage
        });
        startY = doc.lastAutoTable.finalY;
      } else {
        startY += 2;
      }

      // Irregularities list
      if (action.irregularities && action.irregularities.trim()) {
        const listBody = action.irregularities.split('\n').map(item => [{ content: `• ${item.trim()}` }]);
        if (listBody.length > 0 && listBody[0][0].content !== '• ') {
            autoTable(doc, {
            startY: startY,
            margin: { left: margin, right: margin },
            theme: 'plain',
            pageBreak: 'avoid',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
            body: listBody,
            didDrawPage: didDrawPage
            });
            startY = doc.lastAutoTable.finalY;
        }
      }

      // Fotos
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
          margin: { left: margin, right: margin },
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
                    const cellW = cellData.cell.width - (padding*2);
                    const cellH = cellData.cell.height - (padding*2);
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
                } catch(e) { console.error('Erro desenhando foto', e) }
              }
            }
          },
          didDrawPage: didDrawPage
        });
        
        startY = doc.lastAutoTable.finalY;
      }

      // Ação Recomendada
      if (action.recommendations && action.recommendations.trim()) {
        autoTable(doc, {
          startY: startY,
          margin: { left: margin, right: margin },
          theme: 'plain',
          pageBreak: 'avoid',
          styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
          body: [
            [{ content: 'Ação recomendada:', styles: { fontStyle: 'bold', fillColor: [240,240,240] } }]
          ],
          didDrawPage: didDrawPage
        });
        startY = doc.lastAutoTable.finalY;
        
        const listBody = action.recommendations.split('\n').map(item => [{ content: `• ${item.trim()}` }]);
        if (listBody.length > 0 && listBody[0][0].content !== '• ') {
            autoTable(doc, {
            startY: startY,
            margin: { left: margin, right: margin },
            theme: 'plain',
            pageBreak: 'avoid',
            styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 9, cellPadding: 1.5 },
            body: listBody,
            didDrawPage: didDrawPage
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
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.2, fontSize: 10, cellPadding: 2, fillColor: [255, 255, 255], textColor: [0,0,0] },
      body: [
        [{ content: 'Observações:\n' + data.observation }]
      ],
      didDrawPage: didDrawPage
    });
    startY = doc.lastAutoTable.finalY;
  }

  // Assinatura
  const pageHeight = doc.internal.pageSize.getHeight();
  if (pageHeight - startY < 50) {
    doc.addPage();
    didDrawPage({ pageNumber: doc.internal.getNumberOfPages(), settings: { margin: { top: 40 } } });
    startY = 40;
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

  // Update total pages
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  // Save the PDF
  doc.save(`Relatorio_${data.reportTitle || 'SST'}_${data.companyName}_${data.date.replace(/\//g, '-')}.pdf`);
};
