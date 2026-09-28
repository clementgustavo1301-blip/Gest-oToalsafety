const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTI3NDgsImV4cCI6MjA5NzA2ODc0OH0._miOzAIZK6EaGymw-amCMpnVKDC5bIB7HBsOCO14zcM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePalestras() {
  const { data, error } = await supabase
    .from('ipa_campaigns')
    .update({ expectedCount: 0 })
    .eq('eventType', 'palestra');

  if (error) {
    console.error('Error updating palestras:', error);
  } else {
    console.log('Successfully updated expectedCount to 0 for all Palestras!');
  }
}

updatePalestras();
