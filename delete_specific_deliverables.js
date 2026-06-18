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

async function deleteSpecificDeliverables() {
  const targetTitles = [
    'Portal do Cliente SGG'
  ];

  console.log('Iniciando deleção de entregáveis específicos...');

  const { data, error } = await supabase
    .from('deliverables')
    .delete()
    .in('title', targetTitles);

  if (error) {
    console.error('Erro ao deletar entregáveis:', error.message);
  } else {
    console.log('Entregáveis deletados com sucesso!');
  }
}

deleteSpecificDeliverables();
