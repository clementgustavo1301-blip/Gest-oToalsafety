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
  colaboradores
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

  // Injetar a assinatura oficial correspondente ao instrutor selecionado
  if (instrutorNome) {
    try {
      const sigUrl = getInstructorSignatureUrl(instrutorNome);
      const sigRes = await fetch(sigUrl);
      if (sigRes.ok) {
        const sigBuffer = await sigRes.arrayBuffer();
        if (certModel === 'modelo1') {
          newZip.file('ppt/media/image4.png', sigBuffer);
        } else {
          newZip.file('ppt/media/image5.png', sigBuffer);
        }
      }
    } catch {
      // Mantém a assinatura padrão do arquivo base
    }
  }

  // Gerar o blob do arquivo final
  const blob = await newZip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  return blob;
}
