import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envContent = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf-8');

const getEnv = (key) => {
  const line = envContent.split('\n').find(l => l.startsWith(key + '='));
  return line ? line.substring(key.length + 1).trim() : null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Procurar grupo com 'fix' no nome (case-insensitive via ilike)
  const { data: groups } = await supabase.from('groups').select('*').ilike('name', '%fix%');
  
  if (!groups || groups.length === 0) {
    console.log('Nenhum grupo encontrado com o nome "fix".');
    return;
  }
  
  const targetGroup = groups[0];
  console.log(`Grupo encontrado: ${targetGroup.name} (ID: ${targetGroup.id})`);

  // 2. Procurar a empresa "FIX ESQUADRIAS"
  const { data: companies } = await supabase.from('companies').select('*').ilike('name', '%FIX ESQUADRIAS%');
  
  if (!companies || companies.length === 0) {
    console.log('Nenhuma empresa encontrada com "FIX ESQUADRIAS" no nome.');
    return;
  }

  const targetCompany = companies[0];
  console.log(`Empresa encontrada: ${targetCompany.name} (ID: ${targetCompany.id}, Grupo atual: ${targetCompany.group_id})`);

  // 3. Atualizar a empresa para o grupo correto
  if (targetCompany.group_id !== targetGroup.id) {
    const { error } = await supabase.from('companies').update({ group_id: targetGroup.id }).eq('id', targetCompany.id);
    if (error) {
      console.error('Erro ao atualizar grupo da empresa:', error);
    } else {
      console.log(`✅ Sucesso! Empresa '${targetCompany.name}' movida para o grupo '${targetGroup.name}'.`);
    }
  } else {
    console.log('A empresa já está neste grupo.');
  }
}

run();
