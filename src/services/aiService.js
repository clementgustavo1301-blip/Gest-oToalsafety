import { executeDBAction, getAgendaData } from './dbAgent.js';

/**
 * Constrói o System Prompt com contexto temporal preciso (data de hoje, dia da semana, mês, ano)
 * e diretrizes detalhadas de atendimento e precisão para agendas e banco de dados.
 */
export const getSystemPrompt = () => {
  const now = new Date();
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dayOfWeek = dayNames[now.getDay()];
  const currentMonthName = monthNames[now.getMonth()];
  const currentMonthNum = pad(now.getMonth() + 1);
  const currentYear = now.getFullYear();

  // Início e fim da semana atual (Domingo a Sábado)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfWeekStr = `${startOfWeek.getFullYear()}-${pad(startOfWeek.getMonth() + 1)}-${pad(startOfWeek.getDate())}`;

  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
  const endOfWeekStr = `${endOfWeek.getFullYear()}-${pad(endOfWeek.getMonth() + 1)}-${pad(endOfWeek.getDate())}`;

  return `Seu nome é EcoIA, você é a Inteligência Artificial Especialista em Segurança e Saúde do Trabalho (SST) do sistema Gestão TotalSafety.

⏰ CONTEXTO TEMPORAL OFICIAL DO SISTEMA (REFERÊNCIA OBRIGATÓRIA):
- Data de Hoje: ${todayStr} (${dayOfWeek}, ${now.getDate()} de ${currentMonthName} de ${currentYear})
- Ano Atual: ${currentYear}
- Mês Atual: ${currentMonthNum} (${currentMonthName})
- Semana Atual: de ${startOfWeekStr} até ${endOfWeekStr}
Use SEMPRE esta data como ponto de partida para interpretar "hoje", "amanhã", "ontem", "esta semana", "neste mês", "próximos dias", etc.

📅 DIRETRIZES DE MÁXIMA PRECISÃO PARA AGENDAS E CALENDÁRIO:
1. ONDE ESTÃO AS AGENDAS NO SISTEMA:
   - A tabela principal de agendas/calendário do sistema é a tabela 'trainings'. Nela estão registrados TODOS os tipos de compromissos:
     * Treinamentos (NRs, CIPA, Primeiros Socorros, Trabalho em Altura, etc.)
     * Palestras e Ações de Saúde (Setembro Amarelo, Outubro Rosa, etc.)
     * Visitas Técnicas, Inspeções de Segurança e DDS (Diálogo Diário de Segurança)
     * Reuniões de alinhamento e monitoramentos ambientais
   - A tabela 'ipa_campaigns' contém campanhas e ações de saúde ocupacional da clínica.
   - A tabela 'deliverables' contém laudos, programas e entregáveis técnicos com prazo ou agendados.

2. COMO CONSULTAR AGENDAS COM PRECISÃO:
   - SEMPRE que o usuário perguntar sobre o que tem agendado, qual a agenda de hoje, da semana, do mês, de uma empresa ou de um responsável, VOCÊ DEVE CHAMAR A FERRAMENTA 'get_agenda'.
   - Para agendamentos de hoje: use period: 'today'.
   - Para agendamentos de amanhã: use period: 'tomorrow'.
   - Para agendamentos desta semana: use period: 'this_week'.
   - Para agendamentos deste mês: use period: 'this_month'.
   - Para agendamentos futuros/próximos: use period: 'upcoming'.
   - Para filtrar por empresa (ex: "Fix Metais", "Sal Garça", "Beira Rio"): passe o nome em 'company_name'.
   - Para filtrar por instrutor/técnico (ex: "Adeylton", "Pedro Praxedes", "Caio Vinicius", "Nailton"): passe o nome em 'responsible_name'.
   - Para filtrar por status: 'agendado', 'concluido', 'adiado' ou 'all'.

3. COMO APRESENTAR AS AGENDAS AO USUÁRIO:
   - Apresente os eventos agrupados cronologicamente por data.
   - Para cada evento, exiba com clareza:
     * 📅 Data e Dia da Semana (ex: 27/10/2026 - Terça-feira)
     * ⏰ Horário (ex: 07:00 - 10:00)
     * 📌 Título / Tipo (ex: Visita Técnica, DDS, Outubro Rosa, Treinamento NR-35)
     * 🏢 Empresa atendida (sempre nome legível, NUNCA UUIDs)
     * 👤 Responsável / Instrutor (sempre o nome da pessoa)
     * 📊 Status (✅ Concluído, ⏳ Agendado, ⚠️ Adiado, ❌ Não Feito)
     * 📝 Descrição ou Observações (se houver)
   - Inclua no início ou no fim um resumo dinâmico (ex: "📋 Encontrei 2 agendamentos previstos para hoje: 2 agendados").

🗄️ AUTONOMIA NO BANCO DE DADOS:
Você possui autonomia para executar consultas e alterações reais no Supabase usando 'get_agenda' e 'database_operation'. Sempre que o usuário pedir para listar, buscar, adicionar, alterar ou deletar alguma empresa, agendamento, treinamento, funcionário, contrato ou laudo, VOCÊ DEVE usar a ferramenta real e confirmar o resultado.
- NUNCA exiba IDs internos (UUIDs) para o usuário final; exiba sempre os nomes correspondentes (Empresa: \`companies.name\` | Responsável: \`profiles.name\`).
- Se for criar uma empresa e receber erro de 'duplicate key value' (CNPJ duplicado), faça um select na tabela 'companies' pelo CNPJ para pegar o ID já existente e continue.

REGRAS DE FORMATAÇÃO DE RESPOSTAS (CRÍTICO):
1. DINÂMICA E TREINAMENTO: Suas respostas devem ser dinâmicas, didáticas e bem estruturadas. Evite blocos gigantes de texto corrido.
2. MARKDOWN OBRIGATÓRIO: Use negrito para títulos e empresas, listas (- ou 1.) e tabelas para múltiplos itens.
3. EMOJIS: Use emojis contextuais (📅, ⏰, 🏢, 👤, ✅, ⚠️, 📄).
4. ESPAÇAMENTO: Pule linhas entre seções e itens para garantir excelente legibilidade.`;
};

/**
 * Obtém as credenciais de API configuradas no ambiente ou no localStorage.
 */
export const getApiCredentials = () => {
  const isUseful = (k) => typeof k === 'string' && k.trim() !== '' && k !== 'COLE_AQUI' && k !== 'your_api_key_here';

  let localEco = null;
  let localOpenAI = null;
  let localGemini = null;

  try {
    if (typeof localStorage !== 'undefined') {
      localEco = localStorage.getItem('ecoia_api_key');
      localOpenAI = localStorage.getItem('openai_api_key');
      localGemini = localStorage.getItem('gemini_api_key');
    }
  } catch (e) {
    console.warn('Não foi possível acessar localStorage:', e);
  }

  const envOpenAI = import.meta.env.VITE_OPENAI_API_KEY;
  const envGemini = import.meta.env.VITE_GEMINI_API_KEY;

  if (isUseful(localEco)) {
    const key = localEco.trim();
    return { key, provider: key.startsWith('sk-') ? 'openai' : 'gemini' };
  }
  if (isUseful(localOpenAI)) {
    return { key: localOpenAI.trim(), provider: 'openai' };
  }
  if (isUseful(localGemini)) {
    return { key: localGemini.trim(), provider: 'gemini' };
  }
  if (isUseful(envOpenAI)) {
    return { key: envOpenAI.trim(), provider: 'openai' };
  }
  if (isUseful(envGemini)) {
    return { key: envGemini.trim(), provider: 'gemini' };
  }

  return { key: null, provider: null };
};

export const sendMessageToAI = async (messagesHistory) => {
  const { key, provider } = getApiCredentials();

  if (!key) {
    throw new Error('Nenhuma chave de API configurada. Adicione sua chave do Google Gemini ou OpenAI em Configurações > Integração IA ou no arquivo .env.local.');
  }

  if (provider === 'openai') {
    return await callOpenAI(key, messagesHistory);
  } else {
    return await callGemini(key, messagesHistory);
  }
};

const openAITools = [
  {
    type: "function",
    function: {
      name: "get_agenda",
      description: "Busca com ALTA PRECISÃO os dados de agendas, agendamentos, treinamentos, visitas técnicas, DDS, palestras e campanhas no sistema. Use SEMPRE que o usuário perguntar sobre a agenda de hoje, amanhã, da semana, do mês, de uma empresa específica ou de um responsável.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: ["today", "tomorrow", "yesterday", "this_week", "next_week", "this_month", "next_month", "upcoming", "custom", "all"],
            description: "Período da busca: 'today' (hoje), 'tomorrow' (amanhã), 'this_week' (esta semana), 'this_month' (este mês), 'upcoming' (futuros a partir de hoje)"
          },
          date_from: { type: "string", description: "Data inicial no formato YYYY-MM-DD" },
          date_to: { type: "string", description: "Data final no formato YYYY-MM-DD" },
          month: { type: "integer", description: "Mês de 1 a 12 (ex: 10 para outubro)" },
          year: { type: "integer", description: "Ano com 4 dígitos (ex: 2026)" },
          company_name: { type: "string", description: "Nome ou parte do nome da empresa para filtrar" },
          responsible_name: { type: "string", description: "Nome do instrutor ou técnico responsável" },
          status: { type: "string", enum: ["all", "agendado", "concluido", "adiado", "nao_feito"], description: "Filtrar por status" },
          include_campaigns: { type: "boolean", description: "Se inclui eventos e ações de saúde IPA (padrão true)" },
          limit: { type: "integer", description: "Quantidade máxima de registros (padrão 50)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "database_operation",
      description: "Executa operações no banco de dados Supabase (select, insert, update, delete) para empresas, treinamentos, contratos, entregáveis e campanhas.",
      parameters: {
        type: "object",
        properties: {
          table: {
            type: "string",
            enum: ["groups", "companies", "trainings", "contracts", "deliverables", "ipa_campaigns"],
            description: "Nome exato da tabela no banco"
          },
          action: {
            type: "string",
            enum: ["select", "insert", "update", "delete"],
            description: "Ação a ser executada"
          },
          data: {
            type: "object",
            description: "Dados para insert ou update"
          },
          filters: {
            type: "object",
            description: "Filtros para select, update ou delete (ex: { id: 1 }, { company_name: 'Fix' }, { date_from: '2026-10-01' })"
          }
        },
        required: ["table", "action"]
      }
    }
  }
];

const callOpenAI = async (apiKey, messagesHistory) => {
  const systemPrompt = getSystemPrompt();

  let formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messagesHistory.map(m => ({
      role: m.role,
      content: m.text
    }))
  ];

  let maxTurns = 12;

  while (maxTurns > 0) {
    maxTurns--;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formattedMessages,
        tools: openAITools,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Erro na comunicação com a API da OpenAI.');
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) {
      throw new Error('Sem resposta da OpenAI.');
    }

    // Se houve tool_calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      formattedMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch {
          fnArgs = {};
        }

        let result;
        if (fnName === 'get_agenda') {
          result = await getAgendaData(fnArgs);
        } else if (fnName === 'database_operation') {
          const { table, action, data: dbData, filters } = fnArgs;
          result = await executeDBAction(table, action, dbData, filters);
        } else {
          result = { error: `Função desconhecida: ${fnName}` };
        }

        formattedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      continue;
    }

    if (message.content) {
      return message.content;
    }

    throw new Error('Formato de resposta inesperado da OpenAI.');
  }

  throw new Error('A IA excedeu o limite de chamadas de ferramentas.');
};

const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "get_agenda",
        description: "Busca com ALTA PRECISÃO os dados de agendas, agendamentos, treinamentos, visitas técnicas, DDS, palestras e campanhas no sistema. Use SEMPRE que o usuário perguntar sobre o que tem agendado hoje, amanhã, nesta semana, no mês, para uma empresa específica ou para um responsável.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              description: "Período da busca: 'today' (hoje), 'tomorrow' (amanhã), 'yesterday' (ontem), 'this_week' (esta semana), 'next_week' (próxima semana), 'this_month' (este mês), 'next_month' (próximo mês), 'upcoming' (futuros a partir de hoje) ou 'custom' (datas personalizadas)"
            },
            date_from: { type: "STRING", description: "Data inicial no formato YYYY-MM-DD (opcional se usar period)" },
            date_to: { type: "STRING", description: "Data final no formato YYYY-MM-DD (opcional se usar period)" },
            month: { type: "INTEGER", description: "Mês numérico de 1 a 12 (ex: 10 para outubro)" },
            year: { type: "INTEGER", description: "Ano com 4 dígitos (ex: 2026)" },
            company_name: { type: "STRING", description: "Nome ou parte do nome da empresa atendida para filtrar" },
            responsible_name: { type: "STRING", description: "Nome do instrutor ou técnico responsável para filtrar" },
            status: { type: "STRING", description: "Filtrar por status: 'agendado', 'concluido', 'adiado', 'nao_feito' ou 'all' (padrão 'all')" },
            include_campaigns: { type: "BOOLEAN", description: "Se deve incluir também eventos de campanhas e ações IPA (padrão: true)" },
            limit: { type: "INTEGER", description: "Quantidade máxima de registros a retornar (padrão: 50)" }
          }
        }
      },
      {
        name: "database_operation",
        description: "Executa operações gerais no banco de dados Supabase (select, insert, update, delete). Use para alterar dados ou fazer consultas personalizadas.",
        parameters: {
          type: "OBJECT",
          properties: {
            table: {
              type: "STRING",
              description: "Tabela no banco: 'groups' (grupos), 'companies' (empresas), 'trainings' (agendamentos/treinamentos), 'contracts' (contratos), 'deliverables' (laudos/programas) ou 'ipa_campaigns' (campanhas IPA)"
            },
            action: { type: "STRING", description: "Ação: 'select', 'insert', 'update' ou 'delete'" },
            data: { type: "OBJECT", description: "Objeto com os dados para inserção ou atualização" },
            filters: { type: "OBJECT", description: "Filtros para select/update/delete (suporta id, date_from, date_to, month, company_name, responsible_name, status, etc.)" }
          },
          required: ["table", "action"]
        }
      }
    ]
  }
];

const callGemini = async (apiKey, messagesHistory) => {
  const systemPrompt = getSystemPrompt();

  let contents = messagesHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  const lastMessage = messagesHistory[messagesHistory.length - 1]?.text || '';
  const isComplex = lastMessage.includes('[CONTEÚDO DO DOCUMENTO]') || lastMessage.length > 300;

  // Lista de modelos resilientes
  const candidateModels = isComplex
    ? ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash']
    : ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];

  let activeModelIndex = 0;
  let maxTurns = 15;

  while (maxTurns > 0) {
    maxTurns--;

    const currentModel = candidateModels[activeModelIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

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
            parts: [{ text: systemPrompt }]
          },
          contents: contents,
          tools: geminiTools,
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (response.status === 503 || response.status === 429) {
        retries--;
        if (retries > 0) {
          const waitTime = response.status === 429 ? 15000 : 4000;
          console.warn(`[EcoIA] Limite atingido (${response.status}). Aguardando ${waitTime / 1000}s para retentar...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
      }
      break;
    }

    // Se o modelo não foi encontrado (404), tenta o próximo modelo da lista
    if (response.status === 404 && activeModelIndex < candidateModels.length - 1) {
      console.warn(`[EcoIA] Modelo ${currentModel} retornou 404. Alternando para ${candidateModels[activeModelIndex + 1]}...`);
      activeModelIndex++;
      maxTurns++;
      continue;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro na comunicação com a API do Google Gemini (${response.statusText}).`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Sem resposta do Gemini.');
    }

    const firstCandidate = data.candidates[0];
    const parts = firstCandidate.content?.parts || [];

    const functionCallPart = parts.find(p => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;

      contents.push({
        role: "model",
        parts: parts
      });

      let result;

      if (name === "get_agenda") {
        result = await getAgendaData(args || {});
      } else if (name === "database_operation") {
        const { table, action, data: dbData, filters } = args || {};
        result = await executeDBAction(table, action, dbData, filters);
      } else {
        result = { error: `Ferramenta desconhecida: ${name}` };
      }

      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: name,
            response: { name: name, content: result }
          }
        }]
      });

      // Pequena pausa preventiva para não estourar rate limit
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }

    const textPart = parts.find(p => p.text);
    if (textPart) {
      return textPart.text;
    }

    throw new Error('Formato de resposta inesperado do Gemini (sem texto e sem função).');
  }

  throw new Error('A IA excedeu o número máximo de operações sequenciais.');
};
