import { supabase, generateMessage, sendTelegramMessage } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    
    // Check if it's an insert to user_links and it's pending
    if (payload.type === 'INSERT' && payload.table === 'user_links' && payload.record && payload.record.status === 'pending') {
      const link = payload.record;
      console.log(`\n🔔 Nova solicitação recebida via Webhook (ID: ${link.id}) para o usuário: ${link.user_id}`);
      
      let userName = 'Usuário Desconhecido';
      
      if (supabase) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', link.user_id)
          .single();
          
        if (profile && profile.name) userName = profile.name;
      }

      console.log('🧠 Gerando mensagem inteligente...');
      const message = await generateMessage(userName, link.role, link.sector);
      
      console.log('✈️ Enviando mensagem com botão para o Telegram...');
      await sendTelegramMessage(message, { linkId: link.id });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro no webhook do Supabase:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
