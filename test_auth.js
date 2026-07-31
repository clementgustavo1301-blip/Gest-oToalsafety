import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('user_links')
    .select('*, profiles(name)')
    .limit(2);
    
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
