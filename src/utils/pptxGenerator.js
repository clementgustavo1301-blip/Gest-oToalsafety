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

  // 6. For each collaborator, create 2 slides
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
      
      // Nome do colaborador (aparece 2x: no topo e na assinatura)
      xml = xml.replaceAll('>Gustavo <', `>${colab.nome}<`);
      
      // Descrição do treinamento
      xml = xml.replaceAll('>Sobre <', `>${descricao}<`);
      
      // Data
      xml = xml.replaceAll('>07/08/2026<', `>${formattedDate}<`);
      
      // Local
      xml = xml.replaceAll('>Mossoró<', `>${local}<`);
      
      // Empresa
      xml = xml.replaceAll('>Ecoclinic<', `>${empresa}<`);
      
      // CPF (formatado)
      xml = xml.replaceAll('>11415174423<', `>${formatCPF(colab.cpf)}<`);
      
      // --- Alinhamento da caixa do colaborador (id=91) ---
      // Mover de y=19348444 para y=19672909 para alinhar com o instrutor
      xml = xml.replace(
        '<a:off x="6676291" y="19348444"/>',
        '<a:off x="6676291" y="19672909"/>'
      );
      
      // --- Instrutor: substituir o bloco inteiro para incluir Nome + Cargo + Registro ---
      // O bloco do instrutor contém: "Nome do Instrutor" seguido de um <a:br/> e linha vazia
      // Vamos substituir todo o conteúdo textual desse shape
      const instrOriginalBlock = [
        '<a:r><a:rPr lang="pt-BR" sz="3200" b="1" dirty="0"/><a:t>Nome do Instrutor</a:t></a:r>',
        '<a:r><a:rPr lang="en-US" sz="3200" b="1" dirty="0"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="85000"/><a:lumOff val="15000"/></a:schemeClr></a:solidFill><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:sym typeface="Montserrat"/></a:rPr><a:t/></a:r>',
        '<a:br><a:rPr lang="en-US" sz="3200" b="1" dirty="0"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="85000"/><a:lumOff val="15000"/></a:schemeClr></a:solidFill><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:sym typeface="Montserrat"/></a:rPr></a:br>',
        '<a:endParaRPr sz="3200" b="1" dirty="0"><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:endParaRPr>'
      ].join('');
      
      const instrNewBlock = [
        // Nome do instrutor (bold)
        `<a:r><a:rPr lang="pt-BR" sz="3200" b="1" dirty="0"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="85000"/><a:lumOff val="15000"/></a:schemeClr></a:solidFill><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${instrutorNome}</a:t></a:r>`,
        // Line break
        `<a:br><a:rPr lang="pt-BR" sz="2600" dirty="0"><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr></a:br>`,
        // Cargo do instrutor (normal, smaller)
        `<a:r><a:rPr lang="pt-BR" sz="2600" dirty="0"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="85000"/><a:lumOff val="15000"/></a:schemeClr></a:solidFill><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${instrutorCargo}</a:t></a:r>`,
        // Line break
        `<a:br><a:rPr lang="pt-BR" sz="2600" dirty="0"><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr></a:br>`,
        // Registro do instrutor (normal, smaller)
        `<a:r><a:rPr lang="pt-BR" sz="2600" dirty="0"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="85000"/><a:lumOff val="15000"/></a:schemeClr></a:solidFill><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:rPr><a:t>${instrutorRegistro}</a:t></a:r>`,
        `<a:endParaRPr sz="2600" dirty="0"><a:latin typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:cs typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/></a:endParaRPr>`
      ].join('');
      
      xml = xml.replace(instrOriginalBlock, instrNewBlock);

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      if(templateRels.cert) newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert));
      slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
    }

    // === LISTA DE PRESENÇA (slide2 template) ===
    {
      let xml = templates.list;
      
      // Instrutor name (split into 3 runs in template: "Adeylton", " da Silva ", "Araújo")
      // Replace all 3 parts with the full instructor name
      const nameParts = instrutorNome.split(' ');
      const firstName = nameParts[0] || '';
      const middleName = nameParts.length > 2 ? ' ' + nameParts.slice(1, -1).join(' ') + ' ' : nameParts.length === 2 ? ' ' : '';
      const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
      
      xml = xml.replaceAll('>Adeylton<', `>${firstName}<`);
      xml = xml.replaceAll('> da Silva <', `>${middleName}<`);
      xml = xml.replaceAll('>Araújo<', `>${lastName}<`);
      
      // Cargo e Registro do instrutor
      xml = xml.replaceAll('>Técnico em Segurança do Trabalho<', `>${instrutorCargo}<`);
      xml = xml.replaceAll('>SRTE N° 0009823/RN<', `>${instrutorRegistro}<`);
      
      // Treinamento NR
      xml = xml.replaceAll('>Treinamento de NR - 06<', `>Treinamento de ${nr}<`);
      
      // Empresa
      xml = xml.replaceAll('>Ecoclinic<', `>${empresa}<`);
      
      // Local
      xml = xml.replaceAll('>Mossoró<', `>${local}<`);
      
      // Data — template has date split: ">07<" and ">/08/2026<"
      // Replace with the full formatted date in one go
      const dd = formattedDate.substring(0, 2);
      const restOfDate = formattedDate.substring(2); // "/MM/YYYY"
      xml = xml.replace('>07<', `>${dd}<`);
      xml = xml.replace('>/08/2026<', `>${restOfDate}<`);
      
      // Duração
      xml = xml.replaceAll('>1 hora<', `>${duracao}<`);
      
      // Nome do colaborador
      xml = xml.replaceAll('>Gustavo <', `>${colab.nome}<`);
      
      // CPF (formatado)
      xml = xml.replaceAll('>11415174423<', `>${formatCPF(colab.cpf)}<`);

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
        if(xml.includes(`>${defaultLines[idx]}<`)) {
           xml = xml.replace(`>${defaultLines[idx]}<`, `>${conteudoLines[idx] || ''}<`);
        }
      }

      const sNum = slideCounter++;
      newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
      if(templateRels.list) newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.list));
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
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  const newSlideRels = slideList.map(s =>
    `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.slideNum}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
  newZip.file('ppt/_rels/presentation.xml.rels', presRels);

  // 9. Update [Content_Types].xml
  let contentTypes = await newZip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  const newOverrides = slideList.map(s =>
    `<Override PartName="/ppt/slides/slide${s.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  newZip.file('[Content_Types].xml', contentTypes);

  // 10. Generate
  const blob = await newZip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  return blob;
}
