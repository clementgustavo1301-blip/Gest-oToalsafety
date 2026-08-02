import { sendDailyReport } from './_utils.js';

export default async function handler(req, res) {
  try {
    console.log('⏰ Disparando tarefa agendada via Vercel Cron: Relatório Diário (Agendamentos)');
    await sendDailyReport();
    res.status(200).json({ ok: true, message: 'Relatório enviado com sucesso.' });
  } catch (error) {
    console.error('Erro no Cron Report:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
