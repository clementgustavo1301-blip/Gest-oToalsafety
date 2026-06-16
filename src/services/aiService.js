import { executeDBAction } from './dbAgent';

const SYSTEM_PROMPT = "Seu nome é EcoIA, você é uma Inteligência Artificial Especialista em Segurança e Saúde do Trabalho (SST). Você agora possui AUTONOMIA TOTAL para ler e escrever no banco de dados do sistema. Sempre que o usuário pedir para listar, buscar, adicionar, alterar ou deletar alguma empresa, funcionário, contrato, PGR, PCMSO, ou laudo, VOCÊ DEVE usar a ferramenta de banco de dados (`database_operation`) para executar a ação real e confirmar para o usuário o que foi feito. \n\nREGRAS CRÍTICAS DE BANCO DE DADOS:\n1. Se você for criar uma empresa e receber um erro de 'duplicate key value' (CNPJ duplicado), NÃO PARE! Isso significa que a empresa já existe. Faça um 'select' na tabela 'companies' filtrando pelo 'cnpj' para descobrir o 'id' da empresa já existente, e então continue salvando os contratos e entregáveis usando esse ID.\n2. Para cadastrar um fluxo completo (Grupo -> Empresa -> Contrato -> Entregáveis), você pode e deve usar a ferramenta sequencialmente quantas vezes for necessário.\n\nSeja sempre profissional, concisa e clara. Você faz parte do sistema Gestão TotalSafety.";

export const sendMessageToAI = async (messagesHistory) => {
  const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (openAiKey) {
    return await callOpenAI(openAiKey, messagesHistory);
  } else if (geminiKey) {
    return await callGemini(geminiKey, messagesHistory);
  } else {
    throw new Error('Nenhuma chave de API configurada. Adicione VITE_OPENAI_API_KEY ou VITE_GEMINI_API_KEY no arquivo .env.local e reinicie o servidor.');
  }
};

const callOpenAI = async (apiKey, messagesHistory) => {
  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messagesHistory.map(m => ({
      role: m.role,
      content: m.text
    }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro na comunicação com a API da OpenAI.');
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const dbToolDeclaration = {
  functionDeclarations: [
    {
      name: "database_operation",
      description: "Executa uma operação no banco de dados Supabase (select, insert, update, delete). OBRIGATÓRIO usar isso para alterar ou buscar dados a pedido do usuário.",
      parameters: {
        type: "OBJECT",
        properties: {
          table: { type: "STRING", description: "Nome exato da tabela no banco. Use SOMENTE estas opções: 'groups' (grupos de empresas), 'companies' (empresas), 'trainings' (treinamentos), 'contracts' (contratos) ou 'deliverables' (laudos, programas, entregáveis)" },
          action: { type: "STRING", description: "A ação a ser executada: select, insert, update ou delete" },
          data: { type: "OBJECT", description: "Colunas exatas permitidas por tabela: groups (name), companies (group_id, name, cnpj, contact, phone), trainings (company_id, deliverable_id, title, date, time, status, instructor, participants), contracts (company_id, contract_number, description, start_date, end_date, status, value, file_path), deliverables (company_id, contract_id, title, type, status, due_date, validity_date, delivered_date, file_name, reason). NÃO INVENTE COLUNAS COMO 'address'. Deixe vazio para select/delete." },
          filters: { type: "OBJECT", description: "Objeto com filtros essenciais para select, update ou delete (ex: { id: 1 }). Deixe vazio para insert." }
        },
        required: ["table", "action"]
      }
    }
  ]
};

const callGemini = async (apiKey, messagesHistory) => {
  // Converte o histórico para o formato do Gemini
  let contents = messagesHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  let maxTurns = 15; // Limite alto para permitir que a IA crie vários registros em sequência
  
  while (maxTurns > 0) {
    maxTurns--;
    
    let response;
    let retries = 3;
    while (retries > 0) {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: {
            role: "system",
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: contents,
          tools: [dbToolDeclaration],
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (response.status === 503 || response.status === 429) {
        retries--;
        if (retries > 0) {
          // O Google geralmente pede para esperar uns 15~20 segundos quando a cota gratuita estoura
          const waitTime = response.status === 429 ? 20000 : 5000;
          console.warn(`[EcoIA] Limite do Google atingido (${response.status}). Pausando o processamento por ${waitTime/1000}s para recuperar a cota gratuita...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
      }
      break;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Erro na comunicação com a API do Google Gemini. ' + response.statusText);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Sem resposta do Gemini.');
    }

    const firstCandidate = data.candidates[0];
    const parts = firstCandidate.content?.parts || [];
    
    // Verifica se a IA decidiu chamar a ferramenta de banco de dados
    const functionCallPart = parts.find(p => p.functionCall);
    
    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      
      // Salva a decisão da IA no histórico temporário da conversa
      contents.push({
        role: "model",
        parts: [{ functionCall: { name, args } }]
      });

      if (name === "database_operation") {
        const { table, action, data: dbData, filters } = args;
        
        // Executa a ação no Supabase usando o dbAgent
        const result = await executeDBAction(table, action, dbData, filters);
        
        // Devolve o resultado pra IA pra ela gerar o texto final
        contents.push({
          role: "user", // A resposta da function vem como user (ou function) no Gemini
          parts: [{
            functionResponse: {
              name: "database_operation",
              response: { name: "database_operation", content: result }
            }
          }]
        });
        
        // Pausa de 3 segundos "forçada" para não estourar o limite de 20 Requisições por Minuto do Google Gratuito
        await new Promise(r => setTimeout(r, 3000));
        
        // Continua o loop para fazer uma nova requisição com os dados do banco
        continue;
      }
    }

    // Se não teve function call, ou se já terminou, retorna o texto
    const textPart = parts.find(p => p.text);
    if (textPart) {
      return textPart.text;
    }
    
    throw new Error('Formato de resposta inesperado do Gemini (sem texto e sem função).');
  }

  throw new Error('A IA excedeu o número máximo de operações sequenciais no banco.');
};
