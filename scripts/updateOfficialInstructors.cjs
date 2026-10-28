const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '..', 'src', 'data', 'officialTrainingModels.js');
let content = fs.readFileSync(targetFile, 'utf8');

const newInstructorsSection = `export const OFFICIAL_INSTRUCTORS = [
  {
    "id": "eider-gomes",
    "name": "Eider Gomes do Nascimento",
    "role": "Instrutor e Responsável Técnico",
    "registration": "MTE0009995/RN",
    "signatureFile": "/signatures/sig_eider_gomes.png"
  },
  {
    "id": "pedro-padilha",
    "name": "Pedro Henrique Lima Padilha",
    "role": "Instrutor e Técnico em Segurança do Trabalho",
    "registration": "MTE 0122480/SP",
    "signatureFile": "/signatures/sig_pedro_padilha.png"
  },
  {
    "id": "geraldo-fernandes",
    "name": "Geraldo Fernandes de Oliveira Junior",
    "role": "Instrutor Técnico Especialista",
    "registration": "MTE0141081/SP",
    "signatureFile": "/signatures/sig_geraldo_fernandes.png"
  },
  {
    "id": "arthur-jorge",
    "name": "Arthur Jorge da Silva Freitas",
    "role": "Instrutor / Bombeiro Profissional Civil",
    "registration": "CPF: 241.147.662-00",
    "signatureFile": "/signatures/sig_arthur_jorge.png"
  },
  {
    "id": "cezar-augusto",
    "name": "Cezar Augusto Galvão De P. Camêlo",
    "role": "Responsável Técnico / Instrutor (Engenheiro Eletricista)",
    "registration": "CREA-RN 211051104-4",
    "signatureFile": "/signatures/sig_cezar_augusto.png"
  },
  {
    "id": "luciano-lopes",
    "name": "Luciano Lopes Gomes",
    "role": "Instrutor Técnico em Soldagem e Trabalho a Quente",
    "registration": "MTE 001065- RN",
    "signatureFile": "/signatures/sig_luciano_lopes.png"
  },
  {
    "id": "raimundo-fernandes",
    "name": "Raimundo Fernandes de Oliveira Junior",
    "role": "Responsável Técnico Geral",
    "registration": "CREA – 211204597-0",
    "signatureFile": "/signatures/sig_raimundi_jr.png"
  },
  {
    "id": "alberto-bezerra",
    "name": "Alberto Bezerra",
    "role": "Instrutor de Segurança do Trabalho",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_alberto_bezerra.png"
  },
  {
    "id": "carlos-alberto",
    "name": "Carlos Alberto",
    "role": "Instrutor Técnico Especialista",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_carlos_alberto.png"
  },
  {
    "id": "claudio-alexandre",
    "name": "Claudio Alexandre",
    "role": "Instrutor Técnico",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_claudio_alexandre.png"
  },
  {
    "id": "everson-ricardo",
    "name": "Everson Ricardo",
    "role": "Instrutor de Segurança do Trabalho",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_everson_ricardo.png"
  },
  {
    "id": "francisco-alisson",
    "name": "Francisco Alisson",
    "role": "Instrutor e Técnico em Segurança",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_francisco_alisson.png"
  },
  {
    "id": "hudson-cesar",
    "name": "Hudson Cesar",
    "role": "Instrutor Técnico",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_hudson_cesar.png"
  },
  {
    "id": "hudson-legnar",
    "name": "Hudson Legnar",
    "role": "Instrutor Técnico Especialista",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_hudson_legnar.png"
  },
  {
    "id": "joao-paulo",
    "name": "João Paulo",
    "role": "Instrutor e Bombeiro Civil / APH",
    "registration": "SST/APH",
    "signatureFile": "/signatures/sig_joao_paulo.png"
  },
  {
    "id": "jose-emersson",
    "name": "José Emersson",
    "role": "Instrutor de Segurança do Trabalho",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_jose_emersson.png"
  },
  {
    "id": "lucas-vinicius",
    "name": "Lucas Vinicius",
    "role": "Instrutor Técnico",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_lucas_vinicius.png"
  },
  {
    "id": "marcelo-de-souza",
    "name": "Marcelo de Souza",
    "role": "Instrutor Técnico Especialista",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_marcelo_de_souza.png"
  },
  {
    "id": "marcondes-albino",
    "name": "Marcondes Albino",
    "role": "Instrutor Técnico em Soldagem e Trabalho a Quente",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_marcondes_albino.png"
  },
  {
    "id": "maxseul-de-souza",
    "name": "Maxseul de Souza",
    "role": "Instrutor de Segurança do Trabalho",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_maxseul_de_souza.png"
  },
  {
    "id": "paulo-de-abreu",
    "name": "Paulo de Abreu",
    "role": "Instrutor Técnico",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_paulo_de_abreu.png"
  },
  {
    "id": "thiago-rodrigues",
    "name": "Thiago Rodrigues",
    "role": "Instrutor Técnico Especialista",
    "registration": "MTE/SST",
    "signatureFile": "/signatures/sig_thiago_rodrigues.png"
  },
  {
    "id": "leiliana-nunes",
    "name": "Leiliana Nunes de Lima Fernandes",
    "role": "Coordenadora Técnica / Instrutora de Saúde & APH",
    "registration": "Coren RN 333018",
    "signatureFile": "/signatures/sig_leiliana_nunes.png"
  }
];

export const getInstructorSignatureUrl = (instructorName) => {
  if (!instructorName) return '/signatures/sig_eider_gomes.png';
  
  const norm = String(instructorName)
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (norm.includes('eider')) {
    return '/signatures/sig_eider_gomes.png';
  }
  if (norm.includes('pedro') || norm.includes('padilha')) {
    return '/signatures/sig_pedro_padilha.png';
  }
  if (norm.includes('carlos alberto')) {
    return '/signatures/sig_carlos_alberto.png';
  }
  if (norm.includes('alberto') || norm.includes('bezerra')) {
    return '/signatures/sig_alberto_bezerra.png';
  }
  if (norm.includes('arthur') || norm.includes('jorge')) {
    return '/signatures/sig_arthur_jorge.png';
  }
  if (norm.includes('cezar') || norm.includes('camelo')) {
    return '/signatures/sig_cezar_augusto.png';
  }
  if (norm.includes('claudio') || norm.includes('alexandre')) {
    return '/signatures/sig_claudio_alexandre.png';
  }
  if (norm.includes('everson') || norm.includes('ricardo')) {
    return '/signatures/sig_everson_ricardo.png';
  }
  if (norm.includes('francisco') || norm.includes('alisson')) {
    return '/signatures/sig_francisco_alisson.png';
  }
  if (norm.includes('geraldo')) {
    return '/signatures/sig_geraldo_fernandes.png';
  }
  if (norm.includes('legnar')) {
    return '/signatures/sig_hudson_legnar.png';
  }
  if (norm.includes('hudson') && norm.includes('cesar')) {
    return '/signatures/sig_hudson_cesar.png';
  }
  if (norm.includes('hudson')) {
    return '/signatures/sig_hudson_cesar.png';
  }
  if (norm.includes('joao') || (norm.includes('paulo') && norm.includes('joao'))) {
    return '/signatures/sig_joao_paulo.png';
  }
  if (norm.includes('jose') || norm.includes('emersson')) {
    return '/signatures/sig_jose_emersson.png';
  }
  if (norm.includes('lucas') || norm.includes('vinicius')) {
    return '/signatures/sig_lucas_vinicius.png';
  }
  if (norm.includes('luciano') || norm.includes('lopes')) {
    return '/signatures/sig_luciano_lopes.png';
  }
  if (norm.includes('maxseul')) {
    return '/signatures/sig_maxseul_de_souza.png';
  }
  if (norm.includes('marcelo')) {
    return '/signatures/sig_marcelo_de_souza.png';
  }
  if (norm.includes('marcondes') || norm.includes('albino')) {
    return '/signatures/sig_marcondes_albino.png';
  }
  if (norm.includes('abreu') || norm.includes('paulo de abreu')) {
    return '/signatures/sig_paulo_de_abreu.png';
  }
  if (norm.includes('raimund')) {
    return '/signatures/sig_raimundi_jr.png';
  }
  if (norm.includes('thiago') || norm.includes('rodrigues')) {
    return '/signatures/sig_thiago_rodrigues.png';
  }
  if (norm.includes('leiliana')) {
    return '/signatures/sig_leiliana_nunes.png';
  }

  return '/signatures/sig_eider_gomes.png';
};

`;

const splitMarker = 'export const OFFICIAL_TRAINING_MODELS = [';
const parts = content.split(splitMarker);
if (parts.length !== 2) {
  console.error('Marker not found or multiple markers found!');
  process.exit(1);
}

const headerPart = parts[0].split('export const OFFICIAL_INSTRUCTORS = [')[0];
const updatedContent = headerPart + newInstructorsSection + splitMarker + parts[1];

fs.writeFileSync(targetFile, updatedContent, 'utf8');
console.log('Successfully updated officialTrainingModels.js');
