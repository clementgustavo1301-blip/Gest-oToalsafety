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
  const oldCompanyId = 'a91aef74-7e97-4772-aea5-cba4bdad2b8f'; // FIX ESQUADRIAS LTDA
  const newCompanyId = 'a47c12d9-e324-4d14-9040-954b3aa96ff5'; // Metáis
  
  // 1. Atualizar o nome da nova empresa para 'Fox Metais' caso tenha sido erro de digitação
  await supabase.from('companies').update({ name: 'Fox Metais' }).eq('id', newCompanyId);

  // 2. Transferir os entregáveis da velha para a nova
  const { error: transferError } = await supabase.from('deliverables').update({ company_id: newCompanyId }).eq('company_id', oldCompanyId);
  if (transferError) {
    console.error('Erro ao transferir entregáveis:', transferError);
    return;
  }
  
  // 3. Deletar a velha
  const { error: deleteError } = await supabase.from('companies').delete().eq('id', oldCompanyId);
  if (deleteError) {
    console.error('Erro ao deletar empresa antiga:', deleteError);
  } else {
    console.log('Sucesso! Entregáveis movidos e empresa antiga deletada.');
  }
}

run();
