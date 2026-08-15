require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateAllToMossoro() {
  console.log('Buscando empresas...');
  const { data: companies, error: fetchError } = await supabase.from('companies').select('id, category');
  
  if (fetchError) {
    console.error('Erro ao buscar empresas:', fetchError);
    return;
  }
  
  console.log(`Encontradas ${companies.length} empresas. Atualizando para Mossoró...`);
  
  let updatedCount = 0;
  for (const company of companies) {
    const rawCat = company.category || 'TotalSafety';
    const parts = rawCat.split(' - ');
    const catName = parts[0];
    
    const newCategory = `${catName} - Mossoró`;
    
    if (rawCat !== newCategory) {
      const { error: updateError } = await supabase.from('companies').update({ category: newCategory }).eq('id', company.id);
      if (updateError) {
        console.error(`Erro ao atualizar empresa ID ${company.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Sucesso! ${updatedCount} empresas foram atualizadas para a região de Mossoró.`);
}

updateAllToMossoro();
