import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching trainings for June 16 and 18...');
  const { data: trainings, error } = await supabase
    .from('trainings')
    .select('*')
    .in('date', ['2026-06-16', '2026-06-18']);

  if (error) {
    console.error('Error fetching trainings:', error);
    return;
  }

  console.log(`Found ${trainings.length} trainings.`);

  for (const t of trainings) {
    console.log(`Deleting training ${t.id} (${t.title}) on ${t.date}`);
    const { error: delErr } = await supabase.from('trainings').delete().eq('id', t.id);
    if (delErr) {
      console.error('Failed to delete training:', delErr);
      continue;
    }

    if (t.deliverable_id) {
      console.log(`Reverting deliverable ${t.deliverable_id} to pendente...`);
      const { error: upErr } = await supabase.from('deliverables').update({ status: 'pendente' }).eq('id', t.deliverable_id);
      if (upErr) {
        console.error('Failed to update deliverable:', upErr);
      } else {
        console.log('Success!');
      }
    }
  }

  console.log('Done!');
}

run();
