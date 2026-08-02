import { sendWeeklyReport } from './_utils.js';

export default async function handler(req, res) {
  // Verifique o cabeçalho Authorization se você configurar um CRON_SECRET no Vercel (recomendado)
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    console.log('⏰ Disparando tarefa agendada via Vercel Cron: Relatório Semanal (Agendamentos)');
    await sendWeeklyReport();
    res.status(200).json({ ok: true, message: 'Relatório enviado com sucesso.' });
  } catch (error) {
    console.error('Erro no Cron Report:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
