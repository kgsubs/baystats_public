#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkContactInfo() {
  const { data, error } = await supabase
    .from('marina_profiles')
    .select('name, slug, phone, vhf_channel, additional_services')
    .eq('country', 'Saint Lucia');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('\n📞 Contact Info for St. Lucia Marinas:\n');

  for (const marina of data || []) {
    console.log(`${marina.name} (${marina.slug}):`);
    console.log(`  Phone: ${marina.phone || 'NULL'}`);
    console.log(`  VHF: ${marina.vhf_channel || 'NULL'}`);
    console.log(`  Additional Services:`, marina.additional_services || 'NULL');
    console.log('');
  }
}

checkContactInfo();
