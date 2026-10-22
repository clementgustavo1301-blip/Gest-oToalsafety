import JSZip from 'jszip';
import { getInstructorSignatureUrl } from '../data/officialTrainingModels.js';

/**
 * Utilitário de geração de certificados PPTX para o setor de Treinamento.
 * Clona os slides do modelo (.pptx) para cada participante,
 * substituindo tags e variáveis inteligentes.
 */

/**
 * Divide o conteúdo programático em 2 colunas equilibradas pelo peso visual das linhas,
 * evitando que uma coluna fique muito maior que a outra ou corte no slide.
 */
export function normalizeSyllabusContent(rawText = '') {
  const sourceLines = String(rawText)
    .split(/\r?\n/)
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const normalized = [];

  for (let index = 0; index < sourceLines.length; index += 1) {
    let line = sourceLines[index];

    if (/^(?:\d{1,3}[.)]|[a-z][.)}]?)$/i.test(line) && sourceLines[index + 1]) {
      line = `${line} ${sourceLines[index + 1]}`;
      index += 1;
    }

    const previous = normalized[normalized.length - 1];
    const startsNewTopic = /^(?:\d{1,3}[.)]|[a-z][.)}])(?:\s|$)/i.test(line);
    if (previous && !startsNewTopic && !/[.;:!?]$/.test(previous)) {
      normalized[normalized.length - 1] = `${previous} ${line}`;
    } else {
      normalized.push(line);
    }
  }

  return normalized.join('\n');
}

export function balanceSyllabusColumns(rawText, maxCharsPerLine = 38) {
  const normalizedText = normalizeSyllabusContent(rawText);
  if (!normalizedText) return { col1: '', col2: '', totalLines: 0, maxLinesInCol: 0, totalWeight: 0, normalizedText: '' };
  const lines = normalizedText.split('\n');
  if (lines.length <= 1) {
    return { col1: normalizedText, col2: '', totalLines: lines.length, maxLinesInCol: lines.length, totalWeight: lines.length, normalizedText };
  }

  const weights = lines.map(l => Math.max(1, Math.ceil(l.length / maxCharsPerLine)));
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);

  let bestSplit = Math.ceil(lines.length / 2);
  let minDiff = Infinity;
  let running = 0;

  for (let i = 0; i < lines.length; i++) {
    running += weights[i];
    const diff = Math.abs(running - (totalWeight - running));
    if (diff < minDiff) {
      minDiff = diff;
      bestSplit = i + 1;
    }
  }

  bestSplit = Math.max(1, Math.min(lines.length - 1, bestSplit));

  const col1Lines = lines.slice(0, bestSplit);
  const col2Lines = lines.slice(bestSplit);

  const col1Weight = weights.slice(0, bestSplit).reduce((a, b) => a + b, 0);
  const col2Weight = weights.slice(bestSplit).reduce((a, b) => a + b, 0);
  const maxLinesInCol = Math.max(col1Weight, col2Weight);

  return {
    col1: col1Lines.join('\n'),
    col2: col2Lines.join('\n'),
    col1Count: col1Lines.length,
    col2Count: col2Lines.length,
    totalLines: lines.length,
    totalWeight,
    maxLinesInCol,
    normalizedText
  };
}

function setShapeGeometry(shapeXml, { id, name, x, y, cx, cy }) {
  let updated = shapeXml;
  if (id !== undefined) updated = updated.replace(/(<p:cNvPr\b[^>]*\bid=")\d+("[^>]*>)/, `$1${id}$2`);
  if (name) updated = updated.replace(/(<p:cNvPr\b[^>]*\bname=")[^"]+("[^>]*>)/, `$1${name}$2`);
  if (x !== undefined) updated = updated.replace(/(<a:off\b[^>]*\bx=")\d+("\s+y=")\d+("\s*\/>)/, `$1${x}$2${y}$3`);
  if (cx !== undefined) updated = updated.replace(/(<a:ext\b[^>]*\bcx=")\d+("\s+cy=")\d+("\s*\/>)/, `$1${cx}$2${cy}$3`);
  return updated;
}

function applyBackTextSize(xml, shapeNames, fontSize) {
  const targets = new Set(shapeNames);
  return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, shapeXml => {
    const shapeName = shapeXml.match(/<p:cNvPr\b[^>]*\bname="([^"]+)"/)?.[1];
    if (!targets.has(shapeName)) return shapeXml;
    return shapeXml.replace(/\bsz="\d+"/g, `sz="${fontSize}"`);
  });
}

function applyOfficialBackLayout(xml, certModel, balanced) {
  if (certModel === 'modelo1' && balanced.totalWeight > 24) {
    const originalShape = (xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) || [])
      .find(shapeXml => /<p:cNvPr\b[^>]*\bname="TextBox 3"/.test(shapeXml));
    if (!originalShape || !originalShape.includes('{{CONTEUDO}}')) return xml;

    const leftX = 1097280;
    const topY = 1450000;
    const gap = 300000;
    const fullWidth = 8494776;
    const columnWidth = Math.floor((fullWidth - gap) / 2);
    const height = 4700000;
    const maxShapeId = Math.max(0, ...[...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map(match => Number(match[1])));
    const fontSize = balanced.maxLinesInCol > 38 ? 600 : balanced.maxLinesInCol > 30 ? 680 : balanced.maxLinesInCol > 23 ? 760 : 840;

    let leftShape = setShapeGeometry(originalShape, {
      name: 'Conteudo Coluna 1', x: leftX, y: topY, cx: columnWidth, cy: height
    }).replace('{{CONTEUDO}}', '{{CONTEUDO_COL1}}');
    let rightShape = setShapeGeometry(originalShape, {
      id: maxShapeId + 1,
      name: 'Conteudo Coluna 2',
      x: leftX + columnWidth + gap,
      y: topY,
      cx: columnWidth,
      cy: height
    }).replace('{{CONTEUDO}}', '{{CONTEUDO_COL2}}');
    leftShape = leftShape.replace(/\bsz="\d+"/g, `sz="${fontSize}"`);
    rightShape = rightShape.replace(/\bsz="\d+"/g, `sz="${fontSize}"`);
    return xml.replace(originalShape, leftShape + rightShape);
  }

  if (certModel === 'modelo2') {
    const fontSize = balanced.maxLinesInCol > 42 ? 560
      : balanced.maxLinesInCol > 34 ? 620
        : balanced.maxLinesInCol > 27 ? 680
          : balanced.maxLinesInCol > 20 ? 760
            : 880;
    return applyBackTextSize(xml, ['Conteudo Coluna 1', 'Conteudo Coluna 2'], fontSize);
  }

  return xml;
}

/**
 * Define a área útil do conteúdo frontal nos modelos oficiais.
 * A geometria varia conforme a densidade do texto e é compartilhada pela
 * pré-visualização e pelo arquivo exportado para manter os dois alinhados.
 */
export function getCertificateFrontGeometry({
  certModel = 'modelo2',
  description = '',
  course = '',
  studentName = ''
} = {}) {
  const visualWeight = description.length + (course.length * 1.6) + (studentName.length * 0.8);
  const isDense = visualWeight > 410;
  const isComfortable = visualWeight < 210;

  if (certModel === 'modelo1') {
    return {
      shapeNames: ['Corpo Certificado'],
      bodyTopIn: isDense ? 1.92 : 2.08,
      bodyHeightIn: isDense ? 3.66 : 3.48,
      previewContentMaxHeight: isDense ? '70%' : '64%'
    };
  }

  return {
    shapeNames: ['Certificado Header e Corpo'],
    bodyTopIn: isDense ? 1.18 : (isComfortable ? 1.44 : 1.32),
    bodyHeightIn: isDense ? 4.3 : (isComfortable ? 3.92 : 4.08),
    previewContentMaxHeight: isDense ? '78%' : (isComfortable ? '70%' : '74%')
  };
}

const EMU_PER_INCH = 914400;

function applyOfficialFrontGeometry(xml, geometry) {
  if (!geometry?.shapeNames?.length) return xml;
  const targetNames = new Set(geometry.shapeNames);

  return xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (shapeXml) => {
    const shapeName = shapeXml.match(/<p:cNvPr\b[^>]*\bname="([^"]+)"/)?.[1];
    if (!targetNames.has(shapeName)) return shapeXml;

    const y = Math.round(geometry.bodyTopIn * EMU_PER_INCH);
    const cy = Math.round(geometry.bodyHeightIn * EMU_PER_INCH);
    let updated = shapeXml
      .replace(/(<a:off\b[^>]*\bx="\d+"\s+y=")\d+("\s*\/>)/, `$1${y}$2`)
      .replace(/(<a:ext\b[^>]*\bcx="\d+"\s+cy=")\d+("\s*\/>)/, `$1${cy}$2`);

    updated = updated.replace(/<a:bodyPr\b([^>]*?)(\/)?>/, (bodyPr, rawAttrs = '', selfClosing = '') => {
      const attrsWithoutAnchor = rawAttrs.replace(/\sanchor="[^"]*"/g, '');
      return `<a:bodyPr${attrsWithoutAnchor} anchor="ctr"${selfClosing || ''}>`;
    });

    return updated;
  });
}

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
  techLeadNome,
  techLeadCargo,
  techLeadRegistro,
  coordinatorNome,
  coordinatorCargo,
  coordinatorRegistro,
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
  const balancedSyllabus = balanceSyllabusColumns(conteudo, certModel === 'modelo1' ? 42 : 38);
  const normalizedSyllabus = balancedSyllabus.normalizedText || normalizeSyllabusContent(conteudo);

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

      // Alguns modelos mantêm o placeholder dentro de uma frase no mesmo <a:t>
      // (ex.: "Programa: {{CURSO}}"). Nesse caso, a busca por nó inteiro acima
      // não se aplica e a substituição literal segura completa o processamento.
      if (/^(?:\{\{[^}]+\}\}|\[[^\]]+\])$/.test(searchStr.trim())) {
        result = result.split(escapeXml(searchStr.trim())).join(safeReplace);
      }
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
    const frontGeometry = getCertificateFrontGeometry({
      certModel,
      description: descricao || '',
      course: curso || '',
      studentName: colab.nome || ''
    });

    for (let i = 0; i < templateSlides.length; i++) {
      const template = templateSlides[i];
      let xml = template.xml;

      if (i === 1 && conteudo) {
        xml = applyOfficialBackLayout(xml, certModel, balancedSyllabus);
      }

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

      // 9.1 Responsável técnico e coordenação definidos na turma
      if (techLeadNome) {
        xml = replaceText(xml, [
          '{{RESPONSAVEL_TECNICO}}', '{{NOME_RESPONSAVEL_TECNICO}}',
          'Eider Gomes do Nascimento', 'Raimundo Fernandes de Oliveira Junior'
        ], techLeadNome);
      }
      if (techLeadCargo) {
        xml = replaceText(xml, ['{{CARGO_RESPONSAVEL_TECNICO}}'], techLeadCargo);
      }
      if (techLeadRegistro) {
        xml = replaceText(xml, [
          '{{REGISTRO_RESPONSAVEL_TECNICO}}',
          'Registro: MTE0009995/RN', 'Registro CREA – 211204597-0'
        ], techLeadRegistro);
      }
      if (coordinatorNome) {
        xml = replaceText(xml, [
          '{{COORDENADOR_TECNICO}}', '{{NOME_COORDENADOR_TECNICO}}',
          'Cezar Augusto Galvão De P. Camêlo', 'Leiliana Nunes de Lima Fernandes'
        ], coordinatorNome);
      }
      if (coordinatorCargo) {
        xml = replaceText(xml, [
          '{{CARGO_COORDENADOR_TECNICO}}', 'Engenheiro Eletricista'
        ], coordinatorCargo);
      }
      if (coordinatorRegistro) {
        xml = replaceText(xml, [
          '{{REGISTRO_COORDENADOR_TECNICO}}', 'CREA-RN 211051104-4', 'Registro Coren RN 333018'
        ], coordinatorRegistro);
      }

      // 10. Conteúdo Programático (suporte a coluna única e 2 colunas balanceadas para Modelo 2)
      if (conteudo) {
        xml = replaceText(xml, ['{{CONTEUDO}}', '[CONTEUDO]'], normalizedSyllabus);

        xml = replaceText(xml, ['{{CONTEUDO_COL1}}', '[CONTEUDO_COL1]'], balancedSyllabus.col1 || normalizedSyllabus);
        xml = replaceText(xml, ['{{CONTEUDO_COL2}}', '[CONTEUDO_COL2]'], balancedSyllabus.col2 || '');
      }

      // 11. Validade do Certificado
      if (validade) {
        xml = replaceText(xml, [
          '{{VALIDADE}}', '[VALIDADE]',
          '24 MESES', '12 MESES', '24 meses', '12 meses'
        ], validade);
      }

      // 12. Ajustes dinâmicos de fonte (sz) para descrições longas no Slide 1
      if (descricao && descricao.length > 250) {
        const descSz = descricao.length > 400 ? '750' : '850';
        xml = xml.replace(/(<a:rPr[^>]*\bsz=")1050(")/g, `$1${descSz}$2`);
        xml = xml.replace(/(<a:rPr[^>]*\bsz=")1600(")/g, `$11350$2`);
        xml = xml.replace(/(<a:rPr[^>]*\bsz=")1350(")/g, `$11050$2`);
      }
      if (colab.nome && colab.nome.length > 28) {
        xml = xml.replace(/(<a:rPr[^>]*\bsz=")2200(")/g, `$11800$2`);
      }

      // 13.1 Centraliza o conjunto de conteúdo dentro da área útil da frente.
      // O ajuste é aplicado apenas às caixas nomeadas dos modelos oficiais.
      if (i === 0) {
        xml = applyOfficialFrontGeometry(xml, frontGeometry);
      }

      // 14. Ativar auto-ajuste nativo (normAutofit) no PowerPoint em todas as caixas de texto
      xml = xml.replace(/<a:bodyPr\b([^>]*?)\/>/g, (match, attrs) => {
        if (attrs.includes('normAutofit') || attrs.includes('spAutoFit')) return match;
        return `<a:bodyPr${attrs}><a:normAutofit/></a:bodyPr>`;
      });
      xml = xml.replace(/<a:bodyPr\b([^>]*?)>(?![\s\S]*?<(?:a:normAutofit|a:spAutoFit))/g, (match, attrs) => {
        return `<a:bodyPr${attrs}><a:normAutofit/>`;
      });

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
  const techLeadFallback = techLeadNome
    ? getInstructorSignatureUrl(techLeadNome)
    : (certModel === 'modelo1'
      ? '/certificate-templates/signatures/sig_eider_gomes.png'
      : '/certificate-templates/signatures/sig_raimundo_fernandes.png');
  const techLeadBuffer = await getSignatureBuffer(turmaSignatures?.tech_lead, techLeadFallback);
  if (techLeadBuffer) {
    if (certModel === 'modelo1') {
      newZip.file('ppt/media/image3.png', techLeadBuffer);
    } else {
      newZip.file('ppt/media/image2.png', techLeadBuffer);
    }
  }

  // 3. Assinatura da Coordenação / 2º Responsável (Modelo 2)
  if (certModel === 'modelo2') {
    const coordinatorFallback = coordinatorNome ? getInstructorSignatureUrl(coordinatorNome) : '/certificate-templates/signatures/sig_cezar_augusto.png';
    const coordBuffer = await getSignatureBuffer(turmaSignatures?.coordinator, coordinatorFallback);
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
