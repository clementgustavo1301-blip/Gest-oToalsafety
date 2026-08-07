const fs = require('fs');
const JSZip = require('jszip');

async function testGenerate() {
  const data = fs.readFileSync('public/template-certificado.pptx');
  const templateZip = await JSZip.loadAsync(data);
  
  const templates = {};
  const templateRels = {};
  const slideNums = { cert: 1, list: 2 };
  
  for (const [key, num] of Object.entries(slideNums)) {
    templates[key] = await templateZip.file(`ppt/slides/slide${num}.xml`).async('string');
    const relsFile = templateZip.file(`ppt/slides/_rels/slide${num}.xml.rels`);
    if (relsFile) templateRels[key] = await relsFile.async('string');
  }
  
  const newZip = await JSZip.loadAsync(await templateZip.generateAsync({ type: 'arraybuffer' }));
  
  const allFiles = Object.keys(newZip.files);
  allFiles.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\//.test(f)).forEach(f => newZip.remove(f));
  
  function buildRels(originalRels) {
    if (!originalRels) return '';
    return originalRels.replace(/<Relationship[^>]*notesSlide[^>]*\/>/g, '');
  }
  
  const colab = { nome: 'João da Silva Santos', cpf: '123.456.789-00' };
  const formattedDate = '07/08/2026';
  const local = 'Canteiro De Obras';
  const empresa = 'Empresa Teste LTDA';
  const nr = 'NR - 06';
  const descricao = 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06';
  const duracao = '1 hora';
  const instrutorNome = 'Adeylton da Silva Araújo';
  const instrutorCargo = 'Técnico em Segurança do Trabalho';
  const instrutorRegistro = 'SRTE N° 0009823/RN';
  const conteudo = "Linha 1\nLinha 2\nLinha 3\nLinha 4\nLinha 5\nLinha 6";
  
  let slideCounter = 1;
  const slideList = [];
  let nextSlideId = 400;
  let nextRId = 100;
  
  // CERT 
  {
    let xml = templates.cert;
    xml = xml.replaceAll('>Gustavo <', `>${colab.nome}<`);
    xml = xml.replaceAll('>Sobre <', `>${descricao}<`);
    xml = xml.replaceAll('>07/08/2026<', `>${formattedDate}<`);
    xml = xml.replaceAll('>Mossoró<', `>${local}<`);
    xml = xml.replaceAll('>Ecoclinic<', `>${empresa}<`);
    xml = xml.replaceAll('>11415174423<', `>${colab.cpf}<`);
    xml = xml.replaceAll('>Nome do Instrutor<', `>${instrutorNome}<`);
    
    const sNum = slideCounter++;
    newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
    if(templateRels.cert) newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert));
    slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
  }
  
  // LIST 
  {
    let xml = templates.list;
    xml = xml.replaceAll('>Adeylton<', `>${instrutorNome.split(' ')[0]}<`);
    xml = xml.replaceAll('> da Silva <', `> ${instrutorNome.split(' ').slice(1, -1).join(' ')} <`);
    xml = xml.replaceAll('>Araújo<', `>${instrutorNome.split(' ').slice(-1)[0]}<`);
    xml = xml.replaceAll('>Técnico em Segurança do Trabalho<', `>${instrutorCargo}<`);
    xml = xml.replaceAll('>SRTE N° 0009823/RN<', `>${instrutorRegistro}<`);
    xml = xml.replaceAll('>Treinamento de NR - 06<', `>Treinamento de ${nr}<`);
    xml = xml.replaceAll('>Ecoclinic<', `>${empresa}<`);
    xml = xml.replaceAll('>Mossoró<', `>${local}<`);
    xml = xml.replace('>07<', `>${formattedDate.substring(0, 2)}<`);
    xml = xml.replace('>/08/2026<', `>${formattedDate.substring(2)}<`);
    xml = xml.replaceAll('>1 hora<', `>${duracao}<`);
    xml = xml.replaceAll('>Gustavo <', `>${colab.nome}<`);
    xml = xml.replaceAll('>11415174423<', `>${colab.cpf}<`);
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
  
  let presentationXml = await newZip.file('ppt/presentation.xml').async('string');
  const newSlideListXml = slideList.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
  presentationXml = presentationXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSlideListXml}</p:sldIdLst>`);
  newZip.file('ppt/presentation.xml', presentationXml);
  
  let presRels = await newZip.file('ppt/_rels/presentation.xml.rels').async('string');
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  const newSlideRels = slideList.map(s =>
    `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.slideNum}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
  newZip.file('ppt/_rels/presentation.xml.rels', presRels);
  
  let contentTypes = await newZip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  const newOverrides = slideList.map(s =>
    `<Override PartName="/ppt/slides/slide${s.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  newZip.file('[Content_Types].xml', contentTypes);
  
  const buffer = await newZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('test_output.pptx', buffer);
  console.log('Generated test_output.pptx with ' + slideList.length + ' slides');
}

testGenerate().catch(console.error);
