#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addServicesColumn() {
  console.log('Adding services column...');

  const { error } = await supabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE marina_profiles
      ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
    `
  });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('✅ Services column added!');
}

addServicesColumn();
