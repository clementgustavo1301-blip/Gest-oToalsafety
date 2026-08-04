import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Helper to format date strings for iCal
function formatIcalDate(dateStr, timeStr) {
  // dateStr is 'YYYY-MM-DD'
  const datePart = dateStr.replace(/-/g, '');
  if (!timeStr) {
    return `VALUE=DATE:${datePart}`;
  }
  // timeStr is 'HH:mm'
  const timePart = timeStr.replace(':', '') + '00';
  return `TZID=America/Sao_Paulo:${datePart}T${timePart}`;
}

// Helper to add 1 hour for the end time if time is provided
function formatIcalEndDate(dateStr, timeStr) {
  if (!timeStr) {
    // If no time, event is all day. End date is exclusive, so technically we should add 1 day, 
    // but just omitting DTEND or making it same day is often accepted. Let's just use same day.
    return formatIcalDate(dateStr, timeStr);
  }
  
  const [hours, minutes] = timeStr.split(':');
  let endHours = parseInt(hours, 10) + 1; // Default 1 hour duration
  if (endHours < 10) endHours = '0' + endHours;
  const endTimeStr = `${endHours}:${minutes}`;
  
  return formatIcalDate(dateStr, endTimeStr);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!supabase) throw new Error("Supabase cliente não inicializado");

    // Get the name query parameter (e.g., ?name=gustavo)
    const { name } = req.query;

    const { data: trainings, error: errT } = await supabase.from('trainings').select('*');
    const { data: companiesData, error: errC } = await supabase.from('companies').select('id, name');

    if (errT || errC) {
      throw new Error("Erro ao buscar dados no Supabase.");
    }

    const compMap = {};
    companiesData.forEach(c => compMap[c.id] = c.name);

    // Filter trainings by name if provided
    let filteredTrainings = trainings;
    if (name) {
      const searchTerm = name.toLowerCase();
      filteredTrainings = trainings.filter(t => {
        const inst = (t.instructor || '').toLowerCase();
        const part = (t.participants || '').toLowerCase();
        return inst.includes(searchTerm) || part.includes(searchTerm);
      });
    }

    // Build the iCal string
    let ical = [];
    ical.push('BEGIN:VCALENDAR');
    ical.push('VERSION:2.0');
    ical.push('PRODID:-//TotalSafety//Gestão de Segurança//PT');
    ical.push('CALSCALE:GREGORIAN');
    ical.push('X-WR-CALNAME:TotalSafety' + (name ? ` - ${name}` : ''));

    filteredTrainings.forEach(t => {
      if (!t.date) return; // Skip if no date

      const companyName = compMap[t.company_id] || 'Empresa Desconhecida';
      const title = t.title || 'Agendamento';
      const eventTitle = `${title} | ${companyName}`;
      const description = `Instrutor/Responsável: ${t.instructor || 'N/A'}\\nParticipantes: ${t.participants || 'N/A'}\\nStatus: ${t.status || 'N/A'}`;

      ical.push('BEGIN:VEVENT');
      ical.push(`UID:treinamento-${t.id}@totalsafety.com`);
      
      // DTSTAMP is required and must be UTC. We'll just use a generic fixed date for simplicity if actual creation date isn't strictly needed
      const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      ical.push(`DTSTAMP:${nowUtc}`);
      
      ical.push(`DTSTART;${formatIcalDate(t.date, t.time)}`);
      
      if (t.time) {
        ical.push(`DTEND;${formatIcalEndDate(t.date, t.time)}`);
      }
      
      ical.push(`SUMMARY:${eventTitle}`);
      ical.push(`DESCRIPTION:${description}`);
      ical.push('END:VEVENT');
    });

    ical.push('END:VCALENDAR');

    const icalString = ical.join('\\r\\n');

    // Send the response as an ICS file download
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="agenda_${name ? name : 'completa'}.ics"`);
    res.status(200).send(icalString);

  } catch (error) {
    console.error('Erro na API de calendário:', error.message);
    res.status(500).json({ error: 'Erro interno ao gerar calendário' });
  }
}
