import { createClient } from '@supabase/supabase-js';

const url = 'https://uqwdepwqrrwzwesfysbz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd2RlcHdxcnJ3endlc2Z5c2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgzMDQ3MzgsImV4cCI6MjAzMzg4MDczOH0.d_d3M6W63HjB29o7xX7l2qD4fF_T0kZ9_L3_N6_p1_Y';
const supabase = createClient(url, key);

async function testInsert() {
  const { data: companies } = await supabase.from('companies').select('*');
  const companyId = companies[0]?.id;
  
  if (!companyId) {
    console.log('No companies found.');
    return;
  }

  const { data, error } = await supabase.from('trainings').insert([{
    company_id: companyId,
    deliverable_id: null,
    title: 'Test Training CLI',
    date: '2026-06-15',
    time: '08:00 - 12:00',
    status: 'agendado',
    instructor: 'John',
    participants: 5
  }]).select().single();

  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
  }
}

testInsert();
