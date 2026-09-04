#!/usr/bin/env tsx
/**
 * Debug script to check services data in the database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugServices() {
  console.log('🔍 Checking marina services data...\n');

  // Get all St. Lucia marinas
  const { data: marinas, error } = await supabase
    .from('marina_profiles')
    .select('*')
    .eq('country', 'Saint Lucia');

  if (error) {
    console.error('❌ Error fetching marinas:', error);
    process.exit(1);
  }

  console.log(`Found ${marinas?.length || 0} St. Lucia marinas\n`);

  for (const marina of marinas || []) {
    console.log(`\n📍 ${marina.name} (${marina.slug})`);
    console.log('   Services field:', marina.services ? JSON.stringify(marina.services, null, 2) : 'NULL');
    console.log('   Legacy power_connections:', marina.power_connections || 'NULL');
    console.log('   Legacy water_availability:', marina.water_availability || 'NULL');
    console.log('   Legacy wifi:', marina.wifi || 'NULL');
    console.log('   Legacy fuel_dock:', marina.fuel_dock || 'NULL');
  }
}

debugServices();
