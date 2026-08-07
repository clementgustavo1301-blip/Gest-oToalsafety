const fs = require('fs');
const JSZip = require('jszip');

async function testGenerate() {
  const data = fs.readFileSync('NR- 06  - MODELO.pptx');
  const templateZip = await JSZip.loadAsync(data);
  
  // Read templates
  const templates = {};
  const templateRels = {};
  const slideNums = { cert_front: 2, cert_back: 6, list_front: 3, list_back: 4 };
  
  for (const [key, num] of Object.entries(slideNums)) {
    templates[key] = await templateZip.file(`ppt/slides/slide${num}.xml`).async('string');
    const relsFile = templateZip.file(`ppt/slides/_rels/slide${num}.xml.rels`);
    if (relsFile) templateRels[key] = await relsFile.async('string');
  }
  
  // Clone zip
  const newZip = await JSZip.loadAsync(await templateZip.generateAsync({ type: 'arraybuffer' }));
  
  // Remove all existing slides
  const allFiles = Object.keys(newZip.files);
  allFiles.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)).forEach(f => newZip.remove(f));
  allFiles.filter(f => /^ppt\/notesSlides\//.test(f)).forEach(f => newZip.remove(f));
  
  function buildRels(originalRels) {
    return originalRels.replace(/<Relationship[^>]*notesSlide[^>]*\/>/g, '');
  }
  
  // Generate for 1 test collaborator
  const colab = { nome: 'João da Silva Santos', cpf: '123.456.789-00' };
  const formattedDate = '07/08/2026';
  const local = 'Canteiro De Obras';
  const empresa = 'Empresa Teste LTDA';
  const nr = 'NR - 06';
  const descricao = 'Sobre uso e guarda de EPI conforme exigências da Norma Regulamentadora - NR 06';
  const duracao = '1 hora';
  const instrutorNome = 'Adeylton da Silva Araújo';
  
  let slideCounter = 1;
  const slideList = [];
  let nextSlideId = 400;
  let nextRId = 100;
  
  // CERT FRONT
  {
    let xml = templates.cert_front;
    xml = xml.replaceAll('>Douglas Ramos Da silva<', `>${colab.nome}<`);
    xml = xml.replaceAll('>Douglas Ramos Da Silva<', `>${colab.nome}<`);
    xml = xml.replaceAll('>702. 135.874-16<', `>${colab.cpf}<`);
    xml = xml.replaceAll('>30/07/2026<', `>${formattedDate}<`);
    xml = xml.replaceAll('>Canteiro De Obras<', `>${local}<`);
    xml = xml.replaceAll('>MVP Engenharia E Construção LTDA<', `>${empresa}<`);
    xml = xml.replaceAll('>Sobre uso e guarda de EPI conforme exigências da <', `>${descricao.split('Norma')[0]}<`);
    xml = xml.replaceAll('>Norma Regulamentadora - NR 06<', `>Norma${descricao.split('Norma')[1]}<`);
    
    const sNum = slideCounter++;
    newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
    newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert_front));
    slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
  }
  
  // CERT BACK 
  {
    let xml = templates.cert_back;
    xml = xml.replaceAll('>Henrique <', `>${colab.nome} <`);
    xml = xml.replaceAll('>Trajano<', `><`);
    xml = xml.replaceAll('> Da Silva Neto<', `><`);
    xml = xml.replaceAll('> Da <', `> <`);
    xml = xml.replaceAll('>sIlva<', `><`);
    xml = xml.replaceAll('> Neto<', `><`);
    xml = xml.replaceAll('> 133.016.124-66<', `>${colab.cpf}<`);
    xml = xml.replaceAll('>30/07/2026<', `>${formattedDate}<`);
    xml = xml.replaceAll('>Canteiro De Obras<', `>${local}<`);
    xml = xml.replaceAll('>M A Construções E Serviços LTDA<', `>${empresa}<`);
    xml = xml.replaceAll('>Sobre uso e guarda de EPI conforme exigências da <', `>${descricao.split('Norma')[0]}<`);
    xml = xml.replaceAll('>Norma Regulamentadora - NR 06<', `>Norma${descricao.split('Norma')[1]}<`);
    
    const sNum = slideCounter++;
    newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
    newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.cert_back));
    slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
  }
  
  // LIST FRONT
  {
    let xml = templates.list_front;
    xml = xml.replaceAll('>Treinamento de NR - 06<', `>Treinamento de ${nr}<`);
    xml = xml.replaceAll('>MVP Engenharia E Construção LTDA<', `>${empresa}<`);
    xml = xml.replaceAll('>Canteiro De Obras<', `>${local}<`);
    xml = xml.replace('>30<', `>${formattedDate.substring(0, 2)}<`);
    xml = xml.replace('>/07/2026<', `>${formattedDate.substring(2)}<`);
    xml = xml.replaceAll('>1 hora<', `>${duracao}<`);
    xml = xml.replaceAll('>Douglas Ramos Da Silva<', `>${colab.nome}<`);
    xml = xml.replaceAll('>702. 135.874-16<', `>${colab.cpf}<`);
    
    const sNum = slideCounter++;
    newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
    newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.list_front));
    slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
  }
  
  // LIST BACK
  {
    let xml = templates.list_back;
    xml = xml.replaceAll('>Treinamento de NR - 06<', `>Treinamento de ${nr}<`);
    xml = xml.replaceAll('>MVP Engenharia E Construção LTDA<', `>${empresa}<`);
    xml = xml.replaceAll('>Canteiro  De Obras<', `>${local}<`);
    xml = xml.replace('>30<', `>${formattedDate.substring(0, 2)}<`);
    xml = xml.replace('>/07/2026<', `>${formattedDate.substring(2)}<`);
    xml = xml.replaceAll('>1 hora<', `>${duracao}<`);
    xml = xml.replaceAll('>Douglas Ramos Da Silva<', `>${colab.nome}<`);
    xml = xml.replaceAll('>1702. 135.874-16<', `>${colab.cpf}<`);
    
    const sNum = slideCounter++;
    newZip.file(`ppt/slides/slide${sNum}.xml`, xml);
    newZip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, buildRels(templateRels.list_back));
    slideList.push({ slideNum: sNum, id: nextSlideId++, rId: `rId${nextRId++}` });
  }
  
  // Update presentation.xml
  let presentationXml = await newZip.file('ppt/presentation.xml').async('string');
  const newSlideListXml = slideList.map(s => `<p:sldId id="${s.id}" r:id="${s.rId}"/>`).join('');
  presentationXml = presentationXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${newSlideListXml}</p:sldIdLst>`);
  newZip.file('ppt/presentation.xml', presentationXml);
  
  // Update presentation.xml.rels
  let presRels = await newZip.file('ppt/_rels/presentation.xml.rels').async('string');
  presRels = presRels.replace(/<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g, '');
  const newSlideRels = slideList.map(s =>
    `<Relationship Id="${s.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s.slideNum}.xml"/>`
  ).join('');
  presRels = presRels.replace('</Relationships>', newSlideRels + '</Relationships>');
  newZip.file('ppt/_rels/presentation.xml.rels', presRels);
  
  // Update [Content_Types].xml
  let contentTypes = await newZip.file('[Content_Types].xml').async('string');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
  contentTypes = contentTypes.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
  const newOverrides = slideList.map(s =>
    `<Override PartName="/ppt/slides/slide${s.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  newZip.file('[Content_Types].xml', contentTypes);
  
  // Generate
  const buffer = await newZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('test_output.pptx', buffer);
  console.log('Generated test_output.pptx with ' + slideList.length + ' slides');
  
  // Verify - read back and check slides
  const verifyZip = await JSZip.loadAsync(buffer);
  const verifySlides = Object.keys(verifyZip.files).filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  console.log('Slides in output:', verifySlides);
  
  // Check first slide text
  const s1 = await verifyZip.file('ppt/slides/slide1.xml').async('string');
  const texts = s1.match(/<a:t>[^<]+<\/a:t>/g);
  console.log('Slide 1 texts:', texts?.slice(0, 5));
}

testGenerate().catch(console.error);
