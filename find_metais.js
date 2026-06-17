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
  const { data: companies } = await supabase.from('companies').select('*');
  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes('fix') || 
    c.name.toLowerCase().includes('fox') || 
    c.name.toLowerCase().includes('metai') || 
    c.name.toLowerCase().includes('esquad')
  );
  console.log('Resultados:');
  filtered.forEach(c => {
    console.log(`- ${c.name} | CNPJ: ${c.cnpj} | ID: ${c.id} | Group: ${c.group_id}`);
  });
}

run();
