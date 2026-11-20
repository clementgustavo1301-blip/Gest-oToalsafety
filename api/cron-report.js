import { sendFullSystemDigest } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    console.log('⏰ Disparando tarefa agendada via Vercel Cron: Resumo Diário Completo');
    await sendFullSystemDigest();
    res.status(200).json({ ok: true, message: 'Relatório enviado com sucesso.' });
  } catch (error) {
    console.error('Erro no Cron Report:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
