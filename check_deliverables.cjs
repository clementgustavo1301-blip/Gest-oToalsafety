const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .in('type', ['treinamento', 'visita_tecnica']);
    
  if (error) {
    console.error(error);
  } else {
    console.log(`Total de treinamentos/visitas: ${data.length}`);
    const within30 = data.filter(d => {
      const dDate = new Date(d.due_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return dDate >= thirtyDaysAgo;
    });
    console.log(`Total nos ultimos 30 dias: ${within30.length}`);
    
    // Contar por tipo
    const types = {};
    data.forEach(d => {
      types[d.type] = (types[d.type] || 0) + 1;
    });
    console.log('Types count:', types);
  }
}

run();
