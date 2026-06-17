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
  const { data: groups } = await supabase.from('groups').select('*').limit(1);
  if (!groups || groups.length === 0) {
    console.log('Sem grupos para testar.');
    return;
  }
  const groupId = groups[0].id;
  console.log('Testando inserção de empresa no grupo:', groupId);
  
  // Pegar cnpj existente
  const { data: comp } = await supabase.from('companies').select('cnpj').limit(1);
  const existingCnpj = comp[0].cnpj;

  const { data, error } = await supabase.from('companies').insert([{
    group_id: groupId,
    name: 'TESTE EMPRESA MANUAL 2',
    cnpj: existingCnpj,
    contact: 'Teste',
    phone: '11999999999'
  }]).select().single();

  if (error) {
    console.error('ERRO AO INSERIR EMPRESA (Duplicada):', error);
  } else {
    console.log('EMPRESA INSERIDA COM SUCESSO (Duplicada):', data);
    await supabase.from('companies').delete().eq('id', data.id);
  }
}

run();
