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

async function clearDeliverables() {
  console.log('Iniciando limpeza da tabela de entregáveis...');
  
  // To delete all rows, we need a condition that's always true.
  // In Supabase we can do .neq('id', '00000000-0000-0000-0000-000000000000') or similar.
  const { data, error } = await supabase
    .from('deliverables')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Erro ao limpar tabela:', error.message);
  } else {
    console.log('Tabela de entregáveis limpa com sucesso!');
  }
}

clearDeliverables();
