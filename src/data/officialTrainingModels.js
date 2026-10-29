// Catálogo Oficial de Modelos de Treinamentos e Certificados TotalSafety / EcoSafety
// Extraído diretamente dos 27 modelos de certificados oficiais do setor de treinamento

export const OFFICIAL_INSTRUCTORS = [
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
    .replace(/[\u0300-\u036f]/g, '')
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

export const OFFICIAL_TRAINING_MODELS = [
  {
    "id": "nr35-basico",
    "category": "NR-35 Trabalho em Altura",
    "name": "NR-35 – Trabalho em Altura – Nível Básico (8h)",
    "title": "NR-35 – TRABALHO EM ALTURA – NÍVEL BÁSICO",
    "duration": "8 horas",
    "validade": "24 meses",
    "description": "treinamento com carga horária de 8 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 35 (NR-35), ABNT NBR 16325-1, ABNT NBR 16325-2 e demais requisitos técnicos aplicáveis.",
    "content": "1.  Conceitos, definições e requisitos da NR-35;\n2. Responsabilidades do empregador, supervisor e trabalhador;\n3. Planejamento, organização e execução do trabalho em altura;\n4. Análise de Risco (AR) e Permissão de Trabalho (PT);\n5. Identificação dos perigos e medidas de prevenção;\n6. Sistemas de proteção coletiva;\n7. Equipamentos de Proteção Individual (EPIs): seleção, inspeção, utilização, conservação e limitações;\n8. Sistemas de proteção contra quedas;\n9. Fator de queda, zona livre de queda e efeito pêndulo;\n10. Pontos e sistemas de ancoragem;\n11. Talabartes, trava-quedas e linhas de vida;\n12. Procedimentos para suspensão das atividades em condições de risco;\n13. Noções básicas de resgate em altura;\n14. Procedimentos de emergência;\n15. Primeiros socorros aplicados ao trabalho em altura;\n16. Atividades práticas de utilização dos equipamentos;\n17. Avaliação teórica e prática.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr35-autorizados",
    "category": "NR-35 Trabalho em Altura",
    "name": "NR-35 – Trabalhadores Autorizados em Altura (8h)",
    "title": "NR35 – TRABALHADORES AUTORIZADOS EM ALTURA",
    "duration": "8 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 08 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 35 (NR-35), ABNT NBR 16325 e demais requisitos técnicos aplicáveis. Mossoró,",
    "content": "1. Conceitos, definições e requisitos da NR-35;\n2. Responsabilidades do empregador, supervisor e trabalhador;\n3. Planejamento, organização e execução do trabalho em altura;\n4. Análise de Risco (AR) e Permissão de Trabalho (PT);\n5. Identificação dos perigos e medidas de prevenção;\n6. Sistemas de proteção coletiva (SPC);\n7. Equipamentos de Proteção Individual (EPIs): seleção, inspeção, utilização, conservação e\nlimitações;\n8. Sistemas de proteção contra quedas;\n9. Fator de queda, zona livre de queda e efeito pêndulo;\n10. Pontos e sistemas de ancoragem;\n11. Talabartes, trava-quedas e linhas de vida;\n12. Técnicas de movimentação e posicionamento em altura;\n13. Inspeção e verificação dos equipamentos;\n14. Trabalhos em telhados, escadas, plataformas e estruturas elevadas;\n15. Movimentação segura de materiais em altura;\n16. Procedimentos para suspensão de atividades em condições de risco;\n17. Noções de resgate em altura;\n18. Procedimentos de emergência;\n19. Primeiros socorros aplicados ao trabalho em altura;\n20. Estudos de casos e análise de acidentes;\n21. Atividades práticas de utilização dos equipamentos;\n22. Simulações de resgate e evacuação;\n23. Avaliação teórica;\n24. Avaliação prática.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr35-intermediario",
    "category": "NR-35 Trabalho em Altura",
    "name": "NR-35 – Trabalho em Altura – Nível Intermediário (16h)",
    "title": "NR-35 – TRABALHO EM ALTURA – NÍVEL INTERMEDIÁRIO",
    "duration": "16 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 16 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 35 (NR-35), ABNT NBR 16325-1, ABNT NBR 16325-2 e demais requisitos técnicos aplicáveis.",
    "content": "1.  Conceitos, definições e requisitos da NR-35;\n2. Normas técnicas aplicáveis ao trabalho em altura;\n3. Responsabilidades do empregador, supervisor e trabalhador;\n4. Planejamento e gestão das atividades em altura;\n5. Análise de Risco (AR), Permissão de Trabalho (PT) e condições impeditivas;\n6. Identificação, avaliação e controle dos riscos;\n7. Sistemas de proteção coletiva;\n8. Sistemas de proteção individual contra quedas;\n9. Seleção, inspeção, conservação e limitações dos EPIs;\n10. Sistemas de ancoragem e linhas de vida;\n11. Fator de queda, força de impacto e efeito pêndulo;\n12. Técnicas de movimentação, posicionamento e deslocamento em altura;\n13. Trabalhos em telhados, escadas, plataformas, andaimes e estruturas metálicas;\n14. Movimentação segura de ferramentas e materiais;\n15. Inspeção e verificação dos equipamentos;\n16. Acidentes típicos em trabalho em altura e medidas preventivas;\n17. Procedimentos de emergência;\n18. Técnicas básicas de resgate;\n19. Primeiros socorros;\n20. Estudos de caso;\n21. Exercícios práticos;\n22. Simulações de emergência;\n23. Avaliação teórica;\n24. Avaliação prática.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr35-avancado",
    "category": "NR-35 Trabalho em Altura",
    "name": "NR-35 – Trabalho em Altura – Nível Avançado (24h)",
    "title": "NR-35 – TRABALHO EM ALTURA – NÍVEL AVANÇADO",
    "duration": "24 horas",
    "validade": "24 meses",
    "description": "treinamento com carga horária de 24 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 35 (NR-35), ABNT NBR 16325-1, ABNT NBR 16325-2 e demais requisitos técnicos aplicáveis.",
    "content": "1.  Legislação aplicada ao trabalho em altura;\n2. NR-35 e normas técnicas complementares;\n3. Gestão da segurança em trabalhos em altura;\n4. Planejamento avançado das atividades;\n5. Elaboração de Análise de Risco (AR);\n6. Permissão de Trabalho (PT);\n7. Técnicas de gerenciamento de riscos;\n8. Sistemas de proteção coletiva;\n9. Sistemas individuais de proteção contra quedas;\n10. Critérios de seleção dos equipamentos;\n11. Inspeção avançada de EPIs e EPCs;\n12. Sistemas de ancoragem temporários e permanentes;\n13. Linhas de vida horizontais e verticais;\n14. Cálculo do fator de queda, zona livre e distância de frenagem;\n15. Técnicas de acesso, posicionamento e deslocamento;\n16. Trabalhos em telhados, torres, estruturas metálicas, plataformas, escadas, fachadas e espaços elevados;\n17. Inspeção de estruturas e pontos de ancoragem;\n18. Planejamento de equipes para trabalho em altura;\n19. Procedimentos para atividades críticas;\n20. Plano de emergência;\n21. Técnicas de resgate em altura;\n22. Primeiros socorros aplicados ao trauma por queda;\n23. Estudos de acidentes reais e análise de causas;\n24. Exercícios práticos em cenários simulados;\n25. Simulações completas de resgate;\n26. Avaliação teórica;\n27. Avaliação prática.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Pedro Henrique Lima Padilha",
      "role": "Instrutor e Técnico em Segurança do Trabalho",
      "registration": "MTE 0122480/SP"
    }
  },
  {
    "id": "nr35-gerenciamento",
    "category": "NR-35 Trabalho em Altura",
    "name": "NR-35 – Gerenciamento de Trabalho em Altura (40h)",
    "title": "GERENCIAMENTO DE TRABALHO EM ALTURA – NR-35",
    "duration": "40 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 40 horas, desenvolvido em conformidade com a NR-35 – Trabalho em Altura, NR-06 – Equipamentos de Proteção Individual (EPI), NR-01 – Gerenciamento de Riscos Ocupacionais (GRO/PGR), Portaria MTE nº 672/2021, ABNT NBR 16325, ABNT NBR 15834, ABNT NBR 15835, ABNT NBR 15836, ABNT NBR 16489, EN 361, EN 354, EN 355, EN 365 e ANSI/ASSP Z359.2 e Z359.14, contemplando os requisitos técnicos para planejamento, gerenciamento de riscos, supervisão, inspeção, utilização, manutenção, rastreabilidade, descarte de equipamentos de proteção contra quedas, sistemas de ancoragem, procedimentos de emergência e gestão das atividades em altura. Mossoró,",
    "content": "Módulo I:\nLegislação, Normativa e Responsabilidades (6h)\nEstrutura Legal e Hierarquia de Normas: NR-35, NR-01 (GRO/PGR), CLT e Código Penal/Civil em SST.\nResponsabilidades do Empregador e dos Trabalhadores: Dever de recusa, aptidão médica (ASO e NR-07) e\nresponsabilidade civil/criminal de gestores.\nEstrutura da NR-35 e seus Anexos:\nAnexo I (Acesso por Cordas).\nAnexo II (Sistemas de Ancoragem).\nAnexo III (Escadas).\nDocumentação Obrigatória: Registros de treinamento, procedimentos operacionais e guarda de documentos.\nMódulo II:\nGestão de Riscos Aplicada ao Trabalho em Altura (8h)\nIntegração com o GRO/PGR: Matrizes de risco para trabalho em altura e inventário de riscos.\nHierarquia das Medidas de Controle:\n1.\nEvitar o trabalho em altura.\n2.\nIsolamento / Proteção coletiva.\n3.\nProteção individual / Retenção de queda.\nAnálise Prévia de Risco (APR): Elaboração, validação e aplicação prática.\nPermissão de Trabalho (PT): Emissão, controle de validade, encerramento e responsabilidades dos\nsignatários.\nFatores Condicionantes: Ventos, chuvas, iluminação, linhas energizadas e superfícies frágeis.\nMódulo III:\nSistemas de Proteção Contra Quedas (SPCQ) e Ancoragens (8h)\nConceituação e Dimensionamento de SPCQ: Sistemas de retenção, restrição e posicionamento.\nAnálise da Linha de Vida e Pontos de Ancoragem: Conforme ABNT NBR 16325 (Tipos A, B, C e D).\nProjeto Técnico e Responsabilidade Técnica: Exigência de ART (Anotação de Responsabilidade Técnica)\npara ancoragens e linhas de vida.\nZona de Livre Queda (ZLQ) e Fator de Queda:\nCálculo da ZLQ: (ZLQ = L₍talabarte₎ + L₍absorvedor₎ + Altura₍trabalhador₎ + Margem₍segurança₎).\nAnálise prática de colisão com obstáculos inferiores.\nMódulo IV:\nEquipamentos (EPI/EPC), Inspeção e Manutenção (6h)\nSeleção e Especificação Tecnológica: Cintos paraquedistas, talabartes,\ntrava-quedas (flexíveis, rígidos e retráteis).\nCertificado de Aprovação (CA) e Validade: Critérios para aquisição e\ndescarte.\nPlanos de Inspeção de Equipamentos:\nInspeção rotineira (pré-uso).\nInspeções periódicas formais: Registro de rastreabilidade.\nCriterização de descarte: Impacto severo, contaminação química,\ndesgaste de tramas.\nMódulo V:\nPlano de Emergência, Resgate e Primeiros Socorros (6h)\nElaboração do Plano de Resgate: Exigências da NR-35 para cenários de\nemergência.\nSíndrome da Suspensão Inerte (Trauma da Suspensão): Fisiopatologia,\nprevenção e procedimentos imediatos de socorro.\nDimensionamento da Equipe de Resgate: Própria vs. Terceirizada\n(recursos técnicos e tempo de resposta).\nSimulados de Emergência: Periodicidade, indicadores de desempenho e\nmelhoria contínua.\nMódulo VI:\nAuditoria, Gestão de Terceiros e Prática de Supervisão (6h)\nGestão e Homologação de Contratadas/Terceiros: Validação de ASOs,\ntreinamentos, APRs e procedimentos antes da liberação do trabalho.\nIndicadores de Desempenho (KPIs) em Trabalho em Altura: Taxa de\nconformidade de PTs, auditorias de campo e aderência aos planos de\ninspeção.\nMetodologia de Auditoria de Campo: Checklists práticos de\nfiscalização.\nWorkshop Prático de Gestão: Estudo de casos reais, análise de falhas\noperacionais e elaboração de um Plano de Ação (5W2H).",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr35-ancoragem",
    "category": "NR-35 Trabalho em Altura",
    "name": "Instalação e Utilização de Sistemas de Ancoragem (24h)",
    "title": "INSTALAÇÃO E UTILIZAÇÃO DE SISTEMAS DE ANCORAGEM",
    "duration": "24 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 24 horas, desenvolvido em conformidade com a NR-35 – Trabalho em Altura, seu Anexo II – Sistemas de Ancoragem, NR-06 – Equipamentos de Proteção Individual (EPI), Portaria MTE nº 672/2021, ABNT NBR 16325 (Partes 1 e 2), ABNT NBR 16489, EN 795, ANSI/ASSP Z359 e ISO 22846, contemplando os requisitos técnicos para seleção, dimensionamento, projeto, instalação, inspeção, ensaios, utilização, manutenção, documentação e gestão de sistemas de ancoragem destinados à proteção contra quedas em trabalhos em altura. Mossoró,",
    "content": "Módulo I:\nMarco Legal e Conceitos Fundamentais (3 horas)\nRegulamentação Nacional:\nNR-35 (Trabalho em Altura) e seu Anexo II (Sistemas de Ancoragem).\nResponsabilidade civil e criminal dos projetistas, instaladores e inspetores.\nNormas Técnicas Aplicáveis:\nABNT NBR 16325: Parte 1 (Tipos A, B e D) e Parte 2 (Tipo C).\nABNT NBR 16489: Seleção, instalação, uso e manutenção.\nVisão geral de normas internacionais: EN 795, ANSI/ASSP Z359 e ISO 22846.\nFísica da Queda e Biomecânica:\nZona Livre de Queda (ZLQ), Fator de Queda (FQ) e Força de Impacto (Fi).\nEfeito Pêndulo e distância de retenção.Efeito Pêndulo e distância de retenção.\nMódulo II:\nTipologia e Classificação dos Dispositivos (ABNT NBR 16325) (4 horas)\nClassificação dos Sistemas de Ancoragem:\n1.\nTipo A: Ancoragens pontuais para fixação em superfícies verticais, horizontais ou inclinadas.\n2.\nTipo B: Ancoragens provisórias/temporárias e transportáveis (tripés, fitas, vigas).\n3.\nTipo C: Linhas de vida flexíveis horizontais (cabo de aço ou fita).\n4.\nTipo D: Linhas de vida rígidas horizontais (trilhos/vigas).\n5.\nTipo E: Fixação por gravidade. Sua base é composta por múltiplos pesos (massas) calculados para\nabsorver e resistir à força de impacto gerada por uma queda.\nAncoragens Estruturais e Elementos de Fixação:\nFixação química vs. mecânica (parafusos passantes, chumbadores expansivos).\nCompatibilidade entre materiais e prevenção de corrosão galvânica.\nMódulo  III:\nDimensionamento, Cargas e Projetos (5 horas)\nAnálise de Esforços e Cargas de Projeto:\nCargas estáticas, dinâmicas e de deformação.\nMultiplicação de forças em ângulos de desvio de linhas de vida.\nIntegração com o Edifício/Estrutura:\nVerificação da resistência estrutural do substrato (concreto, aço, alvenaria estrutural).\nDocumentação Técnica Obrigatória:\nAnotação de Responsabilidade Técnica (ART/RRT).\nMemorial de cálculo, projeto executivo e procedimentos operacionais.\nPlano de Resgate integrado ao sistema de ancoragem.\nMódulo IV:\nSeleção, Instalação e Inspeção (ABNT NBR 16489) (6 horas)\nCritérios de Seleção:\nAvaliação do local de trabalho, quantidade de usuários simultâneos e ergonomia.\nProcedimentos de Instalação:\nTorque recomendado, tempo de cura de ancoragens químicas e alinhamento.\nEnsaios e Testes Práticos:\nEnsaio de arrancamento estático (pull-out test) e ensaios não destrutivos.\nAmostragem e critérios de aprovação/rejeição.\nGestão de Inspeções:\nInspeção inicial (comissionamento), periódica (anual) e extraordinária (pós-\nretenção de queda).\nCritérios de descarte, vida útil e identificação/marcação obrigatória dos pontos.\nMódulo V:\nPrática de Campo e Aplicação Operacional (6 horas)\nInstalação Prática de Sistemas:\nMontagem e desmontagem de sistemas Tipo B (fitas, moitões, tripés).\nInstalação de dispositivos Tipo A em substrato de concreto/aço.\nExecução de Ensaios:\nAplicação de carga de teste com dinamômetro/extensômetro em campo.\nPreenchimento de Documentação:\nElaboração do Livro do Sistema de Ancoragem (Data Book/Registro de Inspeção).\nCheck-list prático de liberação de uso.\nSimulação de Cenários Realistas:\nInstalação de pontos de ancoragem (químico e mecânico).\nTestes de pontos de ancoragem.\nMontagem de linha de vida temporária.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr18-nr35-cadeira",
    "category": "NR-35 Trabalho em Altura",
    "name": "Cadeira Suspensa – NR-18 / NR-35 (16h)",
    "title": "CADEIRA SUSPENSA – NR-18 / NR-35",
    "duration": "16 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 16 horas, desenvolvido em conformidade com a NR-18 – Condições e Meio Ambiente de Trabalho na Indústria da Construção, NR-35 – Trabalho em Altura, e demais requisitos técnicos aplicáveis à utilização segura de cadeira suspensa. Mossoró,",
    "content": "1. NR-35 (Trabalho em Altura) e seus anexos, com ênfase nos requisitos para\nutilização de cadeira suspensa.Conceitos e definições de espaços confinados.\n2. Compreender a legislação pertinente (NR-18) e suas implicações para o trabalho\ncom cadeira suspensa. Responsabilidades legais dos envolvidos.\n3. Aplicação dos protocolos de segurança para evitar acidentes e garantir a\nintegridade física.\n4. Avaliação dos riscos associados ao trabalho em altura com cadeira\nsuspensa. Avaliação e monitoramento atmosférico.\n5. Aplicação correta do funcionamento da cadeira suspensa, incluindo seus\ncomponentes e ajustes seguindo as instruções do fabricante. Instrumentos de\ndetecção de gases e calibração.\n6. Conhecer os EPIs necessários (cinto de segurança, trava-quedas, etc.) e sua\nutilização correta. Permissão de Entrada e Trabalho (PET).\n7. Aplicação e nós mais adequados para a segurança do trabalho em altura ( nós em\nfigura 8, 9 e borboleta alpina). Identificar e utilizar corretamente os diferentes\ntipos de pontos de ancoragem e montagem de ancoragem equalizadas e semi\nequalizadas. Isolamento e bloqueio de energias perigosas.\n8. Técnicas de resgate habilidades para resgatar a si mesmo ou outros em situações\nde emergência.Proteção respiratória.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr10-basico",
    "category": "NR-10 Segurança em Eletricidade",
    "name": "NR-10 – Segurança em Instalações e Serviços em Eletricidade (40h)",
    "title": "NR10 - SEGURANÇA EM INSTALAÇÕES E SERVIÇOS EM ELETRICIDADE",
    "duration": "40 horas",
    "validade": "24 meses",
    "description": "Treinamento com carga horária de 40 horas, conforme a NR-10 – Segurança em Instalações e Serviços em Eletricidade, abordando os requisitos e as medidas de controle para garantir a segurança e a saúde dos trabalhadores que interagem, direta ou indiretamente, com instalações elétricas e serviços com eletricidade, em conformidade com a legislação vigente Mossoró,",
    "content": "1.\nIntrodução à segurança com eletricidade.\n2.\nRiscos em instalações e serviços com  eletricidade:\na.\no choque elétrico, mecanismos e efeitos:\nb.\narcos elétricos; queimaduras e quedas;\nc.\ncampos eletromagnéticos.\n3.\nTécnicas de Análise de Risco.\n4.\nMedidas de Controle do Risco  Elétrico:\na)\nDesenergização.\nb)\nAterramento funcional (TN / TT / ITI; de proteção; temporário;\nc)\nEquipotencialização;\nd)\nSeccionamento automático da alimentação;\ne)\nDispositivos a corrente de fuga;\nf)\nExtrabaixa tensão;\ng)\nBarreiras e invólucros;\nh)\nBloqueios e impedimentos;\ni)\nObstáculos e anteparos;\nj)\nIsolamento das partes vivas;\nk)\nIsolação dupla ou reforçada;\nl)\nColocação fora de alcance;\nm) Separação elétrica.\n5.\nNormas  Técnicas Brasileiras  - NBR da ABNT: NBR-5410, NBR 14039 e  outras\n6. Regulamentações do MTE:\na) NRs;\nb) NR-10 (Segurança em Instalações e Serviços com Eletricidade);\nc) Qualificação, habilitação, capacitação e autorização.\n7. Equipamentos de proteção coletiva.\n8. Equipamentos de proteção individual.\n9. Rotinas de trabalho – Procedimentos:\na) Instalações desenergizadas;\nb) Liberação para serviços;\nc) Sinalização.\n10. Documentação de instalações elétricas.\n11. Riscos adicionais:\na) Altura;\nb) Ambientes confinados;\nc) Áreas classificadas;\nd) Umidade;\ne) Condições atmosféricas.\n12. Proteção e combate a incêndios:\na) Noções básicas;\nb) Medidas preventivas;\nc) Métodos de extinção;\nd) Prática.\n13. Acidentes de origem elétrica:\na) Causas diretas e indiretas;\na)     b) Discussão de casos.\n14. Primeiros socorros:\nnoções sobre lesões;\nb) priorização do atendimento:\nc) aplicação de respiração artificial;\nd) massagem cardíaca;\ne) técnicas para remoção e transporte de acidentados:\nf} práti cas.\n15. Responsabilidades.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Cezar Augusto Galvão De P. Camêlo",
      "role": "Responsável Técnico / Instrutor (Engenheiro Eletricista)",
      "registration": "CREA-RN 211051104-4"
    }
  },
  {
    "id": "nr10-sep",
    "category": "NR-10 Segurança em Eletricidade",
    "name": "NR-10 SEP – Sistema Elétrico de Potência (40h)",
    "title": "SEGURANÇA NO SISTEMA ELÉTRICO DE POTÊNCIA (SEP) E EM SUAS PROXIMIDADES",
    "duration": "40 horas",
    "validade": "24 meses",
    "description": "Treinamento com carga horária de 40 horas, conforme a NR-10 – Segurança no Sistema Elétrico de Potência (SEP) e em suas Proximidades, abordando os requisitos e as medidas de controle para garantir a segurança e a saúde dos trabalhadores que atuam direta ou indiretamente em instalações do Sistema Elétrico de Potência e em suas proximidades, em conformidade com a legislação vigente. Mossoró,",
    "content": "Módulo 1: Organização do Sistema Elétrico de Potência (SEP\n-\nntrodução ao SEP: Organização do sistema elétrico nacional.\n-\nGeração: Usinas hidrelétricas, térmicas, eólicas e solares.\n-\nTransmissão: Linhas de transmissão, subestações e equipamentos de manobra.\n-\nDistribuição: Redes aéreas e subterrâneas de média e baixa tensão.\n-\nOrganização do Trabalho: Programação, planejamento e coordenação de atividades no SEP.\n-\nTrabalho em Equipe: Comunicação operacional, prontuário da instalação e ordens de serviço.\nMódulo 2: Técnicas de Análise de Risco no SEP\n-\nAnálise Comportamental: Fatores humanos que influenciam na segurança.\n-\nTécnicas de Análise de Risco: Aplicação de APR (Análise Preliminar de Risco) e PT (Permissão de Trabalho).\n-\nRiscos Típicos no SEP: Acidentes de origem elétrica em alta tensão, quedas de nível, ataques de animais peçonhentos e intempéries.\n-\nFenômenos Elétricos Específicos: Indução eletromagnética, descargas atmosféricas e efeitos de campos elétricos e magnéticos.\nProcedimentos e Técnicas de Trabalho sob Tensão\n-\nMétodos de Trabalho em Linha Viva: Trabalho ao potencial, à distância e ao contato.\n-\nTrabalho em Instalações Subterrâneas: Espaços confinados, atmosfera explosiva e redes subterrâneas.\n-\nEquipamentos e Ferramentas: Escolha, inspeção, ensaios dielétricos, guarda e transporte de ferramentas específicas para SEP.\n-\nSinalização e Isolamento: Delimitação de áreas de trabalho e zonas de risco/controladas.\nMódulo 4: Equipamentos de Proteção e Condições Impeditivas\nEquipamentos de Proteção Coletiva (EPC): Cones, fitas, bastões de manobra, detectores de tensão e aterramento temporário.\n-\nEquipamentos de Proteção Individual (EPI): Vestimentas retardantes de chama (indumentária ATPV), calçados sem componentes\nmetálicos, luvas de alta tensão e capacete de segurança classe B.\n-\nCondições Impeditivas para Serviços: Critérios de segurança para interrupção de trabalhos (ventos fortes, chuvas e falta de\nvisibilidade).\nMódulo 5: Posturas, Responsabilidades e Legislação\nDocumentação Operacional: Liberação de instalações para serviço e para operação.\n-\nTreinamentos Obrigatórios: Responsabilidades dos trabalhadores, supervisores e empregadores.\n-\nAspectos Legais: Penalidades civis e criminais em caso de descumprimento das normas vigentes.\nMódulo 6: Atendimento a Emergências e Primeiros Socorros\nPlanos de Emergência: Estrutura e fluxos de atendimento em acidentes no SEP.\n-\nTécnicas de Resgate: Resgate em altura (estruturas e postes) e em espaços confinados.\n-\nPrimeiros Socorros Específicos: Reanimação cardiopulmonar (RCP), atendimento a queimaduras elétricas e traumas por queda.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr33-trabalhador",
    "category": "NR-33 Espaços Confinados",
    "name": "NR-33 – Espaços Confinados – Trabalhador e Vigia (16h)",
    "title": "NR33 – SEGURANÇA E SAÚDE NOS TRABALHOS EM ESPAÇOS CONFINADOS – TRABALHADOR E VIGIA",
    "duration": "16 horas",
    "validade": "12 meses",
    "description": "Projeto de treinamento com carga horária de 16 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 33 (NR-33), ABNT NBR 16577 e demais requisitos técnicos aplicáveis.",
    "content": "1. Fundamentos da NR-33.\n2. Conceitos e definições de espaços confinados.\n3. Identificação e classificação dos espaços confinados.\n4. Responsabilidades legais dos envolvidos.\n5. Gestão de riscos em espaços confinados.\n6. Reconhecimento dos riscos físicos, químicos, biológicos, ergonômicos e de acidentes.\n7. Avaliação e monitoramento atmosférico.\n8. Limites de exposição ocupacional.\n9. Instrumentos de detecção de gases e calibração.\n10. Sistemas de ventilação e exaustão.\n11. Permissão de Entrada e Trabalho (PET).\n12. Procedimentos operacionais seguros.\n13. Isolamento e bloqueio de energias perigosas.\n14. Equipamentos de proteção individual e coletiva.\n15. Proteção respiratória.\n16. Comunicação operacional e atribuições do vigia.\n17. Procedimentos de emergência e abandono.\n18. Noções de resgate em espaços confinados.\n19. Primeiros socorros.\n20. Estudos de casos.\n21. Atividades práticas.\n22. Simulado operacional.\n23. Avaliação teórica.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Pedro Henrique Lima Padilha",
      "role": "Instrutor e Técnico em Segurança do Trabalho",
      "registration": "MTE 0122480/SP"
    }
  },
  {
    "id": "nr33-supervisor",
    "category": "NR-33 Espaços Confinados",
    "name": "NR-33 – Espaços Confinados – Supervisor de Entrada (40h)",
    "title": "NR33 - SEGURANÇA E SAÚDE NOS TRABALHOS EM ESPAÇOS CONFINADOS - SUPERVISOR DE ENTRADA",
    "duration": "40 horas",
    "validade": "12 meses",
    "description": "Treinamento com carga horária de 40 horas, conforme a Norma Regulamentadora (NR-33), para Supervisor de Entrada em Espaços Confinados.",
    "content": "1.  Conceitos e definições;\n2. Identificação dos espaços confinados;\n3. Reconhecimento, avaliação e controle de riscos;\n4. Funcionamento dos equipamentos utilizados;\n5. Procedimentos e utilização da Permissão de Entrada e Trabalho (PET);\n6. Critérios de indicação e uso de equipamentos para controle de riscos;\n7. Conhecimentos sobre práticas seguras em espaços confinados;\n8. Legislação de segurança e saúde no trabalho;\n9. Programa de Proteção Respiratória (PPR);\n10. Áreas classificadas;\n11. Noções de resgate e primeiros socorros;\n12. Operações de salvamento;\n13. Atividades práticas.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Pedro Henrique Lima Padilha",
      "role": "Instrutor e Técnico em Segurança do Trabalho",
      "registration": "MTE 0122480/SP"
    }
  },
  {
    "id": "nr18-basico",
    "category": "NR-18 Indústria da Construção",
    "name": "NR-18 – Segurança e Saúde na Indústria da Construção (4h)",
    "title": "NR-18 – SEGURANÇA E SAÚDE NO TRABALHO NA INDÚSTRIA DA CONSTRUÇÃO",
    "duration": "4 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 4 horas, desenvolvido em conformidade com a NR-18 – Condições e Meio Ambiente de Trabalho na Indústria da Construção, e demais requisitos técnicos aplicáveis. Mossoró,",
    "content": "Módulo I:\nIntrodução à NR 18 e o Ambiente de Trabalho (1h)Conceito da NR 18: Objetivos da\nnorma e responsabilidades de empregadores e empregados.Condições e Meio\nAmbiente: Organização do canteiro de obras, áreas de vivência (refeitório, vestiário,\nsanitários) e layout seguro.Planejamento de Segurança: Importância do PGR (Programa\nde Gerenciamento de Riscos) da obra.Direito de Recusa: Situações de risco grave e\niminente na construção civil.\nMódulo II:\nRiscos Inerentes às Atividades (1h)Riscos de Queda: Trabalho em altura,\nperiferias, poços de elevadores e aberturas no piso.Riscos Elétricos:\nInstalações provisórias, extensões, quadros de distribuição e ferramentas\nelétricas.Riscos de Soterramento: Escavações, fundações, fôrmas e\nescoramentos.Riscos com Máquinas e Equipamentos: Gruas, elevadores de\ncarga, betoneiras, serras circulares e ferramentas manuais.Riscos Ambientais:\nRuído, poeira (sílica), vibração, calor e intempéries (chuvas e raios).\nMódulo III:\nMedidas de Proteção Coletiva e Individual (1h)Equipamentos de Proteção Coletiva\n(EPC):Sistemas de proteção contra quedas (guarda-corpo e rodapé).Redes de proteção,\ntelas, tapumes e sinalização de segurança.Linhas de vida e pontos de\nancoragem.Equipamentos de Proteção Individual (EPI):Uso correto, guarda,\nconservação e higienização.Capacete de segurança com jugular.Botinas com biqueira\nde aço.Óculos de proteção, protetor auricular e luvas de raspa/tateis.Cinto de segurança\ntipo paraquedista com talabarte duplo.\nMódulo IV:\nEmergência, Primeiros Socorros e Organização (1h)Procedimentos de Emergência:\nRotas de fuga, alarmes e pontos de encontro no canteiro.Prevenção e Combate a\nIncêndios: Classes de fogo e uso correto de extintores (Água, PQS, CO2).Noções de\nPrimeiros Socorros: Atendimento básico a fraturas, hemorragias, choques elétricos e\ndesmaios.Ordem e Limpeza (5S): Armazenamento correto de materiais, descarte de\nresíduos e desobstrução de vias de circulação.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr18-sinaleiro",
    "category": "NR-18 Indústria da Construção",
    "name": "NR-18 – Sinaleiro / Amarrador de Cargas (8h)",
    "title": "NR-18 – SINALEIRO/AMARRADOR DE CARGAS",
    "duration": "8 horas",
    "validade": "24 meses",
    "description": "treinamento com carga horária de 8 horas, desenvolvido em conformidade com a Norma Regulamentadora NR-18, Norma Regulamentadora NR-11, ABNT NBR 11436 e demais requisitos técnicos aplicáveis às atividades de sinalização, amarração e movimentação de cargas.",
    "content": "Módulo I:\nIntrodução, Legislação e Conceitos Básicos.\n• Normatização aplicada: Estudo da NR 18 (Indústria da Construção), NR 11 (Transporte,\nMovimentação, Armazenagem e Manuseio de Materiais) e o papel da ABNT NBR 11436.\n• Responsabilidades legais: Atribuições, direitos e deveres do sinaleiro/amarrador, do\noperador do equipamento (grua/guindaste) e da empresa.\n• Percepção de riscos: Identificação de perigos na área de movimentação (redes elétricas\naéreas, interferências de solo, edificações vizinhas e condições climáticas adversas como\nventos fortes).\n• EPIs e EPCs específicos: Uso correto de capacete com jugular, luvas de raspa/vaqueta,\ncolete de alta visibilidade e o isolamento de raio de giro/trajetória de carga.\nMódulo II:\nComunicação e Sinalização Padronizada.\n• Sinalização manual (NBR 11436): Estudo detalhado dos gestos universais para comando\nde equipamentos de guindar (subir, baixar, parar, parada de emergência, transladar, girar\nlança, etc.).\n• Comunicação via rádio (Walkie-Talkie): Protocolos de rádio, alfabeto fonético internacional\nbásico, clareza na transmissão, testes de canal e o que fazer em caso de perda ou\ninterferência de sinal.\n• Linha de visibilidade: Posicionamento correto do sinaleiro em relação à carga e à cabine do\noperador. Uso de sinaleiro intermediário (auxiliar) em pontos cegos.\nMódulo III:\nTécnicas de Amarração e Movimentação de Cargas.\n• Estabilidade da carga: Conceitos de centro de gravidade (CG), peso específico dos\nmateriais, equilíbrio e distribuição de forças.\n• Acessórios de içamento: Tipos, capacidades e aplicações de cabos de aço, cintas sintéticas\n(poliéster), eslingas de corrente, manilhas, ganchos e olhais de suspensão.\n• Cálculo prático de capacidade: Influência do ângulo de inclinação das pernas de uma\neslinga (fator de ângulo) na capacidade de carga dos acessórios.\n• Uso de cabos guia (guias de mão): Técnicas para controlar o giro e a oscilação da carga\nsuspensa sem aproximação corporal.\nMódulo IV:\nInspeção de Acessórios e Critérios de Descarte.\n• Inspeção visual diária (Pre-use check): Roteiro de verificação antes de iniciar cada\njornada.\n• Critérios de descarte para cabos de aço: Identificação de arames rompidos, dobras\n(kinks), corrosão e redução de diâmetro.\n• Critérios de descarte para cintas: Cortes laterais, queimaduras por fricção ou\nprodutos químicos, costuras desfeitas e exposição do núcleo de aviso.\n• Critérios de descarte para acessórios rígidos: Desgaste em ganchos e manilhas,\ntrincas, deformações plásticas e ausência de travas de segurança.\nMódulo V:\nPrática Operacional e Simulações.\n• Reconhecimento de campo: Análise do ambiente de trabalho, delimitação de áreas\ne plano de rigging elementar.\n• Checklist prático: Inspeção física, seleção de acessórios adequados para diferentes\ncargas (feixes de aço, fôrmas, caixas de massa) e descarte simulado.\n• Exercícios de amarração: Execução de nós, laçadas (enforcamento, cesto, vertical)\ne balanceamento real do centro de gravidade da carga.\n• Simulação de sinalização em tempo real: Comando de manobras reais ou\nsimuladas utilizando exclusivamente a sinalização manual (NBR 11436) e a\ncomunicação via rádio, contemplando:\n• Içamento e descida controlada.\n• Desvios de obstáculos.\n• Atuação em situações de emergência (comando de parada imediata).",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Arthur Jorge da Silva Freitas",
      "role": "Instrutor / Bombeiro Profissional Civil",
      "registration": "CPF: 241.147.662-00"
    }
  },
  {
    "id": "nr12-seguranca",
    "category": "NR-12 Máquinas e Equipamentos",
    "name": "NR-12 – Segurança no Trabalho em Máquinas e Equipamentos (4h)",
    "title": "NR-12 – SEGURANÇA NO TRABALHO EM MÁQUINAS E EQUIPAMENTOS",
    "duration": "4 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 4 horas, desenvolvido em conformidade com as Normas Regulamentadoras vigentes e requisitos técnicos aplicáveis.",
    "content": "Módulo I: Introdução, Conceitos Gerais e Legislação (1 hora)\nHistórico da NR 12 e objetivos da norma.\nResponsabilidades do empregador e dos trabalhadores.\nConceitos fundamentais de segurança no trabalho com máquinas.\nConceito de zona de perigo e ponto de operação.\nMódulo II: Percepção e Reconhecimento de Riscos (2 horas)\nTipos de riscos associados a máquinas:\nMecânicos: Prensamento, esmagamento, corte, aprisionamento e projeção\nde materiais.\nElétricos: Choque elétrico, curto-circuito e queimaduras.\nOutros: Térmicos, ruído, vibração e ergonomia na operação.\nAnálise de acidentes de trabalho típicos e suas causas estruturais.\nMódulo II: Sistemas de Proteção e Dispositivos de Segurança (2 horas)\nProteções Fixas e Móveis: Conceito, diferenças e quando devem ser\nutilizadas.\nDispositivos de Segurança (Anexo I):\nIntertravamentos, chaves de segurança e cortinas de luz.\nComandos bimanual e pedais de acionamento.\nPrincípio da Falha Segura: Por que nunca burlar ou desativar proteções de\nmáquinas.\nMódulo IV: Procedimentos de Trabalho e Segurança na Manutenção\n(1hora)\nProcedimento Operacional Padrão (POP) e Permissão de Trabalho (PT).\nLOTO (Lockout / Tagout): Bloqueio, sinalização e etiquetagem de energias\nperigosas durante intervenções e manutenção.\nVerificação prévia da máquina antes do uso (checklist diário).\nUso correto de Equipamentos de Proteção Individual (EPIs) e Coletiva (EPCs).\nMódulo V: Parada de Emergência e Procedimentos de Urgência (1 hora)\nDispositivos de parada de emergência: Localização, tipos (botões \"cogumelo\",\ncabos) e funcionamento.\nO que fazer em situações de emergência ou anomalias no funcionamento da\nmáquina.\nNoções básicas de Primeiros Socorros em acidentes com máquinas\n(atendimento inicial e socorro especializado)..\nMódulo VI: Avaliação e Inspeção Prática (1 hora)\nReconhecimento visual dos pontos de risco diretamente na fábrica/oficina ou\natravés de estudos de caso reais.\nAplicação do checklist de segurança.\nAvaliação de fixação de conhecimento (teórica ou prática) e encerramento.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Geraldo Fernandes de Oliveira Junior",
      "role": "Instrutor Técnico Especialista",
      "registration": "MTE0141081/SP"
    }
  },
  {
    "id": "nr06-epi",
    "category": "NR-06 Equipamentos de Proteção Individual",
    "name": "NR-06 – Equipamentos de Proteção Individual – EPI (16h)",
    "title": "NR 06 - EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL – EPI",
    "duration": "16 horas",
    "validade": "24 meses",
    "description": "Treinamento com carga horária de 16 horas, conforme a NR-06, abordando os requisitos para seleção, fornecimento, utilização, conservação, higienização, inspeção, substituição e controle dos Equipamentos de Proteção Individual (EPI), de acordo com a legislação vigente. Mossoró,",
    "content": "1.  Introdução à Norma Regulamentadora NR-06 e aos Equipamentos\nde Proteção Individual (EPI), conceitos, finalidade e importância para\na segurança e saúde no trabalho.\n2.  Legislação aplicável, Certificado de Aprovação (CA), classificação dos\nEPIs e responsabilidades do empregador, do trabalhador, do\nfabricante e do importador.\n3.  Critérios para seleção, fornecimento, utilização, inspeção, guarda,\nhigienização, manutenção, substituição e descarte dos Equipamentos\nde Proteção Individual.\n4. Identificação de riscos, limitações de uso, conservação dos\nequipamentos, registro de fornecimento, controle e rastreabilidade\ndos EPIs.\n5.  Procedimentos de inspeção, identificação de não conformidades,\navaliação das condições de uso e aplicação prática da NR-06.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "inspetor-epi",
    "category": "NR-06 Equipamentos de Proteção Individual",
    "name": "Inspetor Profissional de EPI (16h)",
    "title": "INSPETOR PROFISSIONAL DE EPI",
    "duration": "16 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 16 horas, desenvolvido em conformidade com a NR-06–Equipamentos de Proteção Individual (EPI), NR- 35–Trabalho em Altura, Portaria MTE nº 672/2021, ABNT NBR 17151-1, ABNT NBR 15834, ABNT NBR 15835, ABNT NBR 15836, ABNT NBR 16489, EN 361, EN 354, EN 355, EN 365 e ANSI/ASSP Z359.2 e Z359.14, contemplando os requisitos técnicos para inspeção, utilização, manutenção, rastreabilidade, descarte e gestão de Equipamentos de Proteção Individual contra quedas. quedas. Mossoró,",
    "content": "Módulo I:\nIntrodução, Responsabilidade e Legislação (Teórica) Legislação Nacional: NR-06 (EPIs): Direitos, deveres do\nempregador e do trabalhador, e a importância do Certificado de Aprovação (CA). NR-35 (Trabalho em Altura):\nFoco nas exigências de inspeção inicial, rotineira e periódica (item 35.6.6). Portaria MTE nº 672/2021: Regras para\navaliação de conformidade e comercialização de EPIs no Brasil. Normatização Técnica Brasileira (ABNT): ABNT\nNBR 17151-1, ABNT NBR 15834, ABNT NBR 15835, ABNT NBR 15836: Requisitos para talabartes, cinturões\ntipo paraquedista e dispositivos de retenção de queda. ABNT NBR 16489: Diretrizes para seleção, uso e\nmanutenção de sistemas de proteção individual contra queda (SPIQ). Normativas Internacionais (Referências\nGlobais): Normas Europeias (EN): EN 361 (Cinturões), EN 354/355 (Talabartes/Absorvedores), EN 365\n(Requisitos gerais para instruções de uso, manutenção, inspeção periódica e reparo). Normas Americanas\n(ANSI/ASSP): ANSI Z359.2 e ANSI Z359.14 (Critérios para gerenciamento de programas de proteção contra\nquedas e inspeção de dispositivos autorretráteis). Responsabilidade Legal: A responsabilidade civil e criminal do\ninspetor de EPIs.\nMódulo II:\nO Inspetor de EPI (\"Pessoa Competente\") Definição e papel da Pessoa Competente segundo a ANSI e a EN 365.\nDiferença entre Inspeção Diária (pré-uso) pelo usuário e Inspeção Periódica (anual/semestral) pelo inspetor\nqualificado. A importância da rastreabilidade: números de série, etiquetas de identificação e RFID.\nMódulo III:\nCritérios Técnicos de Inspeção por Categoria de Equipamento (Teórica/Visual) Nesta etapa, o curso detalha o que\nprocurar ao inspecionar cada tipo de componente:\na)\n⁠Equipamentos Têxteis (Cinturões, Talabartes, Cordas, Fitas de Ancoragem)\n- Desgaste por abrasão física, cortes longitudinais e transversais.\n- Danos químicos (contato com ácidos, solventes, tintas).\n- Degradação térmica (queimaduras de solda, exposição excessiva ao calor ou raios UV).\n- Inspeção de costuras estruturais (linhas soltas ou rompidas).\nb. Equipamentos Metálicos (Mosquetões, Freios, Polias, Trava-quedas, Dispositivos de\n- Desgaste por fricção e perda de espessura de material (critério de descarte por desgaste milimétrico).\n- Fissuras, trincas, deformações mecânicas e corrosão (ferrugem/oxidação severa).\n- Funcionamento de travas de segurança, molas e gatilhos.\nc. Equipamentos Dinâmicos e Mecânicos (Trava-quedas retráteis):\n- Verificação do mecanismo de travamento por impacto.\n- Integridade do cabo de aço ou fita retrátil.\n- Indicadores de queda ativos (quando o equipamento já reteve um impacto e deve ser descartado).\nMódulo IV:\nPrática de Inspeção e Registro (Prática e Oficina) Oficina Prática de\nDanos: Análise em sala de aula de amostras reais de equipamentos\ndanificados para detecção de anomalias (estudo de caso visual).\nElaboração de Fichas de Inspeção: Criação e preenchimento de\nchecklists físicos ou digitais de controle. Processo de Reprovação e\nDescarte: Como inutilizar fisicamente o equipamento reprovado (para\nevitar que seja recolocado em uso acidentalmente). Registro de\ndescarte e destinação correta do material.\nMódulo V:\nGestão e Armazenamento de EPIs Boas práticas de estocagem\n(controle de umidade, incidência solar e produtos químicos no\nalmoxarifado). Ciclo de vida e validade dos materiais (vida útil\nrecomendada pelo fabricante vs. validade do CA). Higienização e\nlimpeza recomendadas de acordo com as instruções dos fabricantes\n(evitando solventes agressivos que comprometem fibras têxteis).",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr11-empilhadeira",
    "category": "NR-11 Transporte e Movimentação",
    "name": "NR-11 – Operador de Empilhadeira (16h)",
    "title": "NR-11 – OPERADOR DE EMPILHADEIRA",
    "duration": "16 horas",
    "validade": "12 meses",
    "description": "Treinamento com carga horária de 16 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 11 (NR-11) – Transporte, Movimentação, Armazenagem e Manuseio de Materiais, abordando a operação segura de empilhadeiras e prevenção de acidentes.",
    "content": "1. Legislação aplicável (NR-11 e Código de Trânsito Brasileiro)\n2. Componentes mecânicos, elétricos e hidráulicos do equipamento\n3. Centro de gravidade, estabilidade e capacidade de carga\n4. Inspeção diária de segurança (Checklist de pré-uso)\n5. Manobras operacionais, empilhamento e desempilhamento de cargas\n6. Regras de circulação e operação segura em áreas industriais",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Cezar Augusto Galvão De P. Camêlo",
      "role": "Responsável Técnico / Instrutor (Engenheiro Eletricista)",
      "registration": "CREA-RN 211051104-4"
    }
  },
  {
    "id": "nr11-ponte-rolante",
    "category": "NR-11 Transporte e Movimentação",
    "name": "NR-11 – Operador de Ponte Rolante (16h)",
    "title": "NR 11 OPERADOR DE PONTE ROLANTE",
    "duration": "16 horas",
    "validade": "12 meses",
    "description": "Projeto de treinamento com carga horária de 16 horas, desenvolvido em conformidade com a NR-11 – Transporte, Movimentação, Armazenagem e Manuseio de Materiais, ABNT NBR 8400 (Cálculo de equipamentos para levantamento e movimentação de cargas), ABNT NBR ISO 4309 (Critérios de inspeção e descarte de cabos de aço) e demais requisitos técnicos aplicáveis. Mossoró,",
    "content": "Módulo I:\nLegislação, Normas e Aspectos Legais:Teoria - 2 Horas.Introdução à NR 11\n(requisitos de segurança para movimentação de materiais).Interfaces com a NR 12\n(dispositivos de segurança em máquinas) e NR 26 (sinalização de\nsegurança).Responsabilidade civil e criminal do operador em caso de\nacidentes.Requisitos para habilitação, identificação (crachá com validade de 1 ano) e\nexames médicos periódicos.\nMódulo II:\nO Equipamento e seus Componentes:Teoria - 2 Horas.Conceito, tipos e\nmodelos de Pontes Rolantes (apoiadas, suspensas, pórticos e\nsemipórticos).Componentes mecânicos e elétricos: viga, carro (trolei), talha\nelétrica, freios, moitão, gancho e travas de segurança.Sistemas de comando:\nbotoeiras suspensas, controle remoto (via rádio) e cabines.Dispositivos de\nsegurança: chaves fim de curso, botão de parada de emergência e limitadores\nde carga.\nMódulo III:\nFísica da Carga e Acessórios de Içamento:Teoria - 2 Horas.Princípios físicos: peso da\ncarga, centro de gravidade e cálculo de estabilidade.Estudo e dimensionamento de\nacessórios de amarração (cabos de aço, correntes, cintas sintéticas, manilhas e olhais de\niçamento).Critérios de descarte para cabos de aço e cintas (de acordo com as normas\nABNT NBR ISO 4309 e NBR 15637).Ângulos de inclinação de cabos/cintas e a\nredução da capacidade de carga (tabela de fatores de modo).Utilização de protetores de\ncanto (quebra-canto) para preservar os acessórios.\nMódulo IV:\nProcedimentos de Operação e Segurança:Teoria - 2 Horas.Análise Preliminar de Risco\n(APR) aplicada à área de movimentação.Realização do Checklist diário de pré-operação\n(inspeção visual e funcional).Planejamento do trajeto de movimentação da carga (desvio\nde obstáculos e isolamento da área).Regras de segurança na operação: proibição de\narrastar cargas (tração diagonal), proibição de passar carga sobre pessoas e eliminação do\nefeito pêndulo (balanço).Comunicação e sinalização manual padronizada (padrão\ninternacional/NBR).Noções de combate a incêndio e primeiros socorros em ambiente\nindustrial.\nMódulo V:\nPrática Supervisionada no Equipamento:Prática - 8 Horas.Reconhecimento prático da\nponte rolante, comandos e dispositivos de segurança.Realização do checklist de segurança\nantes da partida.Exercícios práticos sem carga para controle de velocidade e direções\n(translação, transição e elevação).Exercícios práticos de amarração de cargas diversas\nusando cintas e cabos.Técnicas para evitar e anular o efeito pêndulo durante a aceleração e\nfrenagem.Simulação de sinalização visual entre operador e auxiliar (sinaleiro).Operações\ncompletas de içamento, movimentação entre obstáculos e posicionamento preciso da\ncarga.Desligamento seguro do equipamento ao final do turno (estacionamento do carro e\ngancho em posição segura)..",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr11-talha-eletrica",
    "category": "NR-11 Transporte e Movimentação",
    "name": "NR-11 – Operador de Talha Elétrica (16h)",
    "title": "NR 11 OPERADOR DE TALHA ELÉTRICA",
    "duration": "16 horas",
    "validade": "12 meses",
    "description": "Projeto de treinamento com carga horária de 16 horas, desenvolvido em conformidade com as normas ABNT NBR ISO 4309 (Critérios de inspeção e descarte de cabos de aço), ABNT NBR 16147 (Comissionamento, inspeção e manutenção de talhas motorizadas), ABNT NBR ISO 12482 (Monitoramento das condições de guindastes e talhas) e demais requisitos técnicos aplicáveis. Mossoró,",
    "content": "Módulo I: Fundamentos Jurídicos e Normativos (Teoria)\nIntrodução à Segurança na Movimentação de Cargas.\nEstudo da NR 11 (Requisitos de segurança para operação de elevadores, guindastes, transportadores\nindustriais e máquinas transportadoras).\nAspectos da NR 12 aplicados a talhas elétricas (dispositivos de partida, parada de emergência e proteções\nde partes móveis).\nNoções da NR 10 (Segurança contra choques elétricos e arco elétrico em painéis e botoeiras).\nResponsabilidade civil e criminal do operador na prevenção de acidentes de trabalho.\nMódulo II: Componentes e Funcionamento do Equipamento (Teoria)\nTipos de talhas elétricas (talha de corrente vs. talha de cabo de aço).\nPrincipais componentes da talha: motor elétrico, freio eletromagnético, redutor, tambor/guia\nde cabo, gancho de carga e trava de segurança.\nSistemas de translação (trole manual e trole motorizado).\nDispositivos de comando: botoeiras suspensas (pendentes), rádio controle (sem fio) e chaves\nlimite de fim de curso.\nLimites de carga e capacidade nominal do equipamento.\nMódulo III: Acessórios de Rigging e Amarração de Cargas (Teoria)\nIdentificação, seleção e inspeção de acessórios de içamento (conforme NBR 13541 e NBR\n15637):\nCabos de aço e cintas sintéticas (poliéster).\nManilhas, laços, correntes e olhais de suspensão.\nCálculo visual de distribuição de peso e centro de gravidade da carga.\nÂngulos de inclinação na amarração de cargas e seus impactos na capacidade de içamento.\nMódulo IV: Segurança na Operação e Análise de Riscos (Teoria)\nInspeção diária obrigatória antes do início do turno (Checklist): visual e funcional.\nAnálise de Riscos na área de movimentação (trânsito de pedestres, obstáculos físicos,\nredes elétricas aéreas).\nSinalização padrão para movimentação de cargas (comunicação visual entre operador e\nsinaleiro).\nProcedimentos de emergência em caso de pane elétrica, queda de energia ou falha de\nfreio.\nMódulo V: Prática Operacional Supervisionada (Prática)\nRealização do checklist prático de pré-operação.\nManuseio correto da botoeira/controle remoto (evitando o \"efeito pêndulo\").\nTécnicas de elevação, movimentação horizontal e descida suave da carga.\nSimulação de desvios de obstáculos e posicionamento preciso da carga.\nProcedimentos corretos ao desligar e estacionar o equipamento no final do expediente.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr34-trabalho-quente",
    "category": "NR-34 Indústria Naval e a Quente",
    "name": "NR-34 – Segurança para Trabalhos a Quente (8h)",
    "title": "NR-34 – CURSO BÁSICO DE SEGURANÇA PARA TRABALHOS A QUENTE",
    "duration": "8 horas",
    "validade": "12 meses",
    "description": "Projeto de treinamento com carga horária de 08 horas, desenvolvido em conformidade com a Norma Regulamentadora NR-34, Anexo I, e demais requisitos técnicos aplicáveis.",
    "content": "=\nMódulo 01 – Conceitos de Trabalho a Quente\n•\nDefinição de trabalho a quente;\n•\nPrincipais atividades caracterizadas como trabalho a quente;\n•\nSoldagem, corte, esmerilhamento, brasagem e uso de chama aberta;\n•\nPrincipais riscos associados às atividades.\nMódulo 02 – Identificação de Perigos e Avaliação de Riscos\n•\nIdentificação dos perigos relacionados ao trabalho a quente;\n•\nAvaliação e controle dos riscos;\n•\nAnálise Preliminar de Risco – APR;\n•\nMedidas preventivas e controles necessários.\nMódulo 03 – Permissão para Trabalho (PT) / Autorização de Serviço (AS)\n•\nConceito e finalidade;\n•\nRequisitos para emissão e liberação;\n•\nResponsabilidades dos envolvidos;\n•\nCondições para suspensão e encerramento da permissão.\nMódulo 04 – Prevenção de Incêndios e Explosões\n•\nFontes de ignição;\n•\nMateriais combustíveis e inflamáveis;\n•\nControle de gases, vapores e atmosferas perigosas;\n•\nRiscos de incêndio e explosão;\n•\nMedidas de prevenção e controle.\nMódulo 05 – Testes Atmosféricos\n•\nQuando realizar testes atmosféricos;\n•\nIdentificação de atmosferas perigosas;\n•\nMonitoramento de gases e vapores;\n•\nEquipamentos de detecção;\n•\nProcedimentos durante o monitoramento.\nMódulo 06 – Inspeção e Preparação da Área de Trabalho\n•\nIsolamento e sinalização da área;\n•\nRemoção ou proteção de materiais combustíveis;\n•\nInspeção de equipamentos e ferramentas;\n•\nVerificação das condições do local antes do início da atividade.\nMódulo 07 – Equipamentos de Proteção Individual (EPI)\n•\nSeleção e utilização dos EPIs adequados;\n•\nProteção ocular e facial;\n•\nProteção das mãos e do corpo;\n•\nProteção respiratória e auditiva, quando aplicável;\n•\nInspeção, conservação e substituição dos EPIs.\nMódulo 08 – Equipamentos e Ferramentas\n•\nInspeção prévia dos equipamentos;\n•\nCondições de cabos, conexões, mangueiras e acessórios;\n•\nUtilização segura de máquinas de solda, esmerilhadeiras e equipamentos de corte;\n•\nPrevenção de faíscas e projeção de partículas.\nMódulo 09 – Procedimentos de Emergência\n•\nCondutas em caso de princípio de incêndio;\n•\nComunicação e acionamento da emergência;\n•\nEquipamentos de combate a incêndio;\n•\nAbandono e isolamento da área.\nMódulo 10 – Encerramento e Monitoramento Pós-Trabalho\n•\nInspeção da área após o término da atividade;\n•\nRetirada de resíduos e materiais;\n•\nVerificação de pontos quentes, brasas e fontes de ignição;\n•\nMonitoramento após o encerramento, quando necessário;\n•\nLiberação segura da área.\nMódulo 11 – Boas Práticas e Responsabilidades\n•\nResponsabilidades dos trabalhadores e responsáveis pela liberação;\n•\nCumprimento dos procedimentos de segurança;\n•\nComunicação de condições inseguras;\n•\nCondições para interrupção da atividade.\nMódulo 12 – Avaliação de Aprendizagem\n•\nAvaliação teórica dos conhecimentos apresentados no treinamento.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Luciano Lopes Gomes",
      "role": "Instrutor Técnico em Soldagem e Trabalho a Quente",
      "registration": "MTE 001065- RN"
    }
  },
  {
    "id": "brigada-incendio",
    "category": "Incêndio e Emergência",
    "name": "Brigada de Incêndio e Emergência (24h)",
    "title": "BRIGADA DE INCÊNDIO",
    "duration": "24 horas",
    "validade": "12 meses",
    "description": "Projeto de treinamento com carga horária de 24 horas, elaborado de acordo com a ABNT NBR 14276 – Brigada de Incêndio. BOA ESPERANÇ",
    "content": "1. Introdução à Brigada de Emergência;\n2. Aspectos legais, responsabilidades e atribuições da brigada;\n3. Teoria e propagação do fogo;\n4. Classes de incêndio;\n5. Prevenção de incêndios;\n6. Métodos de extinção e agentes extintores;\n7. Equipamentos de Proteção Individual (EPI) e equipamentos de combate\na incêndio;\n8. Sistemas fixos de combate a incêndio;\n9. Abandono de área, rotas de fuga e ponto de encontro;\n10.Organização e procedimentos da Brigada de Emergência;\n11.Primeiros socorros;\n12.Busca, salvamento e resgate – noções básicas;\n13.Produtos perigosos – quando aplicável;\n14.Atividades práticas de combate a princípio de incêndio;\n15.Exercício simulado de abandono de área e emergência;\n16.Avaliação teórica e prática.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Arthur Jorge da Silva Freitas",
      "role": "Instrutor / Bombeiro Profissional Civil",
      "registration": "CPF: 241.147.662-00"
    }
  },
  {
    "id": "combate-incendio",
    "category": "Incêndio e Emergência",
    "name": "Combate a Princípio de Incêndio (4h)",
    "title": "COMBATE A INCÊNDIO",
    "duration": "4 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 04 horas, desenvolvido em conformidade com a Norma Regulamentadora NR-23 Proteção Contra Incêndios e demais requisitos técnicos aplicáveis.",
    "content": "1. Introdução ao treinamento;\n2. Legislação aplicável (NR-23 e normas relacionadas);\n3. Teoria da combustão e propagação do fogo;\n4. Classes de incêndio;\n5. Métodos e agentes extintores;\n6. Equipamentos de combate a incêndio (extintores,\nhidrantes e demais sistemas de proteção);\n7. Medidas de prevenção de incêndios;\n8. Procedimentos em situações de emergência e\nabandono de área;\n9. Treinamento prático de utilização de extintores e\ncombate inicial ao incêndio;\n10. Revisão do conteúdo e avaliação final.",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Geraldo Fernandes de Oliveira Junior",
      "role": "Instrutor Técnico Especialista",
      "registration": "MTE0141081/SP"
    }
  },
  {
    "id": "seguranca-incendio-50h",
    "category": "Incêndio e Emergência",
    "name": "Segurança Contra Incêndio Avançado (50h)",
    "title": "SEGURANÇA CONTRA INCÊNDIO",
    "duration": "50 horas",
    "validade": "24 meses",
    "description": "Projeto de treinamento com carga horária de 50 horas, desenvolvido em conformidade com as Normas Regulamentadoras vigentes e requisitos técnicos aplicáveis.",
    "content": "Módulo 01 – Legislação e Normas\n▪ Legislação de Segurança Contra Incêndio e Pânico.\n▪ Normas Técnicas da ABNT e Instruções Técnicas do CBMBA.\n▪ Responsabilidades legais e medidas preventivas.\nMódulo 02 – Sistemas de Segurança Contra Incêndio\n▪ Sistemas de proteção por extintores.\n▪ Sistemas de hidrantes e mangotinhos.\n▪ Sistemas de detecção, alarme e iluminação de emergência.\n▪ Sinalização de emergência.\nMódulo 03 – Prevenção e Análise de Riscos\n▪ Identificação e avaliação de riscos.\n▪ Medidas de prevenção e proteção contra incêndio.\n▪ Inspeção dos sistemas de segurança.\n▪ Controle de materiais combustíveis.\nMódulo 04 – Planos e Procedimentos de Emergência\n▪ Plano de Emergência Contra Incêndio.\n▪ Rotas de fuga e abandono de área.\n▪ Procedimentos de resposta a emergências.\n▪ Comunicação em situações de emergência.\nMódulo 05 – Atividades Práticas\n▪ Inspeção de sistemas preventivos.\n▪ Identificação de não conformidades.\n▪ Simulados de emergência.\n▪ Avaliação prática.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "primeiros-socorros",
    "category": "Saúde & Emergência Médica",
    "name": "Primeiros Socorros e Suporte Básico (8h)",
    "title": "PRIMEIROS SOCORROS",
    "duration": "8 horas",
    "validade": "24 meses",
    "description": "com carga horária de 08 horas, contemplando conhecimentos teóricos e práticos para atendimento a emergências, conforme NR-07, NR-10, NR-35 e ABNT NBR 14276:2020.",
    "content": "1. Introdução e Avaliação\n2. Princípios e objetivos dos primeiros socorros\n3. Aspectos legais e responsabilidade do socorrista\n4. Análise e segurança da cena do acidente\n5. Avaliação primária e secundária da vítima (sinais vitais)\n6. Acionamento de serviços de emergência (SAMU, Bombeiros)\n7. Suporte Básico de Vida (SBV)\n8. Reconhecimento de Parada Cardiorrespiratória (PCR)\n9. Técnicas de Ressuscitação Cardiopulmonar (RCP) em adultos, crianças e\nbebês\n10. Uso de Desfibrilador Externo Automático (DEA)\n11. Atendimento para obstrução de vias aéreas por corpo estranho (Engasgo /\nManobra de Heimlich)\n12. Trauma e Lesões Físicas\n13. Controle de hemorragias externas e uso de torniquetes\n14. Identificação e manejo do estado de choque\n15. Fraturas, entorses, luxações e técnicas de imobilização com talas\n16. Queimaduras (1º, 2º e 3º graus) e classificação de gravidade\n17. Ferimentos, cortes e realização de curativos\n18. Emergências Clínicas e Ambientais\n19. Desmaios, lipotimias e crises convulsivas\n20. Infarto agudo do miocárdio e Acidente Vascular Encefálico (AVE)\n21. Intoxicações, envenenamentos e picadas de animais peçonhentos\n22. Afogamentos e emergências térmicas (insolação, intermação)",
    "modelType": "modelo1",
    "defaultInstructor": {
      "name": "Geraldo Fernandes de Oliveira Junior",
      "role": "Instrutor Técnico Especialista",
      "registration": "MTE0141081/SP"
    }
  },
  {
    "id": "aph-100h",
    "category": "Saúde & Emergência Médica",
    "name": "Atendimento Pré-Hospitalar - APH (100h)",
    "title": "ATENDIMENTO PRÉ-HOSPITALAR (APH)",
    "duration": "100 horas",
    "validade": "24 meses",
    "description": "Treinamento realizado na modalidade presencial, com carga horária de 100 (cem) horas, compreendendo atividades teóricas e práticas previstas no conteúdo programático constante no verso deste certificado, desenvolvido de acordo com as diretrizes do Atendimento Pré-Hospitalar (APH), a Portaria GM/MS nº 2.048/2002 e a legislação aplicável. Mossoró,",
    "content": "Módulo 01 – Fundamentos do Atendimento Pré-Hospitalar\n▪\nConceitos de urgência, emergência e Atendimento Pré-\nHospitalar (APH).\n▪\nLegislação aplicada ao APH.\n▪\nBiossegurança, Equipamentos de Proteção Individual (EPI) e\nsegurança do socorrista.\n▪\nAvaliação e segurança da cena.\n▪\nCadeia de sobrevivência e acionamento dos serviços de\nemergência.\nMódulo 02 – Avaliação e Atendimento Inicial da Vítima\n▪\nAvaliação primária (XABCDE).\n▪\nAvaliação secundária e histórico da vítima.\n▪\nIdentificação de sinais e sintomas.\n▪\nMonitorização dos sinais vitais.\n▪\nTécnicas de abordagem e estabilização inicial.\nMódulo 03 – Suporte Básico de Vida (SBV)\n▪\nCadeia de sobrevivência.\n▪\nRessuscitação Cardiopulmonar (RCP).\n▪\nUtilização do Desfibrilador Externo Automático (DEA).\n▪\nDesobstrução de vias aéreas por corpo estranho (OVACE).\n▪\nAtendimento ao adulto, paciente pediátrico e lactente.\n▪\nSimulações práticas de atendimento.\nMódulo 04 – Emergências Clínicas\n▪\nInfarto Agudo do Miocárdio (IAM) e Acidente Vascular Cerebral\n(AVC).\n▪\nConvulsões e alterações neurológicas.\n▪\nHipoglicemia e emergências metabólicas.\n▪\nChoque e reações alérgicas.\n▪\nEmergências respiratórias.\n▪\nIntoxicações e envenenamentos.\nMódulo 05 – Emergências Traumáticas\n▪\nControle de hemorragias e estado de choque.\n▪\nFerimentos, amputações e eviscerações.\n▪\nQueimaduras térmicas, químicas e elétricas.\n▪\nTraumas musculoesqueléticos: fraturas, luxações e\nentorses.\n▪\nTrauma cranioencefálico, raquimedular e torácico.\n▪\nTécnicas de imobilização e estabilização.\nMódulo 06 – Resgate e Transporte de Vítimas\n▪\nTécnicas de remoção e transporte.\n▪\nUtilização de prancha longa, maca e equipamentos de\nresgate.\n▪\nAtendimento em locais de difícil acesso.\n▪\nTransporte seguro de vítimas.\n▪\nResgate em ambientes de risco.\nMódulo 07 – Atendimento em Situações Especiais\n▪\nAtendimento a acidentes de trabalho.\n▪\nEmergências em trabalho em altura (NR-35).\n▪\nAtendimento em espaços confinados (NR-33).\n▪\nChoque elétrico e acidentes com múltiplas vítimas.\n▪\nTriagem e organização do atendimento.\nMódulo 08 – Gestão, Simulados e Avaliação\n▪\nComunicação com os serviços de emergência (SAMU 192\ne Corpo de Bombeiros Militar 193).\n▪\nOrganização das equipes de resposta.\n▪\nSimulados integrados de atendimento.\n▪\nAvaliação teórica e prática.",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Leiliana Nunes de Lima Fernandes",
      "role": "Coordenadora Técnica / Instrutora de Saúde & APH",
      "registration": "Coren RN 333018"
    }
  },
  {
    "id": "tecnicas-ensino",
    "category": "Pedagogia & Multiplicadores",
    "name": "Técnicas de Ensino – Formação de Multiplicadores (40h)",
    "title": "TÉCNICAS DE ENSINO (FORMAÇÃO DE MULTIPLICADORES)",
    "duration": "40 horas",
    "validade": "24 meses",
    "description": "Com carga horária total de 40 horas, o treinamento atende rigorosamente aos critérios pedagógicos, andragógicos e de proficiência exigidos pelas regulamentações vigentes. Em conformidade com a NR-01 (Portaria MTE nº 1.417), Instruções Técnicas dos Corpos de Bombeiros Militares, Norma Regulamentar NFPA 1041 e ANSI/ASSP Z490.1. Mossoró,",
    "content": "MÓDULO I: FUNDAMENTOS DA APRENDIZAGEM DE ADULTOS (ANDRAGOGIA) - 8H\nPrincípios da Andragogia (Malcolm Knowles). Diferenças essenciais entre Pedagogia e Andragogia. Estilos de aprendizagem (Visual, Auditivo e\nCinestésico). Barreiras psicossociais na aprendizagem de adultos e técnicas de superação.\nMÓDULO II: PLANEJAMENTO DIDÁTICO E ESTRUTURAÇÃO DE AULA - 10H\nDesenho Instrucional focado em conformidade técnica. Objetivos de Aprendizagem através da Taxonomia de Bloom (Cognitivo, Psicomotor e\nAfetivo). Elaboração de Planos de Aula, cronogramas e gestão do tempo de exposição.\nMÓDULO III: METODOLOGIAS ATIVAS E RECURSOS TECNOLÓGICOS - 8H\nOratória e Comunicação assertiva: postura corporal, tom de voz e eliminação de vícios. Métodos ativos: Aprendizagem Baseada em Problemas\n(PBL), estudos de caso e simulações. Diretrizes para EAD e Semipresencial (Anexo II da NR-01).\nMÓDULO IV: GESTÃO DE GRUPOS E DINÂMICAS DE FACILITAÇÃO - 6H\nLiderança em sala de aula e empatia didática. Gerenciamento de comportamentos difíceis ou dispersos. Técnicas de quebra-gelo, moderação\nde debates e fornecimento de feedback construtivo.\nMÓDULO V: PROCESSOS DE AVALIAÇÃO E REGISTRO DOCUMENTAL - 4H\nAvaliações Diagnóstica, Formativa e Somativa. Critérios objetivos para testes teóricos e práticos de campo. Rastreabilidade legal: listas de\npresença, relatórios técnicos de treinamento e guarda de acervo.\nMÓDULO VI: PRÁTICA DE ENSINO (MICROENSINO) E AVALIAÇÃO PRÁTICA - 4H\nApresentação real de mini-aula (10-15 min) por participante com tema técnico específico. Avaliação cruzada por banca docente. Construção de\nPlano de Desenvolvimento Individual (PDI).",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr01-gro-pgr",
    "category": "Normas Regulamentadoras Gerais",
    "name": "NR-01 – Disposições Gerais e Gerenciamento de Riscos (GRO/PGR)",
    "title": "NR-01 – GERENCIAMENTO DE RISCOS OCUPACIONAIS (GRO / PGR)",
    "duration": "4 horas",
    "validade": "24 meses",
    "description": "Treinamento com carga horária de 4 horas, em conformidade com a NR-01 – Disposições Gerais e Gerenciamento de Riscos Ocupacionais, Portaria SEPRT nº 6.730/2020.",
    "content": "1. Campo de aplicação e princípios gerais da NR-01\n2. Identificação de perigos e inventário de riscos ocupacionais (GRO/PGR)\n3. Medidas preventivas, hierarquia de controle e plano de ação\n4. Direitos e deveres na gestão de segurança e saúde no trabalho\n5. Comunicação de incidentes e análise preliminar de acidentes",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr05-cipa",
    "category": "Normas Regulamentadoras Gerais",
    "name": "NR-05 – CIPA - Prevenção de Acidentes e Assédio (20h)",
    "title": "NR-05 – CIPA - PREVENÇÃO DE ACIDENTES E COMBATE AO ASSÉDIO",
    "duration": "20 horas",
    "validade": "12 meses",
    "description": "Treinamento com carga horária de 20 horas, desenvolvido em conformidade com a Norma Regulamentadora nº 05 (NR-05), Lei nº 14.457/2022 e Portaria MTP nº 4.219/2022.",
    "content": "1. Estudo do ambiente, condições de trabalho e riscos operacionais\n2. Metodologia de investigação e análise de acidentes e doenças ocupacionais\n3. Prevenção e combate ao assédio sexual e a outras formas de violência no ambiente de trabalho\n4. Noções sobre acidentes, primeiros socorros e medidas preventivas de saúde ocupacional\n5. Campanhas de segurança, SIPAT, Mapa de Riscos e reuniões ordinárias",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "nr20-intermediario",
    "category": "Inflamáveis e Combustíveis",
    "name": "NR-20 – Segurança com Inflamáveis e Combustíveis (16h)",
    "title": "NR-20 – SEGURANÇA E SAÚDE NO TRABALHO COM INFLAMÁVEIS E COMBUSTÍVEIS",
    "duration": "16 horas",
    "validade": "24 meses",
    "description": "Treinamento com carga horária de 16 horas, conforme a NR-20 – Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis, classe II/III.",
    "content": "1. Inflamáveis: propriedades, perigos e riscos químicos\n2. Instalações de transferência e estocagem de combustíveis e líquidos inflamáveis\n3. Análise preliminar de riscos e métodos de controle operacional\n4. Proteção contra incêndios em tanques, tubulações e áreas classificadas\n5. Resposta a emergências com vazamentos, derramamentos e princípios de fogo",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  },
  {
    "id": "direcao-defensiva",
    "category": "Operacional & Trânsito",
    "name": "Direção Defensiva e Prevenção de Sinistros no Trânsito (8h)",
    "title": "DIREÇÃO DEFENSIVA E SEGURANÇA VEICULAR",
    "duration": "8 horas",
    "validade": "24 meses",
    "description": "Treinamento com carga horária de 8 horas, contemplando as diretrizes do Código de Trânsito Brasileiro (CTB), Resoluções do CONTRAN e técnicas avançadas de prevenção de acidentes viários.",
    "content": "1. Conceitos de Direção Defensiva e Código de Trânsito Brasileiro (CTB)\n2. Condições adversas (tempo, luz, trânsito, via, veículo e condutor)\n3. Distância de segurança, tempo de percepção, reação e frenagem\n4. Cuidados especiais com pedestres, motociclistas, ciclistas e veículos pesados\n5. Inspeção preventiva diária de veículos (Checklist de segurança) e ergonomia veicular",
    "modelType": "modelo2",
    "defaultInstructor": {
      "name": "Eider Gomes do Nascimento",
      "role": "Instrutor e Responsável Técnico",
      "registration": "MTE0009995/RN"
    }
  }
];
