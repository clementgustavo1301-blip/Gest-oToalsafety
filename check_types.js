import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTypes() {
  const { data, error } = await supabase.from('deliverables').select('title, type');
  if (error) console.error(error);
  
  const uniqueTitles = [...new Set(data.map(d => d.title))];
  console.log(uniqueTitles);
}
checkTypes();
