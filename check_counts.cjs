const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
  const { data, error } = await supabase.from('ipa_campaigns').select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  let campanha = 0;
  let acao = 0;
  let palestra = 0;
  
  data.forEach(c => {
    if (c.eventType === 'campanha') campanha++;
    else if (c.eventType === 'acao') acao++;
    else if (c.eventType === 'palestra') palestra++;
    else console.log('Unknown type:', c.eventType);
  });
  
  console.log(`Campanha: ${campanha}, Acao: ${acao}, Palestra: ${palestra}`);
  
  // Exibir campanhas
  data.filter(c => c.eventType === 'campanha').forEach(c => console.log(c.company, c.date));
}

checkCounts();
