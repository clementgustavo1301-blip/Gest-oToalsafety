import JSZip from 'jszip';

/**
 * Gera um arquivo PPTX a partir do template, clonando os 4 slides modelo
 * para cada colaborador e substituindo as variáveis.
 * 
 * Template slides (do arquivo original):
 *   slide1 = Certificado template (placeholders genéricos)
 *   slide2 = Certificado frente (sem técnico) - usado como template para cert_front
 *   slide3 = Lista de presença frente - usado como template para list_front  
 *   slide4 = Lista de presença verso - usado como template para list_back
 *   slide6 = Certificado verso (com técnico) - usado como template para cert_back
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
  // 1. Fetch the template
  const response = await fetch('/template-certificado.pptx');
  const templateBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(templateBuffer);

  // 2. Read the 4 template slides XML + rels
  const templateSlides = {};
  const templateRels = {};
  
  // slide2 = cert_front (sem técnico), slide6 = cert_back (com técnico)
  // slide3 = list_front, slide4 = list_back
  const slideMap = {
    cert_front: 2,
    cert_back: 6,
    list_front: 3,
    list_back: 4
  };

  for (const [key, num] of Object.entries(slideMap)) {
    templateSlides[key] = await zip.file(`ppt/slides/slide${num}.xml`).async('string');
    const relsFile = zip.file(`ppt/slides/_rels/slide${num}.xml.rels`);
    if (relsFile) {
      templateRels[key] = await relsFile.async('string');
    }
  }

  // 3. Read presentation.xml and presentation.xml.rels
  let presentationXml = await zip.file('ppt/presentation.xml').async('string');
  let presentationRels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  
  // 4. Read [Content_Types].xml
  let contentTypes = await zip.file('[Content_Types].xml').async('string');

  // 5. Remove all existing slides except keeping the structure
  const existingSlideFiles = Object.keys(zip.files).filter(f => 
    f.startsWith('ppt/slides/slide') && f.endsWith('.xml')
  );
  const existingSlideRels = Object.keys(zip.files).filter(f => 
    f.startsWith('ppt/slides/_rels/slide') && f.endsWith('.xml.rels')
  );
  const existingNotes = Object.keys(zip.files).filter(f =>
    f.startsWith('ppt/notesSlides/')
  );

  // Remove existing slides
  for (const f of [...existingSlideFiles, ...existingSlideRels, ...existingNotes]) {
    zip.remove(f);
  }

  // 6. Generate new slides for each collaborator
  let slideIndex = 1;
  const slideEntries = []; // { id, rId, slideNum }
  let nextId = 400;
  let nextRId = 100;

  // Helper to replace text in slide XML
  function replaceInSlide(xml, replacements) {
    let result = xml;
    for (const [search, replace] of Object.entries(replacements)) {
      // Replace exact <a:t> matches
      result = result.replaceAll(search, replace);
    }
    return result;
  }

  // Helper to get a clean rels without notesSlide reference
  function cleanRels(relsXml, slideNum) {
    // Replace slide reference numbers and remove notes references
    let cleaned = relsXml.replace(/notesSlide[^"]*\.xml/g, `notesSlide1.xml`);
    return cleaned;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'DD/MM/AAAA';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  for (const colab of colaboradores) {
    if (!colab.nome.trim()) continue;

    const formattedDate = formatDate(data);
    
    // --- CERT FRONT (based on slide2) ---
    {
      const replacements = {
        'Douglas Ramos Da silva': colab.nome,
        'Douglas Ramos Da Silva': colab.nome,
        '702. 135.874-16': colab.cpf,
        '30/07/2026': formattedDate,
        'Canteiro De Obras': local,
        'MVP Engenharia E Construção LTDA': empresa,
        'Sobre uso e guarda de EPI conforme exigências da ': descricao.includes('\n') ? descricao.split('\n')[0] : descricao.substring(0, descricao.lastIndexOf(' Norma') > 0 ? descricao.lastIndexOf(' Norma') : descricao.length),
        'Norma Regulamentadora - NR 06': descricao.includes('Norma') ? descricao.substring(descricao.indexOf('Norma')) : `NR ${nr}`,
      };
      let slideXml = replaceInSlide(templateSlides.cert_front, replacements);
      const sNum = slideIndex++;
      zip.file(`ppt/slides/slide${sNum}.xml`, slideXml);
      if (templateRels.cert_front) {
        zip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, cleanRels(templateRels.cert_front, sNum));
      }
      slideEntries.push({ id: nextId++, rId: `rId${nextRId++}`, slideNum: sNum });
    }

    // --- CERT BACK (based on slide6 - has técnico) ---
    {
      const replacements = {
        'Henrique ': colab.nome.split(' ')[0] + ' ',
        'Trajano': colab.nome.split(' ').length > 1 ? colab.nome.split(' ').slice(1).join(' ') : '',
        ' Da Silva Neto': '',
        ' Da ': '',
        'sIlva': '',
        ' Neto': '',
        ' 133.016.124-66': colab.cpf,
        'CPF: ': 'CPF: ',
        '30/07/2026': formattedDate,
        'Canteiro De Obras': local,
        'M A Construções E Serviços LTDA': empresa,
        'Sobre uso e guarda de EPI conforme exigências da ': descricao.includes('\n') ? descricao.split('\n')[0] : descricao.substring(0, descricao.lastIndexOf(' Norma') > 0 ? descricao.lastIndexOf(' Norma') : descricao.length),
        'Norma Regulamentadora - NR 06': descricao.includes('Norma') ? descricao.substring(descricao.indexOf('Norma')) : `NR ${nr}`,
      };
      let slideXml = replaceInSlide(templateSlides.cert_back, replacements);
      const sNum = slideIndex++;
      zip.file(`ppt/slides/slide${sNum}.xml`, slideXml);
      if (templateRels.cert_back) {
        zip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, cleanRels(templateRels.cert_back, sNum));
      }
      slideEntries.push({ id: nextId++, rId: `rId${nextRId++}`, slideNum: sNum });
    }

    // --- LIST FRONT (based on slide3) ---
    {
      const replacements = {
        'Douglas Ramos Da Silva': colab.nome,
        '702. 135.874-16': colab.cpf,
        '30': formattedDate.substring(0, 2),
        '/07/2026': formattedDate.substring(2),
        'Canteiro De Obras': local,
        'MVP Engenharia E Construção LTDA': empresa,
        'Treinamento de NR - 06': `Treinamento de ${nr}`,
        '1 hora': duracao,
      };
      // Handle instructor name (split in XML)
      let slideXml = templateSlides.list_front;
      // Replace instructor
      slideXml = slideXml.replace(/>Adeylton</, `>${instrutorNome.split(' ')[0]}<`);
      slideXml = slideXml.replace(/> da Silva </, `> ${instrutorNome.split(' ').slice(1, -1).join(' ')} <`);
      slideXml = slideXml.replace(/>Araújo</, `>${instrutorNome.split(' ').slice(-1)[0]}<`);
      slideXml = slideXml.replace(/>Técnico</, `>${instrutorCargo.split(' ')[0]}<`);
      slideXml = slideXml.replace(/>Segurança</, `>${instrutorCargo.split(' ').find(w => w.length > 3 && w !== instrutorCargo.split(' ')[0]) || 'Segurança'}<`);
      slideXml = slideXml.replace(/>Trabalho</, `>${instrutorCargo.split(' ').slice(-1)[0]}<`);
      slideXml = slideXml.replace(/>SRTE N° 0009823\/RN</, `>${instrutorRegistro}<`);
      
      // Replace other fields
      for (const [search, replace] of Object.entries(replacements)) {
        slideXml = slideXml.replaceAll(`>${search}<`, `>${replace}<`);
      }
      
      // Replace conteudo programatico lines
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
        const newLine = conteudoLines[idx] || '';
        slideXml = slideXml.replace(`>${defaultLines[idx]}<`, `>${newLine}<`);
      }
      
      const sNum = slideIndex++;
      zip.file(`ppt/slides/slide${sNum}.xml`, slideXml);
      if (templateRels.list_front) {
        zip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, cleanRels(templateRels.list_front, sNum));
      }
      slideEntries.push({ id: nextId++, rId: `rId${nextRId++}`, slideNum: sNum });
    }

    // --- LIST BACK (based on slide4) ---
    {
      const replacements = {
        'Douglas Ramos Da Silva': colab.nome,
        '1702. 135.874-16': colab.cpf,
        'Canteiro  De Obras': local,
        'MVP Engenharia E Construção LTDA': empresa,
        'Treinamento de NR - 06': `Treinamento de ${nr}`,
        '1 hora': duracao,
      };
      let slideXml = templateSlides.list_back;
      // Replace instructor (same logic)
      slideXml = slideXml.replace(/>Adeylton</, `>${instrutorNome.split(' ')[0]}<`);
      slideXml = slideXml.replace(/> da Silva </, `> ${instrutorNome.split(' ').slice(1, -1).join(' ')} <`);
      slideXml = slideXml.replace(/>Araújo</, `>${instrutorNome.split(' ').slice(-1)[0]}<`);
      slideXml = slideXml.replace(/>Técnico</, `>${instrutorCargo.split(' ')[0]}<`);
      slideXml = slideXml.replace(/>Segurança</, `>${instrutorCargo.split(' ').find(w => w.length > 3 && w !== instrutorCargo.split(' ')[0]) || 'Segurança'}<`);
      slideXml = slideXml.replace(/>Trabalho</, `>${instrutorCargo.split(' ').slice(-1)[0]}<`);
      slideXml = slideXml.replace(/>SRTE N° 0009823\/RN</, `>${instrutorRegistro}<`);
      
      // Replace date parts
      slideXml = slideXml.replace(/>30</, `>${formatDate(data).substring(0,2)}<`);
      slideXml = slideXml.replace(/>\/07\/2026</, `>${formatDate(data).substring(2)}<`);
      
      for (const [search, replace] of Object.entries(replacements)) {
        slideXml = slideXml.replaceAll(`>${search}<`, `>${replace}<`);
      }
      
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
        const newLine = conteudoLines[idx] || '';
        slideXml = slideXml.replace(`>${defaultLines[idx]}<`, `>${newLine}<`);
      }
      
      const sNum = slideIndex++;
      zip.file(`ppt/slides/slide${sNum}.xml`, slideXml);
      if (templateRels.list_back) {
        zip.file(`ppt/slides/_rels/slide${sNum}.xml.rels`, cleanRels(templateRels.list_back, sNum));
      }
      slideEntries.push({ id: nextId++, rId: `rId${nextRId++}`, slideNum: sNum });
    }
  }

  // 7. Update presentation.xml - replace slide list
  const slideListXml = slideEntries.map(e => 
    `<p:sldId id="${e.id}" r:id="${e.rId}"/>`
  ).join('');
  presentationXml = presentationXml.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${slideListXml}</p:sldIdLst>`
  );
  zip.file('ppt/presentation.xml', presentationXml);

  // 8. Update presentation.xml.rels - add slide references
  // Remove old slide references
  presentationRels = presentationRels.replace(
    /<Relationship[^>]*Type="[^"]*slide"[^>]*\/>/g, ''
  );
  // Add new slide references before closing tag
  const newRels = slideEntries.map(e =>
    `<Relationship Id="${e.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${e.slideNum}.xml"/>`
  ).join('');
  presentationRels = presentationRels.replace('</Relationships>', newRels + '</Relationships>');
  zip.file('ppt/_rels/presentation.xml.rels', presentationRels);

  // 9. Update [Content_Types].xml - add slide entries
  // Remove old slide overrides
  contentTypes = contentTypes.replace(
    /<Override[^>]*PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, ''
  );
  // Add new
  const newOverrides = slideEntries.map(e =>
    `<Override PartName="/ppt/slides/slide${e.slideNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('');
  contentTypes = contentTypes.replace('</Types>', newOverrides + '</Types>');
  zip.file('[Content_Types].xml', contentTypes);

  // 10. Generate the PPTX blob
  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}
