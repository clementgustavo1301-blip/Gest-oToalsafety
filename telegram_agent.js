import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { isWithinInterval, subDays, addDays, parseISO, startOfDay, endOfDay } from 'date-fns';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidos.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

const notifiedIds = new Set();
let lastTelegramUpdateId = 0;

// ==========================================
// FUNÇÕES DO MODO DE APROVAÇÃO EM TEMPO REAL
// ==========================================

async function generateMessage(name, role, sector) {
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

async function sendTelegramMessage(text, options = {}) {
  if (!telegramBotToken || !telegramChatId) return;
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  
  const payload = {
    chat_id: telegramChatId, 
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

async function checkPendingLinks() {
  const { data: pendingLinks, error } = await supabase
    .from('user_links')
    .select('*')
    .eq('status', 'pending');

  if (error) {
    console.error('Erro ao checar vínculos:', error.message);
    return;
  }

  for (const link of pendingLinks) {
    if (!notifiedIds.has(link.id)) {
      notifiedIds.add(link.id);
      
      console.log(`\n🔔 Nova solicitação detectada (ID: ${link.id}) para o usuário: ${link.user_id}`);
      
      let userName = 'Usuário Desconhecido';
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', link.user_id)
        .single();
        
      if (profile && profile.name) userName = profile.name;

      console.log('🧠 Gerando mensagem inteligente...');
      const message = await generateMessage(userName, link.role, link.sector);
      
      console.log('✈️ Enviando mensagem com botão...');
      await sendTelegramMessage(message, { linkId: link.id });
    }
  }
}

async function checkTelegramUpdates() {
  if (!telegramBotToken) return;
  
  const url = `https://api.telegram.org/bot${telegramBotToken}/getUpdates?offset=${lastTelegramUpdateId}&timeout=5`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        lastTelegramUpdateId = update.update_id + 1;
        
        if (update.callback_query) {
          const callbackQuery = update.callback_query;
          const callbackData = callbackQuery.data;
          
          if (callbackData.startsWith('approve_')) {
            const linkId = callbackData.replace('approve_', '');
            console.log(`\n📲 Comando de APROVAÇÃO via Telegram para o vínculo: ${linkId}`);
            
            const { error } = await supabase
              .from('user_links')
              .update({ status: 'approved' })
              .eq('id', linkId);
              
            if (error) {
              console.error('Erro ao aprovar vínculo:', error.message);
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${callbackQuery.id}&text=Erro ao aprovar.&show_alert=true`);
            } else {
              console.log('✅ Vínculo aprovado com sucesso no Supabase!');
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${callbackQuery.id}&text=Acesso Aprovado!`);
              
              let originalText = callbackQuery.message.text || 'Acesso solicitado.';
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: callbackQuery.message.chat.id,
                  message_id: callbackQuery.message.message_id,
                  text: originalText + '\n\n✅ *Aprovado por você via Telegram*',
                  parse_mode: 'Markdown',
                  reply_markup: { inline_keyboard: [] }
                })
              });
            }
          } 
          else if (callbackData.startsWith('report_')) {
            const reportType = callbackData.replace('report_', '');
            console.log(`\n📲 Comando de RELATÓRIO '${reportType}' selecionado no menu!`);
            
            // Remove the loading clock from the button
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${callbackQuery.id}`);
            
            if (reportType === 'agendamentos') {
              await sendWeeklyReport();
            } else {
              await sendDeliverablesReport(reportType);
            }
          }
        } else if (update.message && update.message.text) {
          const text = update.message.text.toLowerCase().trim();
          if (text === 'relatorio' || text === '/relatorio' || text === 'relatório' || text === '/relatório') {
            console.log(`\n📲 Menu de RELATÓRIOS acionado via Telegram!`);
            
            const menuOptions = {
              inline_keyboard: [
                [{ text: "📅 Treinamentos/Agendamentos", callback_data: "report_agendamentos" }],
                [{ text: "⚠️ Programas Vencidos", callback_data: "report_vencidos" }],
                [{ text: "⏳ Programas Pendentes", callback_data: "report_pendentes" }],
                [{ text: "🚨 Entregas no Próximo Mês", callback_data: "report_proximos" }]
              ]
            };
            
            await sendTelegramMessage("Qual relatório você deseja gerar agora?", menuOptions);
          }
        }
      }
    }
  } catch (error) {
    if (!error.message.includes('timeout')) {
      console.error('Erro ao checar botões do Telegram:', error.message);
    }
  }
}

// ==========================================
// FUNÇÕES DE RELATÓRIO
// ==========================================

async function sendDeliverablesReport(type) {
  console.log(`\n📊 Iniciando geração do relatório de entregáveis (${type})...`);
  
  try {
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
        // Não filtra por status: mesmo se estiver 'entregue', a validade pode ter expirado.
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
        // Próximo mês = até 31 dias a partir de hoje
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
    await sendTelegramMessage(reportMessage);

  } catch (err) {
    console.error(`Erro geral ao gerar relatório ${type}:`, err.message);
  }
}

async function sendWeeklyReport() {
  console.log('\n📊 Iniciando geração do relatório de agendamentos...');
  
  try {
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
    await sendTelegramMessage(reportMessage);

  } catch (err) {
    console.error('Erro geral ao gerar relatório de agendamentos:', err.message);
  }
}

// ==========================================
// AGENDAMENTOS (CRON) E INICIALIZAÇÃO
// ==========================================

// Agenda o relatório de agendamentos para toda sexta-feira às 17h00
cron.schedule('0 17 * * 5', () => {
  console.log('⏰ Disparando tarefa agendada: Relatório Semanal (Agendamentos)');
  sendWeeklyReport();
});

console.log('🤖 Agente de IA do Telegram iniciado (Menu de Relatórios Interativo + Cron)!');
console.log('👀 Monitorando novas solicitações e cliques em botões...');

// Verifica novos links a cada 5 segundos
setInterval(checkPendingLinks, 5000);

// Verifica cliques e mensagens do Telegram a cada 3 segundos
setInterval(checkTelegramUpdates, 3000);

checkPendingLinks();
checkTelegramUpdates();

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando agente...');
  process.exit();
});
