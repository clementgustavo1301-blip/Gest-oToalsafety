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

const groupsData = [
  { name: 'Grupo ZEFLEX' },
  { name: 'Grupo Progel' },
  { name: 'Quintas do Lago' }
];

const companiesData = [
  { group: 'Grupo ZEFLEX', name: 'ZEFLEX Industria de esferas', cnpj: '43.663.405/0001-12' },
  { group: 'Grupo Progel', name: 'progel mineração', cnpj: '48.378.172/0001-20' },
  { group: 'Grupo Progel', name: 'Projetos geologicos', cnpj: '05.167.985/0001-68' },
  { group: 'Quintas do Lago', name: 'associações quintas do Lago mossoro', cnpj: '12.840.852/0001-76' }
];

async function seed() {
  console.log('Iniciando seed final...');
  
  const groupMap = {};
  for (const g of groupsData) {
    const { data: existing } = await supabase.from('groups').select('*').eq('name', g.name).single();
    if (existing) {
      groupMap[g.name] = existing.id;
    } else {
      const { data, error } = await supabase.from('groups').insert([g]).select().single();
      if (error) console.error('Erro ao inserir grupo', g.name, error.message);
      else groupMap[g.name] = data.id;
    }
  }

  for (const c of companiesData) {
    const groupId = groupMap[c.group];
    if (!groupId) continue;

    const companyData = {
      name: c.name,
      cnpj: c.cnpj,
      group_id: groupId
    };

    const { error } = await supabase.from('companies').insert([companyData]);
    if (error && error.code !== '23505') { 
      console.error('Erro ao inserir empresa', c.name, error.message);
    } else {
      console.log(`Empresa ${c.name} inserida/atualizada.`);
    }
  }

  console.log('Seed finalizado!');
}

seed();
