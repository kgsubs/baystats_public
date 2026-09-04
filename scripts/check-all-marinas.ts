#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkMarinas() {
  const { data, error } = await supabase
    .from('marina_profiles')
    .select('*');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`\nTotal marinas in database: ${data?.length || 0}\n`);

  for (const marina of data || []) {
    console.log(`- ${marina.name} | Country: "${marina.country}" | Slug: ${marina.slug}`);
  }
}

checkMarinas();
