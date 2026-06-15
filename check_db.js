import { createClient } from '@supabase/supabase-js';

const url = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM';

const supabase = createClient(url, key);

async function check() {
  const { data: d } = await supabase.from('deliverables').select('*');
  console.log('Deliverables:', JSON.stringify(d, null, 2));
}
check();
