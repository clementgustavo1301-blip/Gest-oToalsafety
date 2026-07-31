import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

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

async function sendTelegramMessage(text, linkId) {
  if (!telegramBotToken || !telegramChatId) return;
  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: telegramChatId, 
        text: text, 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Aprovar Acesso", callback_data: `approve_${linkId}` }
          ]]
        }
      })
    });
    const data = await response.json();
    if (!data.ok) console.error('❌ Erro da API do Telegram:', data.description);
    else console.log(`✅ Mensagem enviada para o Telegram (Vínculo: ${linkId})`);
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
      await sendTelegramMessage(message, link.id);
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
            
            // Aprovar no banco de dados
            const { error } = await supabase
              .from('user_links')
              .update({ status: 'approved' })
              .eq('id', linkId);
              
            if (error) {
              console.error('Erro ao aprovar vínculo:', error.message);
              // Notifica erro no telegram (toast popup)
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${callbackQuery.id}&text=Erro ao aprovar.&show_alert=true`);
            } else {
              console.log('✅ Vínculo aprovado com sucesso no Supabase!');
              // Responde sucesso (toast)
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${callbackQuery.id}&text=Acesso Aprovado!`);
              
              // Remove o botão e atualiza a mensagem
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
        }
      }
    }
  } catch (error) {
    // Ignora erros de timeout do Telegram silenciosamente
    if (!error.message.includes('timeout')) {
      console.error('Erro ao checar botões do Telegram:', error.message);
    }
  }
}

console.log('🤖 Agente de IA do Telegram iniciado (Modo Bidirecional)!');
console.log('👀 Monitorando novas solicitações e cliques em botões...');

// Verifica novos links a cada 5 segundos
setInterval(checkPendingLinks, 5000);

// Verifica cliques nos botões do Telegram a cada 3 segundos
setInterval(checkTelegramUpdates, 3000);

checkPendingLinks();
checkTelegramUpdates();

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando agente...');
  process.exit();
});
