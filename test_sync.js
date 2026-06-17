import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const envUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const envKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(envUrl, envKey);

async function testSync() {
  console.log('Testing sync...');
  
  // Find a training that is linked to a deliverable
  const { data: trainings, error: err1 } = await supabase.from('trainings').select('*').not('deliverable_id', 'is', null).limit(1);
  if (err1) { console.error('Error fetching training:', err1); return; }
  
  if (trainings.length === 0) {
    console.log('No trainings linked to deliverables found.');
    return;
  }
  
  const training = trainings[0];
  console.log('Found training:', training);
  
  // Check the deliverable status before
  const { data: delivBefore } = await supabase.from('deliverables').select('*').eq('id', training.deliverable_id).single();
  console.log('Deliverable before:', delivBefore);
  
  // Call updateDeliverable logic manually to simulate
  const deliverableId = training.deliverable_id;
  const updates = { status: 'feito' };
  
  // Update deliverable
  const { data: updDeliv, error: err2 } = await supabase.from('deliverables').update({ status: 'feito' }).eq('id', deliverableId).select().single();
  console.log('Updated deliverable:', updDeliv);
  
  // Update training
  let trainingStatus = 'concluido';
  const { data: updTrain, error: err3 } = await supabase.from('trainings').update({ status: trainingStatus }).eq('deliverable_id', deliverableId).select().single();
  console.log('Updated training:', updTrain);
  
  // Reset back to pendente/agendado
  await supabase.from('deliverables').update({ status: delivBefore.status }).eq('id', deliverableId);
  await supabase.from('trainings').update({ status: training.status }).eq('id', training.id);
  console.log('Reset complete.');
}

testSync();
