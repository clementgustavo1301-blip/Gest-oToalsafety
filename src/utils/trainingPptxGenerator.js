import JSZip from 'jszip';
import { getInstructorSignatureUrl } from '../data/officialTrainingModels';

/**
 * Utilitário de geração de certificados PPTX para o setor de Treinamento.
 * Clona os slides do modelo (.pptx) para cada participante,
 * substituindo tags e variáveis inteligentes.
 */

export async function generateTrainingPPTX({
  templateBuffer,
  certModel = 'modelo2', // 'modelo1' | 'modelo2'
  curso,
  descricao,
  data,
  duracao,
  validade,
  local,
  empresa,
  instrutorNome,
  instrutorCargo,
  instrutorRegistro,
  conteudo,
  colaboradores,
  turmaSignatures
}) {
  let buffer = templateBuffer;

  // Se não foi passado buffer diretamente, busca o modelo oficial selecionado
  if (!buffer) {
    const targetTemplate = certModel === 'modelo1' ? '/template-modelo1.pptx' : '/template-modelo2.pptx';
    try {
      const response = await fetch(targetTemplate);
      if (response.ok) {
        buffer = await response.arrayBuffer();
      }
    } catch {
      // Ignora erro de fetch
    }
  }

  // Fallback caso o modelo específico não carregue
  if (!buffer) {
    try {
      const response = await fetch('/template-certificado.pptx');
      if (response.ok) {
        buffer = await response.arrayBuffer();
      }
    } catch {
      // Ignora
    }
  }

  const templateZip = await JSZip.loadAsync(buffer);
  const newZip = await JSZip.loadAsync(await templateZip.generateAsync({ type: 'arraybuffer' }));

  // Identificar quais slides existem no modelo original
  const templateSlideFiles = Object.keys(templateZip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return numA - numB;
    });

  const templateSlides = [];
  for (const sFile of templateSlideFiles) {
    const xml = await templateZip.file(sFile).async('string');
    const relsFile = sFile.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    const relsXml = templateZip.file(relsFile) ? await templateZip.file(relsFile).async('string') : null;
    templateSlides.push({ xml, relsXml });
  }

  // Remove slides existentes do newZip
  const allFiles = Object.keys(newZip.files);
  allFiles.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\//.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\/_rels\//.test(f)).forEach(f => newZip.remove(f));

  // Formatações
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatCPF = (cpfStr) => {
    if (!cpfStr) return '';
    const digits = cpfStr.replace(/\D/g, '');
    if (digits.length !== 11) return cpfStr;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formattedDate = formatDate(data);

  const escapeXml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const escapeRegexChar = (char) => {
    return char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };

  const replaceText = (xmlStr, searchStrs, replaceStr) => {
    let result = xmlStr;
    const searchArray = Array.isArray(searchStrs) ? searchStrs : [searchStrs];
    const safeReplace = escapeXml(replaceStr);

    for (const searchStr of searchArray) {
      if (!searchStr) continue;
      const chars = searchStr.trim().split('');
      const regexPattern = chars.map(c => escapeRegexChar(c)).join('(?:<[^>]+>)*');
      const regex = new RegExp('>\\s*' + regexPattern + '\\s*<', 'g');
      result = result.replace(regex, () => '>' + safeReplace + '<');
    }
    return result;
  };

  let slideCounter = 1;
  const slideList = [];
  let nextSlideId = 500;
  let nextRId = 200;

  function buildRels(originalRels) {
    if (!originalRels) return '';
    return originalRels.replace(/<Relationship[^>]*notesSlide[^>]*\/>/g, '');
  }

  // Filtrar colaboradores com nome preenchido
  const activeColaboradores = (colaboradores || []).filter(c => c.nome && c.nome.trim());
  const listToProcess = activeColaboradores.length > 0 ? activeColaboradores : [{ nome: 'Participante', cpf: '' }];

  for (const colab of listToProcess) {
    const formattedCpf = formatCPF(colab.cpf);

    for (let i = 0; i < templateSlides.length; i++) {
      const template = templateSlides[i];
      let xml = template.xml;

      // 1. Participante / Aluno
      xml = replaceText(xml, [
        '{{NOME_ALUNO}}', '{{ALUNO}}', '{{NOME}}', '{{PARTICIPANTE}}',
        '[NOME_ALUNO]', '[ALUNO]', '[NOME]', '[PARTICIPANTE]',
        'Gustavo Clement Onraed Vieira', 'Gustavo', 'Nome do Aluno', 'Nome do Participante'
      ], colab.nome);

      // 2. CPF
      xml = replaceText(xml, [
        '{{CPF}}', '{{CPF_ALUNO}}', '[CPF]',
        '114.151.744-23', '11415174423', '000.000.000-00', 'CPF: 000.000.000-00'
      ], formattedCpf);

      // 3. Curso / Treinamento
      if (curso) {
        xml = replaceText(xml, [
          '{{CURSO}}', '{{TREINAMENTO}}', '{{NOME_TREINAMENTO}}', '[CURSO]', '[TREINAMENTO]',
          'Nome do Treinamento', 'Nome do Curso', 'NR - 06', 'NR-06'
        ], curso);
      }

      // 4. Descrição do Certificado
      if (descricao) {
        xml = replaceText(xml, [
          '{{DESCRICAO}}', '[DESCRICAO]',
          'Sobre uso e guarda de EPI conzxzxzxforme exigências da Norma Regulamentadora - NR 06',
          'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06'
        ], descricao);
      }

      // 5. Carga Horária / Duração
      if (duracao) {
        xml = replaceText(xml, [
          '{{CARGA_HORARIA}}', '{{DURACAO}}', '[CARGA_HORARIA]', '[DURACAO]',
          '1 hora', '8 horas', 'Carga Horária'
        ], duracao);
      }

      // 6. Data / Período
      if (formattedDate) {
        xml = replaceText(xml, [
          '{{DATA}}', '{{PERIODO}}', '[DATA]', '[PERIODO]',
          '07/08/2026', '09/08/2026', 'DD/MM/AAAA'
        ], formattedDate);
      }

      // 7. Local / Cidade
      if (local) {
        xml = replaceText(xml, [
          '{{LOCAL}}', '{{CIDADE}}', '[LOCAL]', '[CIDADE]',
          'Mossoró', 'mossoro'
        ], local);
      }

      // 8. Empresa
      if (empresa) {
        xml = replaceText(xml, [
          '{{EMPRESA}}', '{{RAZAO_SOCIAL}}', '[EMPRESA]', '[RAZAO_SOCIAL]',
          'Ecoclinic', 'ecoclinic'
        ], empresa);
      }

      // 9. Instrutor (Nome, Cargo, Registro)
      if (instrutorNome) {
        xml = replaceText(xml, [
          '{{INSTRUTOR}}', '{{NOME_INSTRUTOR}}', '[INSTRUTOR]',
          'Adeylton da Silva Araújo', 'Adeylton'
        ], instrutorNome);
      }
      if (instrutorCargo) {
        xml = replaceText(xml, [
          '{{CARGO_INSTRUTOR}}', '[CARGO_INSTRUTOR]',
          'Técnico em Segurança do Trabalho'
        ], instrutorCargo);
      }
      if (instrutorRegistro) {
        xml = replaceText(xml, [
          '{{REGISTRO_INSTRUTOR}}', '[REGISTRO_INSTRUTOR]',
          'SRTE N° 0009823/RN'
        ], instrutorRegistro);
      }

      // 10. Conteúdo Programático (suporte a coluna única e 2 colunas para Modelo 2)
      if (conteudo) {
        xml = replaceText(xml, ['{{CONTEUDO}}', '[CONTEUDO]'], conteudo);

        // Divisão balanceada para o Modelo 2 (2 colunas)
        const contentLines = conteudo.split('\n').filter(l => l.trim().length > 0);
        const midPoint = Math.ceil(contentLines.length / 2);
        const col1Text = contentLines.slice(0, midPoint).join('\n');
        const col2Text = contentLines.slice(midPoint).join('\n');

        xml = replaceText(xml, ['{{CONTEUDO_COL1}}', '[CONTEUDO_COL1]'], col1Text || conteudo);
        xml = replaceText(xml, ['{{CONTEUDO_COL2}}', '[CONTEUDO_COL2]'], col2Text || '');
      }

      // 11. Validade do Certificado
      if (validade) {
        xml = replaceText(xml, [
          '{{VALIDADE}}', '[VALIDADE]',
          '24 MESES', '12 MESES', '24 meses', '12 meses'
        ], validade);
      }

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      if (template.relsXml) {
        newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(template.relsXml));
      }
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }
  }

  // Atualizar presentation.xml
  let presentationXml = await newZip.file('ppt/presentation.xml').async('string');
  const newSlideListXml = slideList.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
  presentationXml = presentationXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSlideListXml}</p:sldIdLst>`);
  newZip.file('ppt/presentation.xml', presentationXml);

  // Atualizar presentation.xml.rels
  let presRels = await newZip.file('ppt/_rels/presentation.xml.rels').async('string');
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  const newSlideRels = slideList.map(s =>
    `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.slideNum}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
  newZip.file('ppt/_rels/presentation.xml.rels', presRels);

  // Atualizar [Content_Types].xml
  let contentTypes = await newZip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  const newOverrides = slideList.map(s =>
    `<Override PartName="/ppt/slides/slide${s.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  newZip.file('[Content_Types].xml', contentTypes);

  // Helper para converter base64 DataURL para ArrayBuffer
  const dataUrlToArrayBuffer = (dataUrl) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    try {
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      console.warn('Erro ao converter dataUrl para buffer:', e);
      return null;
    }
  };

  // Helper para obter buffer de assinatura (manual ou oficial)
  const getSignatureBuffer = async (manualEntry, fallbackUrl) => {
    if (manualEntry?.dataUrl) {
      const buf = dataUrlToArrayBuffer(manualEntry.dataUrl);
      if (buf) return buf;
    }
    if (fallbackUrl) {
      try {
        const res = await fetch(fallbackUrl);
        if (res.ok) return await res.arrayBuffer();
      } catch {
        // Ignora
      }
    }
    return null;
  };

  // 1. Assinatura do(s) Instrutor(es) (Manual ou Oficial, com suporte a múltiplos instrutores)
  const instrutorFallback = instrutorNome ? getInstructorSignatureUrl(instrutorNome) : null;
  let activeInstructorSig = turmaSignatures?.instructor || turmaSignatures?.instructor_0;

  // Se houver mais de um instrutor com assinatura desenhada, mescla as imagens lado a lado
  if (turmaSignatures?.instructor_1?.dataUrl && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const primaryUrl = activeInstructorSig?.dataUrl || instrutorFallback;
      const secondaryUrl = turmaSignatures.instructor_1.dataUrl;

      if (primaryUrl && secondaryUrl) {
        const img1 = new Image();
        const img2 = new Image();
        await Promise.all([
          new Promise(r => { img1.onload = r; img1.onerror = r; img1.src = primaryUrl; }),
          new Promise(r => { img2.onload = r; img2.onerror = r; img2.src = secondaryUrl; })
        ]);

        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = 640;
        mergedCanvas.height = 160;
        const mCtx = mergedCanvas.getContext('2d');
        mCtx.drawImage(img1, 10, 10, 290, 140);
        mCtx.drawImage(img2, 330, 10, 290, 140);

        activeInstructorSig = {
          dataUrl: mergedCanvas.toDataURL('image/png'),
          signerName: `${activeInstructorSig?.signerName || ''} & ${turmaSignatures.instructor_1.signerName || ''}`
        };
      }
    } catch (e) {
      console.warn('Falha ao compor assinaturas de múltiplos instrutores:', e);
    }
  }

  const instrutorBuffer = await getSignatureBuffer(activeInstructorSig, instrutorFallback);
  if (instrutorBuffer) {
    if (certModel === 'modelo1') {
      newZip.file('ppt/media/image4.png', instrutorBuffer);
    } else {
      newZip.file('ppt/media/image5.png', instrutorBuffer);
    }
  }

  // 2. Assinatura do Responsável Técnico (Eider Gomes / Raimundo Fernandes)
  const techLeadFallback = certModel === 'modelo1' 
    ? '/certificate-templates/signatures/sig_eider_gomes.png' 
    : '/certificate-templates/signatures/sig_raimundo_fernandes.png';
  const techLeadBuffer = await getSignatureBuffer(turmaSignatures?.tech_lead, techLeadFallback);
  if (techLeadBuffer) {
    if (certModel === 'modelo1') {
      newZip.file('ppt/media/image3.png', techLeadBuffer);
    } else {
      newZip.file('ppt/media/image2.png', techLeadBuffer);
    }
  }

  // 3. Assinatura da Coordenação / 2º Responsável (Modelo 2)
  if (certModel === 'modelo2' && turmaSignatures?.coordinator?.dataUrl) {
    const coordBuffer = await getSignatureBuffer(turmaSignatures.coordinator, null);
    if (coordBuffer) {
      newZip.file('ppt/media/image3.png', coordBuffer);
    }
  }

  // Gerar o blob do arquivo final
  const blob = await newZip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  return blob;
}
