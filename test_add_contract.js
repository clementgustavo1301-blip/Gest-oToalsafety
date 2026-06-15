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
  console.log('Testing...');
  
  // Get a company
  const { data: companies } = await supabase.from('companies').select('*');
  if (!companies || companies.length === 0) {
    console.log('No companies found to test.');
    return;
  }
  
  const companyId = companies[0].id;

  const payload = {
    company_id: companyId,
    contract_number: 'TEST-123',
    description: '',
    start_date: null,
    end_date: null,
    status: 'ativo',
    value: null,
    file_path: undefined
  };

  const { data, error } = await supabase.from('contracts').insert([payload]).select().single();
  
  if (error) {
    console.error('Insert Failed:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

testIt();
