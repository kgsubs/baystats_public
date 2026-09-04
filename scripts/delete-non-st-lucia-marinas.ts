#!/usr/bin/env tsx
/**
 * Delete all marina records except St. Lucia marinas
 * This removes all Martinique and Grenada marinas from the database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteNonStLuciaMarinas() {
  console.log('🗑️  Deleting non-St. Lucia marinas...');

  // Delete marina profiles
  const { data: marinasDeleted, error: marinasError } = await supabase
    .from('marina_profiles')
    .delete()
    .neq('country', 'Saint Lucia')
    .select();

  if (marinasError) {
    console.error('❌ Error deleting marina profiles:', marinasError);
    process.exit(1);
  }

  console.log(`✅ Deleted ${marinasDeleted?.length || 0} marina profiles`);

  // Delete vessel counts for non-St. Lucia locations
  const stLuciaLocations = ['rodney-bay', 'marigot-bay', 'soufriere', 'jalousie', 'canaries'];

  const { data: countsDeleted, error: countsError } = await supabase
    .from('vessel_counts')
    .delete()
    .not('location', 'in', `(${stLuciaLocations.join(',')})`)
    .select();

  if (countsError) {
    console.error('❌ Error deleting vessel counts:', countsError);
    process.exit(1);
  }

  console.log(`✅ Deleted ${countsDeleted?.length || 0} vessel count records`);
  console.log('\n✨ All non-St. Lucia data has been removed from the database');
}

deleteNonStLuciaMarinas();
