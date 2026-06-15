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

async function testIt() {
  console.log('Testing Deliverables Insert...');
  
  const { data: companies } = await supabase.from('companies').select('*');
  if (!companies || companies.length === 0) {
    console.log('No companies found.');
    return;
  }
  const companyId = companies[0].id;

  const payload = {
    company_id: companyId,
    contract_id: null,
    title: 'Teste Entregavel',
    type: 'programa',
    status: 'pendente',
    due_date: '2026-06-15',
    validity_date: null,
    delivered_date: null,
    file_name: null,
    reason: null
  };

  const { data, error } = await supabase.from('deliverables').insert([payload]).select().single();
  
  if (error) {
    console.error('Insert Failed:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

testIt();
