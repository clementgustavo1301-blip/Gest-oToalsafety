import { 
  supabase, 
  telegramBotToken, 
  telegramChatId,
  sendDeliverablesReport, 
  sendDailyReport,
  sendDailyReportByResponsible,
  sendTelegramMessage 
} from './_utils.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  // Only allow POST requests for the webhook
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-telegram-bot-api-secret-token'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const update = req.body || {};
    
    // Telegram will send updates. We handle callback_query (buttons) and messages.
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = String(callbackQuery.data || '');
      const replyChatId = callbackQuery.message?.chat?.id;

      if (!telegramChatId || !replyChatId || String(replyChatId) !== String(telegramChatId)) {
        return res.status(403).json({ error: 'Forbidden chat' });
      }
      
      if (callbackData.startsWith('approve_')) {
        const linkId = callbackData.replace('approve_', '').trim();
        if (!UUID_REGEX.test(linkId)) {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${encodeURIComponent(callbackQuery.id)}&text=ID+inválido.&show_alert=true`);
          return res.status(400).json({ error: 'Invalid link ID' });
        }

        console.log(`\n📲 Comando de APROVAÇÃO via Telegram para o vínculo: ${linkId}`);
        
        if (supabase) {
          const { error } = await supabase
            .from('user_links')
            .update({ status: 'approved' })
            .eq('id', linkId);
            
          if (error) {
            console.error('Erro ao aprovar vínculo:', error.message);
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${encodeURIComponent(callbackQuery.id)}&text=Erro+ao+aprovar.&show_alert=true`);
          } else {
            console.log('✅ Vínculo aprovado com sucesso no Supabase!');
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${encodeURIComponent(callbackQuery.id)}&text=Acesso+Aprovado!`);
            
            const originalText = callbackQuery.message?.text || 'Acesso solicitado.';
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: replyChatId,
                message_id: callbackQuery.message.message_id,
                text: originalText + '\n\n✅ *Aprovado por você via Telegram*',
                parse_mode: 'Markdown',
                reply_markup: { inline_keyboard: [] }
              })
            });
          }
        }
      } 
      else if (callbackData.startsWith('report_')) {
        const reportType = callbackData.replace('report_', '');
        console.log(`\n📲 Comando de RELATÓRIO '${reportType}' selecionado no menu!`);
        
        // Remove the loading clock from the button
        await fetch(`https://api.telegram.org/bot${telegramBotToken}/answerCallbackQuery?callback_query_id=${encodeURIComponent(callbackQuery.id)}`);
        
        if (reportType === 'agendamentos') {
          // Sub-menu for Agendamentos
          const menuOptions = {
            replyChatId,
            inline_keyboard: [
              [{ text: "📊 Geral", callback_data: "report_agendamentos_geral" }],
              [{ text: "👤 Por Responsável", callback_data: "report_agendamentos_responsavel" }]
            ]
          };
          await sendTelegramMessage("Como deseja visualizar o relatório de Agendamentos/Treinamentos?", menuOptions);
        } else if (reportType === 'agendamentos_geral') {
          await sendDailyReport(replyChatId);
        } else if (reportType === 'agendamentos_responsavel') {
          await sendDailyReportByResponsible(replyChatId);
        } else {
          await sendDeliverablesReport(reportType, replyChatId);
        }
      }
    } else if (update.message && update.message.text) {
      const text = update.message.text.toLowerCase().trim();
      const replyChatId = update.message.chat?.id;

      if (!telegramChatId || !replyChatId || String(replyChatId) !== String(telegramChatId)) {
        return res.status(403).json({ error: 'Forbidden chat' });
      }

      if (text === 'relatorio' || text === '/relatorio' || text === 'relatório' || text === '/relatório') {
        console.log(`\n📲 Menu de RELATÓRIOS acionado via Telegram!`);
        
        const menuOptions = {
          replyChatId,
          inline_keyboard: [
            [{ text: "📅 Treinamentos/Agendamentos", callback_data: "report_agendamentos" }],
            [{ text: "⚠️ Programas Vencidos", callback_data: "report_vencidos" }],
            [{ text: "⏳ Programas Pendentes", callback_data: "report_pendentes" }],
            [{ text: "🚨 Próximos a Vencer", callback_data: "report_proximos" }]
          ]
        };
        
        await sendTelegramMessage("Qual relatório você deseja gerar agora?", menuOptions);
      }
    }

    // Always respond with 200 OK so Telegram knows we received it
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro no webhook do Telegram:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
