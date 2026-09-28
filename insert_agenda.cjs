const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM';
const supabase = createClient(supabaseUrl, supabaseKey);

const events = [
  { c: 'Bonelaria Fenix', d: '2026-09-18', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Setembro Amarelo, massoterapia e tópicos sobre prevenção ao suicídio. (Lucas, Katty, 13h)' },
  { c: 'Construir', d: '2026-09-18', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Setembro Amarelo — duas turmas: manhã e tarde. (Leiliana)' },
  { c: 'Master Mais / DJNT e LM Autopeças', d: '2026-09-21', t: 'acao', l: 'Mossoró - RN', n: 'Atendimento in company — apenas ASOs. Necessidade: 1 Médico do Trabalho + Leiliana.' },
  { c: 'Sal Garça (Mossoró)', d: '2026-09-22', t: 'acao', l: 'Mossoró - RN', n: 'Coleta e realização de exames complementares.' },
  { c: 'Sal Garça (Porto do Mangue)', d: '2026-09-22', t: 'acao', l: 'Porto do Mangue - RN', n: 'Coleta e realização de exames complementares.' },
  { c: 'Salina Cinco Estrelas', d: '2026-09-23', t: 'acao', l: 'Mossoró - RN', n: 'Realização dos ASOs que ficaram pendentes.' },
  { c: 'Sal Garça (Porto do Mangue)', d: '2026-09-23', t: 'acao', l: 'Porto do Mangue - RN', n: 'Realização dos ASOs.' },
  { c: 'Sal Garça (Mossoró)', d: '2026-09-24', t: 'acao', l: 'Mossoró - RN', n: 'Realização dos ASOs — somente Médico do Trabalho com Leiliana.' },
  { c: 'MVP (Obra)', d: '2026-09-29', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Setembro Amarelo.' },
  { c: 'MVP (Obra)', d: '2026-09-30', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Setembro Amarelo.' },
  { c: 'MVP (Obra)', d: '2026-10-01', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Setembro Amarelo.' },
  { c: 'Beira Rio', d: '2026-10-05', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Manhã)' },
  { c: 'Ninho', d: '2026-10-06', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã)' },
  { c: 'Grupo Castel (EPF)', d: '2026-10-06', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Katty, Manhã)' },
  { c: 'Tempero Regina', d: '2026-10-07', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Katty, Manhã)' },
  { c: 'Oeste Verde', d: '2026-10-07', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Tarde)' },
  { c: 'Montec', d: '2026-10-08', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Tarde)' },
  { c: 'P E D (Pé Direito)', d: '2026-10-09', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Manhã)' },
  { c: 'Beira Rio', d: '2026-10-12', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã)' },
  { c: 'Salina Cinco Estrelas', d: '2026-10-12', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Katty, Manhã-Tarde)' },
  { c: 'Sal Garça (Porto do Mangue)', d: '2026-10-12', t: 'palestra', l: 'Porto do Mangue - RN', n: 'Momento Outubro Rosa. (Katty, Manhã-Tarde)' },
  { c: 'Quintas do Lago', d: '2026-10-13', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã)' },
  { c: 'Sal Garça (Mossoró)', d: '2026-10-14', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã)' },
  { c: 'Mossoró Tacógrafo', d: '2026-10-14', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã)' },
  { c: 'MVP', d: '2026-10-14', t: 'palestra', l: 'Natal - RN', n: 'Momento Outubro Rosa — Natal, Escritório. (Tarde)' },
  { c: 'Bonelaria Fenix (Serra Negra)', d: '2026-10-16', t: 'palestra', l: 'Serra Negra do Norte - RN', n: 'Momento Outubro Rosa. (Katty, Dia todo)' },
  { c: 'Marambaya / Sabará', d: '2026-10-19', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã-Tarde)' },
  { c: 'Beira Rio', d: '2026-10-19', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Katty, Manhã)' },
  { c: 'Plano Construtora', d: '2026-10-20', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Leiliana, Manhã)' },
  { c: 'Dipress', d: '2026-10-20', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Katty, Manhã)' },
  { c: 'Grupo Aldair', d: '2026-10-23', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Katty, Manhã-Tarde)' },
  { c: 'Fix Esquadrias', d: '2026-10-27', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Manhã)' },
  { c: 'ZEFLEX', d: '2026-10-27', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Tarde)' },
  { c: 'MVP (Obra, Natal)', d: '2026-10-27', t: 'palestra', l: 'Natal - RN', n: 'Momento Outubro Rosa.' },
  { c: 'MVP (Obra, Natal)', d: '2026-10-28', t: 'palestra', l: 'Natal - RN', n: 'Momento Outubro Rosa.' },
  { c: 'F.A Frutas', d: '2026-10-29', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Manhã)' },
  { c: 'LD Agropecuária', d: '2026-10-29', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Tarde)' },
  { c: 'MVP (Obra, Natal)', d: '2026-10-29', t: 'palestra', l: 'Natal - RN', n: 'Momento Outubro Rosa.' },
  { c: 'Cantares', d: '2026-10-30', t: 'palestra', l: 'Mossoró - RN', n: 'Momento Outubro Rosa. (Manhã)' },
];

async function insertAgenda() {
  const insertData = events.map(ev => ({
    company: ev.c,
    location: ev.l,
    date: ev.d,
    eventType: ev.t,
    notes: ev.n,
    expectedCount: 50,
    kitReady: false,
    attendedCount: 0,
    returnedAsos: 0,
    scanned: false,
    insertedSOC: false
  }));

  const { data, error } = await supabase
    .from('ipa_campaigns')
    .insert(insertData);

  if (error) {
    console.error('Error inserting campaigns:', error);
  } else {
    console.log('Successfully inserted campaigns using Supabase client!');
  }
}

insertAgenda();
