import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrencyBRL = (val) => {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Gera e baixa a Proposta Comercial em PDF da EcoClinic.
 * Documento 100% exclusivo EcoClinic Medicina e Segurança do Trabalho.
 */
export function generateCommercialProposalPDF({
  clientName = 'Empresa Cliente',
  clientCnpj = '',
  clientContact = '',
  clientCity = '',
  proposalNumber = '',
  proposalDate = '',
  validityDays = 30,
  paymentTerms = 'Faturamento mensal para 30 dias via boleto bancário.',
  observations = '',
  exams = [],
  discountType = 'none',
  discountValue = 0,
  subtotal = 0,
  discountAmount = 0,
  total = 0
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const finalProposalNum = proposalNumber || `PROP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const finalDate = proposalDate || new Date().toLocaleDateString('pt-BR');

  // Cores EcoClinic
  const brandDarkGreen = [5, 122, 85];    // #057a55 Emerald Green
  const brandLightGreen = [209, 250, 229]; // #d1fae5
  const brandDark = [15, 23, 42];         // #0f172a Slate Dark
  const brandGray = [71, 85, 105];        // #475569 Slate Muted
  const brandBgLight = [248, 250, 252];    // #f8fafc Light Gray
  const borderGray = [226, 232, 240];     // #e2e8f0

  // ==========================================
  // 1. CABEÇALHO SUPERIOR (PAGE 1)
  // ==========================================
  // Barra de topo colorida
  doc.setFillColor(...brandDarkGreen);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Título da marca no topo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ECOCLINIC • MEDICINA E SEGURANÇA DO TRABALHO', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Gestão Integrada em Saúde Ocupacional, PCMSO, Higiene e eSocial', margin, 18);

  // Número da proposta no canto superior direito
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`PROPOSTA COMERCIAL Nº ${finalProposalNum}`, pageWidth - margin, 11, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Emissão: ${finalDate} | Validade: ${validityDays} dias`, pageWidth - margin, 18, { align: 'right' });

  // Linha sutil separadora
  let currentY = 32;

  // ==========================================
  // 2. DADOS DO CLIENTE / PROPONENTE
  // ==========================================
  doc.setFillColor(...brandBgLight);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 28, 2, 2, 'FD');

  // Faixa do título do bloco de cliente
  doc.setFillColor(...brandLightGreen);
  doc.roundedRect(margin, currentY, contentWidth, 7, 2, 2, 'F');
  doc.rect(margin, currentY + 4, contentWidth, 3, 'F'); // retira canto inferior arredondado do header

  doc.setTextColor(...brandDarkGreen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DADOS DA EMPRESA DESTINATÁRIA', margin + 4, currentY + 5);

  // Informações do cliente dentro do card
  doc.setTextColor(...brandDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Empresa / Razão Social:', margin + 4, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(String(clientName || 'Cliente').toUpperCase(), margin + 45, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('CNPJ:', margin + 4, currentY + 19);
  doc.setFont('helvetica', 'normal');
  doc.text(clientCnpj || 'A informar / Não informado', margin + 45, currentY + 19);

  doc.setFont('helvetica', 'bold');
  doc.text('Aos Cuidados de:', margin + 4, currentY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(clientContact || 'Recursos Humanos / Gestão de Pessoas / SESMT', margin + 45, currentY + 24);

  // Coluna direita do card de cliente
  const colRightX = margin + (contentWidth / 2) + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Cidade / UF:', colRightX, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.text(clientCity || 'Unidade Contratante', colRightX + 24, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.text('Emissor:', colRightX, currentY + 19);
  doc.setFont('helvetica', 'normal');
  doc.text('EcoClinic Saúde Ocupacional', colRightX + 24, currentY + 19);

  currentY += 34;

  // ==========================================
  // 3. APRESENTAÇÃO / INTRODUÇÃO
  // ==========================================
  doc.setTextColor(...brandDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TABELA DE EXAMES E PROCEDIMENTOS OCUPACIONAIS', margin, currentY);
  currentY += 4;

  doc.setTextColor(...brandGray);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'Apresentamos abaixo a relação de procedimentos, exames clínicos e complementares com valores diferenciados propostos para atendimento da sua empresa:',
    margin,
    currentY,
    { maxWidth: contentWidth }
  );
  currentY += 6;

  // ==========================================
  // 4. TABELA DE EXAMES (AUTOTABLE MULTI-PAGE)
  // ==========================================
  const tableData = exams.map((item, idx) => {
    const qty = item.qty || 1;
    const price = item.price || 0;
    const itemTotal = price * qty;
    return [
      String(idx + 1),
      item.name,
      item.category || 'Geral',
      `${qty}`,
      formatCurrencyBRL(price),
      formatCurrencyBRL(itemTotal)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [['#', 'Procedimento / Exame Ocupacional', 'Categoria', 'Qtd', 'Unitário', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: brandDarkGreen,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 2.2
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      cellPadding: 2,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    },
    didDrawPage: (data) => {
      // Header for pages > 1
      if (data.pageNumber > 1) {
        doc.setFillColor(...brandDarkGreen);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`ECOCLINIC • Proposta Comercial Nº ${finalProposalNum} - ${clientName}`, margin, 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`Página ${data.pageNumber}`, pageWidth - margin, 8, { align: 'right' });
      }
    }
  });

  // Posição final após a tabela
  let finalY = doc.lastAutoTable.finalY + 4;

  // Se estiver muito próximo do rodapé, avança página
  if (finalY > pageHeight - 65) {
    doc.addPage();
    finalY = 20;
  }

  // ==========================================
  // 5. RESUMO FINANCEIRO (CARD DE TOTAIS)
  // ==========================================
  const summaryBoxWidth = 85;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(...brandBgLight);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(summaryBoxX, finalY, summaryBoxWidth, discountAmount > 0 ? 25 : 18, 2, 2, 'FD');

  let sumLineY = finalY + 6;
  doc.setTextColor(...brandDark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Subtotal:', summaryBoxX + 4, sumLineY);
  doc.text(formatCurrencyBRL(subtotal), summaryBoxX + summaryBoxWidth - 4, sumLineY, { align: 'right' });

  if (discountAmount > 0) {
    sumLineY += 6;
    doc.setTextColor(220, 38, 38);
    doc.text(`Desconto (${discountType === 'percent' ? `${discountValue}%` : 'R$'}):`, summaryBoxX + 4, sumLineY);
    doc.text(`- ${formatCurrencyBRL(discountAmount)}`, summaryBoxX + summaryBoxWidth - 4, sumLineY, { align: 'right' });
  }

  sumLineY += 7;
  doc.setFillColor(...brandLightGreen);
  doc.rect(summaryBoxX, sumLineY - 4.5, summaryBoxWidth, 7, 'F');
  doc.setTextColor(...brandDarkGreen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('VALOR TOTAL:', summaryBoxX + 4, sumLineY);
  doc.text(formatCurrencyBRL(total), summaryBoxX + summaryBoxWidth - 4, sumLineY, { align: 'right' });

  finalY = Math.max(finalY + (discountAmount > 0 ? 28 : 22), sumLineY + 6);

  // ==========================================
  // 6. CONDIÇÕES GERAIS E OBSERVAÇÕES
  // ==========================================
  if (finalY > pageHeight - 55) {
    doc.addPage();
    finalY = 20;
  }

  doc.setTextColor(...brandDark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONDIÇÕES COMERCIAIS & OPERACIONAIS', margin, finalY);
  finalY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...brandGray);

  const bulletPoints = [
    `• Condições de Pagamento: ${paymentTerms.trim() || 'Faturamento mensal para 30 dias via boleto bancário.'}`,
    `• Validade da Proposta: ${validityDays} (trinta) dias a contar da data de sua emissão.`,
    '• Locais de Atendimento: Realização dos exames na unidade EcoClinic e possibilidade de atendimento In Company.',
    '• eSocial e Gestão: Emissão ágil do ASO e registro das informações para os eventos de SST do eSocial (S-2220 / S-2240).',
    ...(observations.trim() ? [`• Observações Adicionais: ${observations.trim()}`] : [])
  ];

  bulletPoints.forEach(point => {
    doc.text(point, margin, finalY, { maxWidth: contentWidth });
    finalY += 4;
  });

  finalY += 4;

  // ==========================================
  // 7. ASSINATURAS (ECOCLINIC & CLIENTE)
  // ==========================================
  if (finalY > pageHeight - 40) {
    doc.addPage();
    finalY = 30;
  } else {
    finalY += 8;
  }

  const signWidth = 75;
  const signLeftX = margin + 10;
  const signRightX = pageWidth - margin - signWidth - 10;

  // Linha EcoClinic
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.4);
  doc.line(signLeftX, finalY, signLeftX + signWidth, finalY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...brandDarkGreen);
  doc.text('ECOCLINIC MEDICINA OCUPACIONAL', signLeftX + (signWidth / 2), finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...brandGray);
  doc.text('Departamento Comercial & Atendimento', signLeftX + (signWidth / 2), finalY + 8, { align: 'center' });

  // Linha Cliente
  doc.line(signRightX, finalY, signRightX + signWidth, finalY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...brandDark);
  doc.text(String(clientName || 'CLIENTE').toUpperCase(), signRightX + (signWidth / 2), finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...brandGray);
  doc.text('De Acordo / Aceite da Proposta', signRightX + (signWidth / 2), finalY + 8, { align: 'center' });

  // ==========================================
  // 8. RODAPÉ DE TODAS AS PÁGINAS
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...brandGray);
    doc.text(
      'EcoClinic Medicina e Segurança do Trabalho • Documento Comercial Confidencial',
      margin,
      pageHeight - 6
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // Nome do arquivo seguro e sanitizado
  const cleanClient = (clientName || 'Cliente')
    .replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const fileName = `Proposta_Comercial_EcoClinic_${cleanClient}.pdf`;

  // Baixa o PDF
  doc.save(fileName);
  return doc;
}
