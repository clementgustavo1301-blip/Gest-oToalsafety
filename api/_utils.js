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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Alguém acabou de solicitar um novo vínculo no sistema. 
Nome: ${name}
Função: ${role || 'Não informada'}
Setor: ${sector || 'Não informado'}

Crie uma notificação curta, profissional mas com um leve tom bem-humorado, avisando o administrador da solicitação. 
Use no máximo 2-3 frases curtas. Formate em Markdown (pode usar *negrito*). 
NÃO inclua saudações genéricas como "Olá" ou "Aqui está a mensagem". Retorne apenas o texto da notificação.`;
    const result = await model.generateContent(prompt);
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
    const compMap = {};
    if (companiesData) companiesData.forEach(c => compMap[c.id] = c.name);

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
      title = '🚨 Entregas no Próximo Mês';
      filtered = deliverables.filter(d => {
        if (d.status === 'entregue' || d.status === 'feito' || d.status === 'cancelado' || d.status === 'nao_se_aplica') return false;
        if (!d.due_date) return false;
        const dDate = new Date(d.due_date + 'T00:00:00');
        const daysUntilDue = Math.ceil((dDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0 && daysUntilDue <= 31;
      });
    }

    const MAX_ITEMS = 40;
    const isTruncated = filtered.length > MAX_ITEMS;
    const itemsToShow = filtered.slice(0, MAX_ITEMS);

    let detalhes = itemsToShow.map(d => {
      const nomeEmpresa = compMap[d.company_id] || 'Empresa Desconhecida';
      const dataFormatada = type === 'vencidos' || type === 'pendentes' 
        ? (d.validity_date ? d.validity_date.split('-').reverse().join('/') : (d.due_date ? d.due_date.split('-').reverse().join('/') : 'Data indefinida'))
        : (d.due_date ? d.due_date.split('-').reverse().join('/') : 'Data indefinida');
      
      return `- ${d.title || 'Documento'} na **${nomeEmpresa}** (Data: ${dataFormatada})`;
    }).join('\n');

    if (!detalhes) detalhes = "Nenhum registro encontrado para este filtro.";
    if (isTruncated) detalhes += `\n\n_...e mais ${filtered.length - MAX_ITEMS} registros. Acesse o sistema para ver todos._`;

    let reportMessage = `📊 *${title}*\n\n`;
    reportMessage += `Total de registros: ${filtered.length}\n\n`;
    reportMessage += `*Detalhes:*\n${detalhes}\n`;

    if (genAI) {
      console.log('🧠 Melhorando relatório com IA...');
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Foi solicitado o relatório: ${title}.

DADOS:
- Total de registros: ${filtered.length}

DETALHES:
${detalhes}

Crie uma mensagem profissional, direta e com emojis, apresentando esses dados. 
Se houver registros, liste as empresas e os documentos afetados de forma organizada. 
NÃO inclua saudações genéricas no topo como "Olá" (comece direto com um título legal, ex: "📊 ${title}"). Formate em Markdown (*negrito*). Retorne apenas a mensagem final.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        reportMessage = response.text();
      } catch (aiError) {
        console.error('Erro na IA do relatório:', aiError.message);
      }
    }

    console.log(`✈️ Enviando relatório ${type}...`);
    await sendTelegramMessage(reportMessage, { replyChatId });

  } catch (err) {
    console.error(`Erro geral ao gerar relatório ${type}:`, err.message);
  }
}

export async function sendWeeklyReport(replyChatId = null) {
  console.log('\n📊 Iniciando geração do relatório de agendamentos...');
  
  try {
    if (!supabase) throw new Error("Supabase cliente não inicializado");
    const { data: trainings, error } = await supabase.from('trainings').select('*');
    if (error) {
      console.error('Erro ao buscar treinamentos para o relatório:', error.message);
      return;
    }

    const { data: companiesData } = await supabase.from('companies').select('id, name');
    const compMap = {};
    if (companiesData) companiesData.forEach(c => compMap[c.id] = c.name);

    const now = new Date();
    const startOfPastWeek = startOfDay(subDays(now, 7));
    const endOfNextWeek = endOfDay(addDays(now, 7));

    const completedLastWeek = trainings.filter(t => {
      if (t.status !== 'concluido' && t.status !== 'entregue' && t.status !== 'feito') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      return isWithinInterval(tDate, { start: startOfPastWeek, end: now });
    });

    const scheduledNextWeek = trainings.filter(t => {
      if (t.status !== 'agendado' && t.status !== 'pendente') return false;
      const tDate = t.date ? parseISO(t.date) : null;
      if (!tDate) return false;
      return isWithinInterval(tDate, { start: now, end: endOfNextWeek });
    });

    let detalhesPendentes = scheduledNextWeek.map(t => {
      const nomeEmpresa = compMap[t.company_id] || 'Empresa Desconhecida';
      const quem = t.instructor || t.participants || 'Responsável não informado';
      const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : 'Data indefinida';
      return `- ${t.title || 'Treinamento'} na **${nomeEmpresa}** (Quem: ${quem}) - ${dataFormatada}`;
    }).join('\n');

    if (!detalhesPendentes) detalhesPendentes = "Nenhum agendamento previsto.";

    let reportMessage = `📊 *Resumo Semanal de Agendamentos*\n\n`;
    reportMessage += `✅ *Concluídos nos últimos 7 dias:* ${completedLastWeek.length}\n`;
    reportMessage += `📅 *Agendados p/ os próximos 7 dias:* ${scheduledNextWeek.length}\n\n`;
    
    if (scheduledNextWeek.length > 0) {
      reportMessage += `*Detalhes dos próximos compromissos:*\n${detalhesPendentes}\n`;
    } else {
      reportMessage += `Tudo tranquilo para a próxima semana! Aproveite o fim de semana. 🍻`;
    }

    if (genAI) {
      console.log('🧠 Melhorando relatório semanal com IA...');
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Você é o assistente virtual do TotalSafety (software de gestão de segurança do trabalho). 
Gere um relatório de agendamentos para enviar ao administrador.

DADOS:
- Concluídos (7 dias): ${completedLastWeek.length}
- Pendentes (próximos 7 dias): ${scheduledNextWeek.length}

DETALHES DOS PRÓXIMOS:
${detalhesPendentes}

Crie uma mensagem profissional, amigável e motivadora (com emojis). 
Se houver agendamentos, **liste as empresas e quem irá realizar** de forma organizada.
NÃO inclua saudações genéricas no topo como "Olá" (comece direto com um título legal). Formate em Markdown (*negrito*). Retorne apenas a mensagem final.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        reportMessage = response.text();
      } catch (aiError) {
        console.error('Erro na IA do relatório:', aiError.message);
      }
    }

    console.log('✈️ Enviando relatório de agendamentos...');
    await sendTelegramMessage(reportMessage, { replyChatId });

  } catch (err) {
    console.error('Erro geral ao gerar relatório de agendamentos:', err.message);
  }
}
