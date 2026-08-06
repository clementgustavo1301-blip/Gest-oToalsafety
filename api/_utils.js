import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isWithinInterval, subDays, addDays, parseISO, startOfDay, endOfDay } from 'date-fns';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
export const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
export const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidos.');
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
export const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export async function generateMessage(name, role, sector) {
  const baseMessage = `🚨 *Nova Solicitação de Acesso!*\n\n*Usuário:* ${name}\n*Função:* ${role || 'Não informada'}\n*Setor:* ${sector || 'Não informado'}`;
  if (!genAI) return baseMessage;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Alguém acabou de solicitar um novo vínculo no sistema. 
Nome: ${name}
Função: ${role || 'Não informada'}
Setor: ${sector || 'Não informado'}

Crie uma notificação curta, profissional mas com um leve tom bem-humorado, avisando o administrador da solicitação. 
Use no máximo 2-3 frases curtas. Formate em Markdown (pode usar *negrito*). 
NÃO inclua saudações genéricas como "Olá" ou "Aqui está a mensagem". Retorne apenas o texto da notificação.`;
    const aiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 7000));
    const result = await Promise.race([aiPromise, timeoutPromise]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Erro ao gerar mensagem com IA:', error.message);
    return baseMessage;
  }
}

export async function sendTelegramMessage(text, options = {}) {
  if (!telegramBotToken || !telegramChatId) {
    console.log('Falta token ou chatId do Telegram, ignorando...');
    return;
  }
  
  // If replyChatId is passed, use it (for commands sent directly to the bot), otherwise fallback to the admin's chatId
  const chatId = options.replyChatId || telegramChatId;
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  
  const payload = {
    chat_id: chatId, 
    text: text, 
    parse_mode: 'Markdown'
  };

  if (options.linkId) {
    payload.reply_markup = {
      inline_keyboard: [[
        { text: "✅ Aprovar Acesso", callback_data: `approve_${options.linkId}` }
      ]]
    };
  } else if (options.inline_keyboard) {
    payload.reply_markup = {
      inline_keyboard: options.inline_keyboard
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.ok) console.error('❌ Erro da API do Telegram:', data.description);
    else console.log(`✅ Mensagem enviada para o Telegram${options.linkId ? ' (Vínculo: ' + options.linkId + ')' : ''}`);
  } catch (error) {
    console.error('❌ Erro na requisição para o Telegram:', error.message);
  }
}

export async function sendDeliverablesReport(type, replyChatId = null) {
  console.log(`\n📊 Iniciando geração do relatório de entregáveis (${type})...`);
  
  try {
    if (!supabase) throw new Error("Supabase cliente não inicializado");
    const { data: deliverables, error } = await supabase.from('deliverables').select('*');
    if (error) {
      console.error('Erro ao buscar entregáveis:', error.message);
      return;
    }
    
    const { data: companiesData } = await supabase.from('companies').select('id, name');
    const { data: profilesData } = await supabase.from('profiles').select('id, name');
    const compMap = {};
    if (companiesData) companiesData.forEach(c => compMap[c.id] = c.name);
    const profMap = {};
    if (profilesData) profilesData.forEach(p => profMap[p.id] = p.name);

    const now = new Date();
    const today = startOfDay(now);

    let filtered = [];
    let title = '';
    
    if (type === 'vencidos') {
      title = '⚠️ Programas Vencidos';
      filtered = deliverables.filter(d => {
        if (d.type !== 'programa') return false;
        if (!d.validity_date) return false;
        const vDate = new Date(d.validity_date + 'T00:00:00');
        return vDate < today;
      });
    } else if (type === 'pendentes') {
      title = '⏳ Programas Pendentes';
      filtered = deliverables.filter(d => d.type === 'programa' && d.status === 'pendente');
    } else if (type === 'proximos') {
      title = '🚨 Próximos a Vencer';
      filtered = deliverables.filter(d => {
        if (!d.validity_date) return false;
        const vDate = new Date(d.validity_date + 'T00:00:00');
        const daysUntilDue = Math.ceil((vDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 15;
      });
    }

    const MAX_ITEMS = 40;
    const isTruncated = filtered.length > MAX_ITEMS;
    const itemsToShow = filtered.slice(0, MAX_ITEMS);

    let detalhes = itemsToShow.map(d => {
      const nomeEmpresa = compMap[d.company_id] || 'Empresa Desconhecida';
      const responsavel = profMap[d.responsible_id] || 'Não informado';
      const dataFormatada = type === 'vencidos' || type === 'pendentes' 
        ? (d.validity_date ? d.validity_date.split('-').reverse().join('/') : (d.due_date ? d.due_date.split('-').reverse().join('/') : 'S/D'))
        : (d.due_date ? d.due_date.split('-').reverse().join('/') : 'S/D');
      
      const icon = type === 'vencidos' ? '🚨' : (type === 'pendentes' ? '⏳' : '📌');
      return `${icon} *${d.title || 'Documento'}* | 🏢 ${nomeEmpresa} | 👤 Responsável: ${responsavel} | Data: ${dataFormatada}`;
    }).join('\n');

    if (!detalhes) detalhes = "_Nenhum registro encontrado para este filtro._";
    if (isTruncated) detalhes += `\n\n_...e mais ${filtered.length - MAX_ITEMS} registros. Acesse o sistema para ver todos._`;

    let reportMessage = `📊 *${title}*\n\n`;
    reportMessage += `Total de registros nesta categoria: ${filtered.length}\n\n`;
    reportMessage += `*Detalhes:*\n${detalhes}\n`;

    // Enviar relatório imediatamente - a IA é opcional e não pode bloquear
    console.log(`✈️ Enviando relatório ${type}...`);
    
    if (genAI) {
      console.log('🧠 Tentando melhorar com IA (timeout 7s)...');
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Foi solicitado o relatório: ${title}.

DADOS:
- Total de registros: ${filtered.length}

DETALHES:
${detalhes}

Crie uma mensagem muito profissional, amigável e direta (com emojis). 
Se houver registros vencidos, ENFATIZE A URGÊNCIA de regularização de forma educada.
Agrupe ou liste as empresas, responsáveis (👤 Responsável) e os documentos afetados de forma extremamente organizada e fácil de ler (em bullet points). 
NÃO inclua saudações genéricas no topo como "Olá" (comece direto com um título legal, ex: "📊 ${title}"). Formate em Markdown (*negrito*). Retorne apenas a mensagem final do Telegram.`;
        
        const aiPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 7000));
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        reportMessage = response.text();
      } catch (aiError) {
        console.warn('⏱️ IA não respondeu a tempo ou falhou, usando relatório padrão:', aiError.message);
      }
    }

    await sendTelegramMessage(reportMessage, { replyChatId });

  } catch (err) {
    console.error(`Erro geral ao gerar relatório ${type}:`, err.message);
  }
}

export async function sendDailyReport(replyChatId = null) {
  console.log('\n📊 Iniciando geração do relatório diário de agendamentos...');
  
  try {
    if (!supabase) throw new Error("Supabase cliente não inicializado");
    const { data: trainings, error } = await supabase.from('trainings').select('*');
    if (error) {
      console.error('Erro ao buscar treinamentos para o relatório:', error.message);
      return;
    }

    const { data: companiesData } = await supabase.from('companies').select('id, name');
    const { data: profilesData } = await supabase.from('profiles').select('id, name');
    const compMap = {};
    if (companiesData) companiesData.forEach(c => compMap[c.id] = c.name);
    const profMap = {};
    if (profilesData) profilesData.forEach(p => profMap[p.id] = p.name);

    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfNext9Days = endOfDay(addDays(now, 9));

    // 1. Agendamentos totais
    const totalAgendamentos = trainings.length;

    // 2. Os executados
    const executados = trainings.filter(t => t.status === 'concluido' || t.status === 'entregue' || t.status === 'feito');

    // 3. Agendamentos nos próximos 9 dias
    const proximos9Dias = trainings.filter(t => {
      if (t.status !== 'agendado' && t.status !== 'pendente') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      return isWithinInterval(tDate, { start: startOfToday, end: endOfNext9Days });
    });
    proximos9Dias.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. Data já passou e pendente de resposta
    const atrasadosPendentes = trainings.filter(t => {
      if (t.status !== 'agendado' && t.status !== 'pendente') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      return parseISO(t.date) < startOfToday;
    });
    atrasadosPendentes.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Formatar detalhes dos próximos 9 dias
    let detalhesProximos = proximos9Dias.map(t => {
      const nomeEmpresa = compMap[t.company_id] || 'Empresa Desconhecida';
      const respName = t.responsible_id ? profMap[t.responsible_id] : null;
      const instructorName = (t.instructor && typeof t.instructor === 'string' && t.instructor.trim()) ? t.instructor.trim() : null;
      const quem = respName || instructorName || 'Não informado';
      const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : 'S/D';
      const horario = t.time || 'Sem horário';
      return `📌 *${t.title || 'Treinamento'}*\n   🏢 Empresa: ${nomeEmpresa}\n   📅 Data: ${dataFormatada} às ${horario}\n   👤 Responsável: ${quem}`;
    }).join('\n\n');
    if (!detalhesProximos) detalhesProximos = "_Nenhum agendamento previsto para os próximos 9 dias._";

    // Formatar detalhes dos atrasados
    let detalhesAtrasados = atrasadosPendentes.map(t => {
      const nomeEmpresa = compMap[t.company_id] || 'Empresa Desconhecida';
      const respName = t.responsible_id ? profMap[t.responsible_id] : null;
      const instructorName = (t.instructor && typeof t.instructor === 'string' && t.instructor.trim()) ? t.instructor.trim() : null;
      const quem = respName || instructorName || 'Não informado';
      const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : 'S/D';
      return `⚠️ *${t.title || 'Treinamento'}*\n   🏢 Empresa: ${nomeEmpresa}\n   📅 Data Original: ${dataFormatada}\n   👤 Responsável: ${quem}`;
    }).join('\n\n');
    if (!detalhesAtrasados) detalhesAtrasados = "_Nenhum agendamento atrasado sem resposta._";

    let reportMessage = `📊 *Relatório Diário de Agendamentos*\n\n`;
    reportMessage += `📈 *Geral:*\n- Total Registrado: ${totalAgendamentos}\n- Total Executados: ${executados.length}\n\n`;
    reportMessage += `🚨 *Atrasados/Sem Resposta (${atrasadosPendentes.length}):*\n${detalhesAtrasados}\n\n`;
    reportMessage += `📅 *Próximos 9 Dias (${proximos9Dias.length}):*\n${detalhesProximos}\n`;

    // Enviar relatório imediatamente - a IA é opcional e não pode bloquear
    console.log('✈️ Enviando relatório diário de agendamentos...');

    if (genAI) {
      console.log('🧠 Tentando melhorar relatório diário com IA (timeout 7s)...');
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Gere o relatório diário de agendamentos.

DADOS RELEVANTES:
- Agendamentos totais (histórico): ${totalAgendamentos}
- Agendamentos já executados: ${executados.length}
- Atrasados/Pendentes: ${atrasadosPendentes.length}
- Próximos (9 dias): ${proximos9Dias.length}

DETALHES ATRASADOS:
${detalhesAtrasados}

DETALHES PRÓXIMOS 9 DIAS:
${detalhesProximos}

Crie uma mensagem muito profissional, amigável e direta (com emojis). 
Comece direto com um título legal, sem "Olá". Formate em Markdown (*negrito*). 
Deixe claro o panorama geral (Total e Executados) de forma resumida, mas FOQUE BASTANTE em listar os itens Atrasados (dando destaque de alerta) e os itens para os Próximos 9 dias.
OBRIGATÓRIO: Para cada treinamento ou agendamento listado, VOCÊ DEVE MANTER VISÍVEL AS 3 LINHAS SEPARADAS (uma linha para 🏢 Empresa, uma para 📅 Data, e uma para 👤 Responsável). 
NÃO junte essas informações na mesma linha, para que a leitura fique limpa e as informações não fiquem "muito juntas".
Retorne apenas a mensagem final do Telegram.`;
        
        const aiPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 7000));
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        reportMessage = response.text();
      } catch (aiError) {
        console.warn('⏱️ IA não respondeu a tempo ou falhou, usando relatório padrão:', aiError.message);
      }
    }

    await sendTelegramMessage(reportMessage, { replyChatId });

  } catch (err) {
    console.error('Erro geral ao gerar relatório de agendamentos:', err.message);
  }
}

export async function sendDailyReportByResponsible(replyChatId = null) {
  console.log('\n📊 Iniciando geração do relatório de agendamentos por responsável...');
  
  try {
    if (!supabase) throw new Error("Supabase cliente não inicializado");
    const { data: trainings, error } = await supabase.from('trainings').select('*');
    if (error) {
      console.error('Erro ao buscar treinamentos para o relatório:', error.message);
      return;
    }

    const { data: companiesData } = await supabase.from('companies').select('id, name');
    const { data: profilesData } = await supabase.from('profiles').select('id, name');
    const compMap = {};
    if (companiesData) companiesData.forEach(c => compMap[c.id] = c.name);
    const profMap = {};
    if (profilesData) profilesData.forEach(p => profMap[p.id] = p.name);

    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfNext9Days = endOfDay(addDays(now, 9));

    // Filtrar apenas agendamentos relevantes (atrasados e próximos 9 dias)
    const pendentesAtrasadosOuProximos = trainings.filter(t => {
      if (t.status !== 'agendado' && t.status !== 'pendente') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      
      const isAtrasado = tDate < startOfToday;
      const isProximo = isWithinInterval(tDate, { start: startOfToday, end: endOfNext9Days });
      
      return isAtrasado || isProximo;
    });
    pendentesAtrasadosOuProximos.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Agrupar por responsável
    const agrupadoPorResponsavel = {};
    
    pendentesAtrasadosOuProximos.forEach(t => {
      const respName = t.responsible_id ? profMap[t.responsible_id] : null;
      const instructorName = (t.instructor && typeof t.instructor === 'string' && t.instructor.trim()) ? t.instructor.trim() : null;
      const quem = respName || instructorName || 'Não informado';
      
      if (!agrupadoPorResponsavel[quem]) {
        agrupadoPorResponsavel[quem] = [];
      }
      agrupadoPorResponsavel[quem].push(t);
    });

    // Formatar detalhes por responsável
    let detalhesFormatados = Object.keys(agrupadoPorResponsavel).sort().map(responsavel => {
      let blocoResponsavel = `👤 *Responsável: ${responsavel}*\n`;
      
      const itensResponsavel = agrupadoPorResponsavel[responsavel].map(t => {
        const nomeEmpresa = compMap[t.company_id] || 'Empresa Desconhecida';
        const tDate = parseISO(t.date);
        const isAtrasado = tDate < startOfToday;
        const icon = isAtrasado ? '⚠️' : '📌';
        const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : 'S/D';
        const horario = t.time || 'Sem horário';
        const extraHorario = isAtrasado ? '' : ` às ${horario}`;
        const lblData = isAtrasado ? 'Data Original' : 'Data';
        
        return `   ${icon} *${t.title || 'Treinamento'}*\n      🏢 Empresa: ${nomeEmpresa}\n      📅 ${lblData}: ${dataFormatada}${extraHorario}`;
      }).join('\n\n');
      
      return blocoResponsavel + itensResponsavel;
    }).join('\n\n------------------------\n\n');

    if (!detalhesFormatados) detalhesFormatados = "_Nenhum agendamento pendente/atrasado ou para os próximos 9 dias encontrado._";

    let reportMessage = `📊 *Relatório de Agendamentos por Responsável*\n\n`;
    reportMessage += `${detalhesFormatados}\n`;

    console.log('✈️ Enviando relatório de agendamentos por responsável...');

    if (genAI) {
      console.log('🧠 Tentando melhorar relatório por responsável com IA...');
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Gere o relatório de agendamentos agrupados por Responsável.

DADOS AGRUPADOS:
${detalhesFormatados}

Crie uma mensagem muito profissional e amigável (com emojis). 
Comece direto com um título legal, sem "Olá". Formate em Markdown (*negrito*). 
OBRIGATÓRIO: Mantenha o agrupamento por responsável intacto. 
Abaixo do nome de cada responsável, liste seus treinamentos mantendo as linhas separadas (uma linha para o nome do treinamento, uma para 🏢 Empresa, uma para 📅 Data) para não ficar "muito junto".
Dê destaque de urgência aos que tiverem ícone ⚠️ (Atrasados).
Retorne apenas a mensagem final do Telegram.`;
        
        const aiPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 7000));
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        reportMessage = response.text();
      } catch (aiError) {
        console.warn('⏱️ IA falhou, usando relatório padrão:', aiError.message);
      }
    }

    await sendTelegramMessage(reportMessage, { replyChatId });

  } catch (err) {
    console.error('Erro geral ao gerar relatório por responsável:', err.message);
  }
}

export async function sendFullSystemDigest() {
  console.log('\n📊 Iniciando geração do Resumo Diário Completo do Sistema (Automação)...');
  
  try {
    if (!supabase) throw new Error("Supabase cliente não inicializado");
    
    // 1. Fetch data
    const { data: trainings, error: errT } = await supabase.from('trainings').select('*');
    const { data: deliverables, error: errD } = await supabase.from('deliverables').select('*');
    const { data: companiesData } = await supabase.from('companies').select('id, name');
    const { data: profilesData } = await supabase.from('profiles').select('id, name');
    
    if (errT || errD) {
      console.error('Erro ao buscar dados para o digest:', errT?.message || errD?.message);
      return;
    }

    const compMap = {};
    if (companiesData) companiesData.forEach(c => compMap[c.id] = c.name);
    const profMap = {};
    if (profilesData) profilesData.forEach(p => profMap[p.id] = p.name);

    const now = new Date();
    const startOfToday = startOfDay(now);
    const endOfNext9Days = endOfDay(addDays(now, 9));

    // --- AGENDAMENTOS ---
    const totalAgendamentos = trainings.length;
    const executados = trainings.filter(t => t.status === 'concluido' || t.status === 'entregue' || t.status === 'feito');
    
    const proximos9Dias = trainings.filter(t => {
      if (t.status !== 'agendado' && t.status !== 'pendente') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      return isWithinInterval(tDate, { start: startOfToday, end: endOfNext9Days });
    });
    proximos9Dias.sort((a, b) => new Date(a.date) - new Date(b.date));

    const atrasadosPendentes = trainings.filter(t => {
      if (t.status !== 'agendado' && t.status !== 'pendente') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      return parseISO(t.date) < startOfToday;
    });
    atrasadosPendentes.sort((a, b) => new Date(a.date) - new Date(b.date));

    let detalhesProximosA = proximos9Dias.map(t => {
      const nomeEmpresa = compMap[t.company_id] || 'Empresa Desconhecida';
      const respName = t.responsible_id ? profMap[t.responsible_id] : null;
      const instructorName = (t.instructor && typeof t.instructor === 'string' && t.instructor.trim()) ? t.instructor.trim() : null;
      const quem = respName || instructorName || 'Não informado';
      const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : 'S/D';
      return `📌 *${t.title || 'Treinamento'}* na ${nomeEmpresa} (📅 ${dataFormatada} | 👤 Responsável: ${quem})`;
    }).join('\n');
    if (!detalhesProximosA) detalhesProximosA = "_Nenhum._";

    let detalhesAtrasadosA = atrasadosPendentes.map(t => {
      const nomeEmpresa = compMap[t.company_id] || 'Empresa Desconhecida';
      const respName = t.responsible_id ? profMap[t.responsible_id] : null;
      const instructorName = (t.instructor && typeof t.instructor === 'string' && t.instructor.trim()) ? t.instructor.trim() : null;
      const quem = respName || instructorName || 'Não informado';
      const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : 'S/D';
      return `⚠️ *${t.title || 'Treinamento'}* na ${nomeEmpresa} (Era 📅 ${dataFormatada} | 👤 Responsável: ${quem})`;
    }).join('\n');
    if (!detalhesAtrasadosA) detalhesAtrasadosA = "_Nenhum._";

    let reportMessage = `📊 *Resumo Diário de Agendamentos*\n\n`;
    reportMessage += `*--- PANORAMA GERAL ---*\n`;
    reportMessage += `Total: ${totalAgendamentos} | Executados: ${executados.length}\n`;
    reportMessage += `🚨 Atrasados:\n${detalhesAtrasadosA}\n`;
    reportMessage += `📅 Próximos 9 Dias:\n${detalhesProximosA}\n\n`;

    if (genAI) {
      console.log('🧠 Melhorando Resumo Diário Completo com IA...');
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Gere o Resumo Diário de Agendamentos. Este é um panorama geral detalhado.

DADOS RELEVANTES:
- Total (histórico): ${totalAgendamentos}
- Executados: ${executados.length}
- Atrasados/Sem Resposta:
${detalhesAtrasadosA}
- Próximos 9 dias:
${detalhesProximosA}

INSTRUÇÕES:
Crie uma mensagem executiva, altamente organizada (bullet points, emojis) e de fácil leitura.
Comece com "📊 Resumo Diário de Agendamentos". Não use "Olá" ou saudações, vá direto ao ponto.
Destaque o que é URGENTE (atrasados).
OBRIGATÓRIO: Para cada treinamento ou agendamento listado nos tópicos, VOCÊ DEVE MANTER VISÍVEL o nome do Responsável (👤 Responsável: [Nome]). Não omitir o nome do responsável em nenhuma hipótese.
NÃO invente dados. Formate em Markdown (*negrito*). Retorne APENAS o texto da mensagem do Telegram.`;
        
        const aiPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 7000));
        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        reportMessage = response.text();
      } catch (aiError) {
        console.error('Erro na IA do relatório completo:', aiError.message);
      }
    }

    console.log('✈️ Enviando Resumo Diário Completo (Automação)...');
    await sendTelegramMessage(reportMessage, { replyChatId: null });

  } catch (err) {
    console.error('Erro geral ao gerar Resumo Diário Completo:', err.message);
  }
}

