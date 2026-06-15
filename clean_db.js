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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('Iniciando limpeza do banco de dados via Supabase API...');
  
  try {
    // A API do Supabase exige que passemos um filtro válido para o delete()
    // Usar neq('id', 'uuid-invalido') é um truque para pegar todas as linhas
    const filterId = '00000000-0000-0000-0000-000000000000';

    console.log('Limpando Entregáveis...');
    await supabase.from('deliverables').delete().neq('id', filterId);
    
    console.log('Limpando Treinamentos...');
    await supabase.from('trainings').delete().neq('id', filterId);
    
    console.log('Limpando Contratos...');
    await supabase.from('contracts').delete().neq('id', filterId);
    
    console.log('Limpando Empresas...');
    await supabase.from('companies').delete().neq('id', filterId);
    
    console.log('Limpando Grupos...');
    await supabase.from('groups').delete().neq('id', filterId);
    
    console.log('✅ Banco de dados limpo com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao limpar banco:', error.message);
  }
}

cleanDatabase();
