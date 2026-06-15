import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env.local');

const envFile = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  console.log('Verificando se as tabelas estão bloqueadas pelo RLS...');
  // Tenta criar um grupo e apagar pra ver se a API funciona pra o cliente React.
  const { data, error } = await supabase.from('groups').insert([{ name: 'Test RLS' }]).select();
  if (error) {
    console.log('❌ O Insert falhou! Erro:', error.message);
  } else {
    console.log('✅ Insert funcionou:', data);
    await supabase.from('groups').delete().eq('id', data[0].id);
  }
}
checkRLS();
