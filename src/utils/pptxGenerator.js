import JSZip from 'jszip';

/**
 * Gera um PPTX a partir do template 'modelo final.pptx'.
 * Abordagem: mantém os 2 slides modelo intactos com suas imagens/layout,
 * clona-os para cada colaborador com texto substituído.
 * 
 * Padrão por colaborador (2 slides):
 *   slide1 = Certificado
 *   slide2 = Lista de presença
 */

export async function generateCertificatePPTX({
  nr,
  descricao,
  data,
  local,
  empresa,
  duracao,
  instrutorNome,
  instrutorCargo,
  instrutorRegistro,
  conteudo,
  colaboradores
}) {
  // 1. Fetch template
  const response = await fetch('/template-certificado.pptx');
  const templateBuffer = await response.arrayBuffer();
  const templateZip = await JSZip.loadAsync(templateBuffer);

  // 2. Create a fresh PPTX by copying the template entirely
  const newZip = await JSZip.loadAsync(await templateZip.generateAsync({ type: 'arraybuffer' }));

  // 3. Read the 2 template slide XMLs
  const templates = {};
  const templateRels = {};
  const slideNums = { cert: 1, list: 2 };
  
  for (const [key, num] of Object.entries(slideNums)) {
    templates[key] = await templateZip.file(`ppt/slides/slide${num}.xml`).async('string');
    const relsFile = templateZip.file(`ppt/slides/_rels/slide${num}.xml.rels`);
    if (relsFile) templateRels[key] = await relsFile.async('string');
  }

  // 4. Remove ALL existing slides from the new zip
  const allFiles = Object.keys(newZip.files);
  
  allFiles.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\//.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\/_rels\//.test(f)).forEach(f => newZip.remove(f));

  // 5. Format date and CPF
  const formatDate = (dateStr) => {
    if (!dateStr) return 'DD/MM/AAAA';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };
  const formattedDate = formatDate(data);

  const formatCPF = (cpfStr) => {
    if (!cpfStr) return '';
    const digits = cpfStr.replace(/\D/g, '');
    if (digits.length !== 11) return cpfStr;
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Helper to escape XML special characters
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

  // 6. Helper for bulletproof text replacement in OpenXML
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

  // 7. For each collaborator, create 2 slides
  let slideCounter = 1;
  const slideList = [];
  let nextSlideId = 400;
  let nextRId = 100;

  function buildRels(originalRels) {
    if (!originalRels) return '';
    return originalRels.replace(/<Relationship[^>]*notesSlide[^>]*\/>/g, '');
  }

  for (const colab of colaboradores) {
    if (!colab.nome.trim()) continue;

    // === CERTIFICADO (slide1 template) ===
    {
      let xml = templates.cert;

      // Nome do colaborador
      xml = replaceText(xml, ['Gustavo Clement Onraed Vieira', 'Gustavo'], colab.nome);

      // Descrição do treinamento
      xml = replaceText(xml, ['Sobre uso e guarda de EPI conzxzxzxforme exigências da Norma Regulamentadora - NR 06', 'Sobre'], descricao);

      // Data
      xml = replaceText(xml, ['07/08/2026', '09/08/2026'], formattedDate);

      // Local
      xml = replaceText(xml, ['Mossoró', 'mossoro'], local);

      // Empresa
      xml = replaceText(xml, ['Ecoclinic', 'ecoclinic'], empresa);

      // CPF (formatado)
      xml = replaceText(xml, ['114.151.744-23', '11415174423'], formatCPF(colab.cpf));

      // Instrutor Box no Slide 1 (Nome, Cargo e Registro)
      const safeNome = escapeXml(instrutorNome);
      const safeCargo = escapeXml(instrutorCargo);
      const safeRegistro = escapeXml(instrutorRegistro);

      let replacement = `${safeNome}</a:t></a:r></a:p>`;
      if (safeCargo) {
        replacement += `<a:p><a:pPr lvl="0" algn="ctr"><a:lnSpc><a:spcPct val="120000"/></a:lnSpc></a:pPr><a:r><a:rPr lang="pt-BR" sz="2400" b="1"><a:solidFill><a:srgbClr val="00B050"/></a:solidFill><a:latin typeface="Montserrat"/><a:cs typeface="Montserrat"/></a:rPr><a:t>${safeCargo}</a:t></a:r></a:p>`;
      }
      if (safeRegistro) {
        replacement += `<a:p><a:pPr lvl="0" algn="ctr"><a:lnSpc><a:spcPct val="120000"/></a:lnSpc></a:pPr><a:r><a:rPr lang="pt-BR" sz="2400"><a:solidFill><a:srgbClr val="494949"/></a:solidFill><a:latin typeface="Montserrat"/><a:cs typeface="Montserrat"/></a:rPr><a:t>${safeRegistro}</a:t></a:r></a:p>`;
      }
      replacement += `<a:p><a:r><a:t>`;

      xml = replaceText(xml, ['Adeylton da Silva Araújo', 'Nome do Instrutor'], instrutorNome);
      if (safeNome) {
        xml = xml.replace('>' + safeNome + '<', '>' + replacement + '<');
      }

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      if (templateRels.cert) newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }

    // === LISTA DE PRESENÇA (slide2 template) ===
    {
      let xml = templates.list;

      // Instrutor (partes do nome no template original)
      const nameParts = (instrutorNome || '').split(' ');
      const firstName = nameParts[0] || '';
      const middleName = nameParts.length > 2 ? ' ' + nameParts.slice(1, -1).join(' ') + ' ' : nameParts.length === 2 ? ' ' : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
      xml = replaceText(xml, ['Adeylton'], firstName);
      xml = replaceText(xml, ['da Silva'], middleName);
      xml = replaceText(xml, ['Araújo'], lastName);

      xml = replaceText(xml, ['Técnico em Segurança do Trabalho'], instrutorCargo);
      xml = replaceText(xml, ['SRTE N° 0009823/RN'], instrutorRegistro);

      // Treinamento NR
      xml = replaceText(xml, ['Treinamento de NR - 06', 'Treinamento de NR-06'], `Treinamento de ${nr}`);

      // Empresa
      xml = replaceText(xml, ['Ecoclinic', 'ecoclinic'], empresa);

      // Local
      xml = replaceText(xml, ['Mossoró', 'mossoro'], local);

      // Data
      xml = replaceText(xml, ['07/08/2026', '09/08/2026'], formattedDate);
      xml = replaceText(xml, ['07'], formattedDate);
      xml = replaceText(xml, ['/08/2026'], '');

      // Duração
      xml = replaceText(xml, ['1 hora'], duracao);

      // Nome do colaborador
      xml = replaceText(xml, ['Gustavo Clement Onraed Vieira', 'Gustavo'], colab.nome);

      // CPF (formatado)
      xml = replaceText(xml, ['114.151.744-23', '11415174423'], formatCPF(colab.cpf));

      // Conteúdo programático dinâmico (TextBox 8)
      if (conteudo) {
        const lines = conteudo.split('\n').map(l => l.trim()).filter(Boolean);
        const parasXml = lines.map(line => {
          return `<a:p><a:r><a:rPr lang="pt-BR" altLang="ko-KR" sz="3200" b="1" dirty="0"><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${escapeXml(line)}</a:t></a:r></a:p>`;
        }).join('');
        const txBody = `<p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="ctr"><a:spAutoFit/></a:bodyPr><a:lstStyle/>${parasXml}</p:txBody>`;
        const textbox8Regex = /(<p:sp>[^]*?<p:cNvPr[^>]*name="TextBox 8"[^]*?)(<p:txBody>[\s\S]*?<\/p:txBody>)/;
        xml = xml.replace(textbox8Regex, `$1${txBody}`);
      }

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      if (templateRels.list) newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.list));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }
  }

  // 8. Update presentation.xml
  let presentationXml = await newZip.file('ppt/presentation.xml').async('string');
  const newSlideListXml = slideList.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
  presentationXml = presentationXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSlideListXml}</p:sldIdLst>`);
  newZip.file('ppt/presentation.xml', presentationXml);

  // 9. Update presentation.xml.rels
  let presRels = await newZip.file('ppt/_rels/presentation.xml.rels').async('string');
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  const newSlideRels = slideList.map(s =>
    `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.slideNum}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
  newZip.file('ppt/_rels/presentation.xml.rels', presRels);

  // 10. Update [Content_Types].xml
  let contentTypes = await newZip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  const newOverrides = slideList.map(s =>
    `<Override PartName="/ppt/slides/slide${s.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  newZip.file('[Content_Types].xml', contentTypes);

  // 11. Generate
  const blob = await newZip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  return blob;
}

