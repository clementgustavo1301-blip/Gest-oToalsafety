import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCATTable() {
  const { data, error } = await supabase.from('cat_records').select('*').limit(1);
  if (error) {
    console.log('Cat table check error:', error.message);
  } else {
    console.log('Cat table exists! Data:', data);
  }
}

testCATTable();
