const { Client } = require('pg');

const connectionString = 'postgresql://postgres:1a2s3d4f5g6h7j8k9l@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function createTables() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to DB');

    const sql = `
      CREATE TABLE IF NOT EXISTS public.ipa_campaigns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        date DATE NOT NULL,
        "eventType" TEXT NOT NULL,
        "kitReady" BOOLEAN DEFAULT false,
        "expectedCount" INTEGER DEFAULT 0,
        "attendedCount" INTEGER DEFAULT 0,
        "returnedAsos" INTEGER DEFAULT 0,
        scanned BOOLEAN DEFAULT false,
        "insertedSOC" BOOLEAN DEFAULT false,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS public.ipa_partners (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        client TEXT NOT NULL,
        "partnerClinic" TEXT NOT NULL,
        state TEXT NOT NULL,
        date DATE NOT NULL,
        value DOUBLE PRECISION DEFAULT 0,
        "invoiceStatus" TEXT NOT NULL,
        "invoiceRef" TEXT,
        paid BOOLEAN DEFAULT false,
        "examsReceived" BOOLEAN DEFAULT false,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        notes TEXT
      );
    `;
    await client.query(sql);
    console.log('Tables ipa_campaigns and ipa_partners created successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

createTables();
