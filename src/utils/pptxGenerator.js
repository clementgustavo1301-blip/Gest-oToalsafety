import JSZip from 'jszip';

/**
 * Gera um PPTX a partir do template original.
 * Abordagem: mantém os 4 slides modelo (2,6,3,4) intactos com suas imagens/layout,
 * clona-os para cada colaborador com texto substituído.
 * 
 * Padrão por colaborador (4 slides):
 *   slide2 = Certificado frente (sem assinatura técnico, com imagem de assinatura do participante)
 *   slide6 = Certificado verso (com assinatura técnico + participante, com imagem de assinatura)
 *   slide3 = Lista de presença frente (com background de lista)
 *   slide4 = Lista de presença verso (com background de lista)
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

  // 3. Read the 4 template slide XMLs
  const templates = {};
  const templateRels = {};
  const slideNums = { cert_front: 2, cert_back: 6, list_front: 3, list_back: 4 };
  
  for (const [key, num] of Object.entries(slideNums)) {
    templates[key] = await templateZip.file(`ppt/slides/slide${num}.xml`).async('string');
    const relsFile = templateZip.file(`ppt/slides/_rels/slide${num}.xml.rels`);
    if (relsFile) templateRels[key] = await relsFile.async('string');
  }

  // 4. Remove ALL existing slides from the new zip
  const allFiles = Object.keys(newZip.files);
  
  // Remove slide XMLs
  allFiles.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).forEach(f => newZip.remove(f));
  // Remove slide rels
  allFiles.filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)).forEach(f => newZip.remove(f));
  // Remove notes
  allFiles.filter(f => /^ppt\/notesSlides\//.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\/_rels\//.test(f)).forEach(f => newZip.remove(f));

  // 5. Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'DD/MM/AAAA';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };
  const formattedDate = formatDate(data);

  // 6. For each collaborator, create 4 slides
  let slideCounter = 1;
  const slideList = []; // { slideNum, id, rId }
  let nextSlideId = 400;
  let nextRId = 100;

  // Helper: build rels XML for a slide (without notes reference)
  function buildRels(originalRels) {
    // Remove notesSlide relationships, keep everything else
    return originalRels.replace(/<Relationship[^>]*notesSlide[^>]*\/>/g, '');
  }

  for (const colab of colaboradores) {
    if (!colab.nome.trim()) continue;

    // === CERT FRONT (slide2 template) ===
    {
      let xml = templates.cert_front;
      // Replace texts - use exact matches from the template
      xml = xml.replaceAll('>Douglas Ramos Da silva<', `>${colab.nome}<`);
      xml = xml.replaceAll('>Douglas Ramos Da Silva<', `>${colab.nome}<`);
      xml = xml.replaceAll('>702. 135.874-16<', `>${colab.cpf}<`);
      xml = xml.replaceAll('>30/07/2026<', `>${formattedDate}<`);
      xml = xml.replaceAll('>Canteiro De Obras<', `>${local}<`);
      xml = xml.replaceAll('>MVP Engenharia E Construção LTDA<', `>${empresa}<`);
      // Descrição do treinamento (split across 2 text nodes)
      xml = xml.replaceAll('>Sobre uso e guarda de EPI conforme exigências da <', `>${descricao.split('Norma')[0] || descricao}<`);
      xml = xml.replaceAll('>Norma Regulamentadora - NR 06<', `>${descricao.includes('Norma') ? 'Norma' + descricao.split('Norma')[1] : ''}<`);
      // CPF field
      xml = xml.replaceAll('>CPF:<', '>CPF:<');

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert_front));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }

    // === CERT BACK (slide6 template) ===
    {
      let xml = templates.cert_back;
      // The name in slide6 is split: "Henrique ", "Trajano", " Da Silva Neto"
      // We need to replace ALL text nodes that form the name
      // Strategy: replace each known text fragment
      xml = xml.replaceAll('>Henrique <', `>${colab.nome} <`);
      xml = xml.replaceAll('>Trajano<', `><`);
      xml = xml.replaceAll('> Da Silva Neto<', `><`);
      xml = xml.replaceAll('> Da <', `> <`);
      xml = xml.replaceAll('>sIlva<', `><`);
      xml = xml.replaceAll('> Neto<', `><`);
      xml = xml.replaceAll('> 133.016.124-66<', `>${colab.cpf}<`);
      xml = xml.replaceAll('>CPF: <', '>CPF: <');
      xml = xml.replaceAll('>30/07/2026<', `>${formattedDate}<`);
      xml = xml.replaceAll('>Canteiro De Obras<', `>${local}<`);
      xml = xml.replaceAll('>M A Construções E Serviços LTDA<', `>${empresa}<`);
      xml = xml.replaceAll('>Sobre uso e guarda de EPI conforme exigências da <', `>${descricao.split('Norma')[0] || descricao}<`);
      xml = xml.replaceAll('>Norma Regulamentadora - NR 06<', `>${descricao.includes('Norma') ? 'Norma' + descricao.split('Norma')[1] : ''}<`);

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert_back));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }

    // === LIST FRONT (slide3 template) ===
    {
      let xml = templates.list_front;
      // Instructor name (split: "Adeylton", " da Silva ", "Araújo")
      xml = xml.replaceAll('>Adeylton<', `>${instrutorNome.split(' ')[0]}<`);
      xml = xml.replaceAll('> da Silva <', `> ${instrutorNome.split(' ').length > 2 ? instrutorNome.split(' ').slice(1, -1).join(' ') : ''} <`);
      xml = xml.replaceAll('>Araújo<', `>${instrutorNome.split(' ').slice(-1)[0]}<`);
      // Instructor title (split: "Técnico", " ", "em", " ", "Segurança", " do ", "Trabalho")
      xml = xml.replaceAll('>Técnico<', `>${instrutorCargo}<`);
      xml = xml.replaceAll('>em<', `><`);
      xml = xml.replaceAll('>Segurança<', `><`);
      xml = xml.replaceAll('> do <', `> <`);
      xml = xml.replaceAll('>Trabalho<', `><`);
      xml = xml.replaceAll('>SRTE N° 0009823/RN<', `>${instrutorRegistro}<`);
      // Training title
      xml = xml.replaceAll('>Treinamento de NR - 06<', `>Treinamento de ${nr}<`);
      // Company, Local, Date, Duration
      xml = xml.replaceAll('>MVP Engenharia E Construção LTDA<', `>${empresa}<`);
      xml = xml.replaceAll('>Canteiro De Obras<', `>${local}<`);
      // Date is split: "30" and "/07/2026"
      xml = xml.replace('>30<', `>${formattedDate.substring(0, 2)}<`);
      xml = xml.replace('>/07/2026<', `>${formattedDate.substring(2)}<`);
      xml = xml.replaceAll('>1 hora<', `>${duracao}<`);
      // Collaborator
      xml = xml.replaceAll('>Douglas Ramos Da Silva<', `>${colab.nome}<`);
      xml = xml.replaceAll('>702. 135.874-16<', `>${colab.cpf}<`);
      // Conteúdo programático
      const conteudoLines = conteudo.split('\n');
      const defaultLines = [
        'a) descrição do equipamento e seus componentes;',
        'b) risco ocupacional contra o qual o EPI oferece proteção;',
        'c) restrições e limitações de proteção;',
        'd) forma adequada de uso e ajuste;',
        'e) manutenção e substituição; e',
        'f) cuidados de limpeza, higienização, guarda e conservação.'
      ];
      for (let idx = 0; idx < defaultLines.length; idx++) {
        xml = xml.replace(`>${defaultLines[idx]}<`, `>${conteudoLines[idx] || ''}<`);
      }

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.list_front));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }

    // === LIST BACK (slide4 template) ===
    {
      let xml = templates.list_back;
      // Same replacements as list_front
      xml = xml.replaceAll('>Adeylton<', `>${instrutorNome.split(' ')[0]}<`);
      xml = xml.replaceAll('> da Silva <', `> ${instrutorNome.split(' ').length > 2 ? instrutorNome.split(' ').slice(1, -1).join(' ') : ''} <`);
      xml = xml.replaceAll('>Araújo<', `>${instrutorNome.split(' ').slice(-1)[0]}<`);
      xml = xml.replaceAll('>Técnico<', `>${instrutorCargo}<`);
      xml = xml.replaceAll('>em<', `><`);
      xml = xml.replaceAll('>Segurança<', `><`);
      xml = xml.replaceAll('> do <', `> <`);
      xml = xml.replaceAll('>Trabalho<', `><`);
      xml = xml.replaceAll('>SRTE N° 0009823/RN<', `>${instrutorRegistro}<`);
      xml = xml.replaceAll('>Treinamento de NR - 06<', `>Treinamento de ${nr}<`);
      xml = xml.replaceAll('>MVP Engenharia E Construção LTDA<', `>${empresa}<`);
      xml = xml.replaceAll('>Canteiro  De Obras<', `>${local}<`);
      xml = xml.replace('>30<', `>${formattedDate.substring(0, 2)}<`);
      xml = xml.replace('>/07/2026<', `>${formattedDate.substring(2)}<`);
      xml = xml.replaceAll('>1 hora<', `>${duracao}<`);
      xml = xml.replaceAll('>Douglas Ramos Da Silva<', `>${colab.nome}<`);
      xml = xml.replaceAll('>1702. 135.874-16<', `>${colab.cpf}<`);
      const conteudoLines = conteudo.split('\n');
      const defaultLines = [
        'a) descrição do equipamento e seus componentes;',
        'b) risco ocupacional contra o qual o EPI oferece proteção;',
        'c) restrições e limitações de proteção;',
        'd) forma adequada de uso e ajuste;',
        'e) manutenção e substituição; e',
        'f) cuidados de limpeza, higienização, guarda e conservação.'
      ];
      for (let idx = 0; idx < defaultLines.length; idx++) {
        xml = xml.replace(`>${defaultLines[idx]}<`, `>${conteudoLines[idx] || ''}<`);
      }

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.list_back));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }
  }

  // 7. Update presentation.xml
  let presentationXml = await newZip.file('ppt/presentation.xml').async('string');
  const newSlideListXml = slideList.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
  presentationXml = presentationXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSlideListXml}</p:sldIdLst>`);
  newZip.file('ppt/presentation.xml', presentationXml);

  // 8. Update presentation.xml.rels
  let presRels = await newZip.file('ppt/_rels/presentation.xml.rels').async('string');
  // Remove ALL old slide relationships (but NOT slideMaster, theme, etc)
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  // Add new slide relationships
  const newSlideRels = slideList.map(s =>
    `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.slideNum}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
  newZip.file('ppt/_rels/presentation.xml.rels', presRels);

  // 9. Update [Content_Types].xml
  let contentTypes = await newZip.file('[Content_Types].xml').async('string');
  // Remove old slide overrides
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  // Remove old notes overrides
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  // Add new slide overrides
  const newOverrides = slideList.map(s =>
    `<Override PartName="/ppt/slides/slide${s.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  newZip.file('[Content_Types].xml', contentTypes);

  // 10. Generate
  const blob = await newZip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  return blob;
}
