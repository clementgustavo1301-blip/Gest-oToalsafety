const { Client } = require('pg');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function updateConstraints() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');
    
    // Drop existing constraints if any (it might be named deliverables_status_check)
    console.log('Updating deliverables status constraint...');
    await client.query(`
      ALTER TABLE public.deliverables DROP CONSTRAINT IF EXISTS deliverables_status_check;
      ALTER TABLE public.deliverables ADD CONSTRAINT deliverables_status_check CHECK (status IN ('pendente', 'em_elaboracao', 'entregue', 'adiado', 'cancelado', 'agendado', 'nao_se_aplica'));
    `);
    console.log('Deliverables constraint updated successfully!');

    console.log('Updating trainings status constraint...');
    await client.query(`
      ALTER TABLE public.trainings DROP CONSTRAINT IF EXISTS trainings_status_check;
      ALTER TABLE public.trainings ADD CONSTRAINT trainings_status_check CHECK (status IN ('agendado', 'concluido', 'adiado', 'nao_feito', 'cancelado', 'nao_se_aplica'));
    `);
    console.log('Trainings constraint updated successfully!');
    
  } catch (err) {
    console.error('Error updating constraints:', err);
  } finally {
    await client.end();
  }
}

updateConstraints();
