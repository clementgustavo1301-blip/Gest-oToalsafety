const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: groups } = await supabase.from('groups').select('*');
  const targetGroups = groups.filter(g => 
    g.name.toLowerCase().includes('prever') || 
    g.name.toLowerCase().includes('mvp')
  );
  
  const groupIds = targetGroups.map(g => g.id);
  console.log('Target groups:', targetGroups.map(g => g.name));
  
  const { data: companies } = await supabase.from('companies').select('*').in('group_id', groupIds);
  console.log('Companies to update:', companies.length);
  
  let updatedCount = 0;
  for (const c of companies) {
    const rawCat = c.category || 'TotalSafety';
    const catName = rawCat.split(' - ')[0];
    const newCategory = `${catName} - Natal`;
    if (rawCat !== newCategory) {
      await supabase.from('companies').update({ category: newCategory }).eq('id', c.id);
      updatedCount++;
    }
  }
  console.log('Updated:', updatedCount);
}
run();
