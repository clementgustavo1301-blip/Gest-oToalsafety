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
    // contagem por mês
    const byMonth = {};
    data.forEach(d => {
      const m = d.due_date ? d.due_date.substring(0,7) : 'no_date';
      byMonth[m] = (byMonth[m] || 0) + 1;
    });
    console.log(byMonth);
  }
}

run();
