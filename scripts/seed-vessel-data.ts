/**
 * Seed script for vessel count data
 * Generates 14 days of realistic mock data for testing
 * Run with: npx ts-node scripts/seed-vessel-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'NOT SET');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'NOT SET');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Sample reporters and notes
const reporters = [
  'John (Dock Master)',
  'Sarah (Assistant)',
  'Mike (Evening Staff)',
  'Lisa (Morning Staff)',
  'Carlos (Weekend Duty)'
];

const morningNotes = [
  'Quiet morning, few overnight departures',
  'Charter fleet departed early',
  'Calm conditions, steady arrivals',
  'Busy with yacht club event setup',
  'Several early morning arrivals',
  'Light traffic, maintenance day',
  'Weekend rush starting',
  'Holiday weekend approaching'
];

const eveningNotes = [
  'High activity, many day-trippers returned',
  'Charter boats back in marina',
  'Storm warning - boats seeking shelter',
  'Full house with festival visitors',
  'Sunday evening quiet settling in',
  'Race day - all boats returned safely',
  'Busy restaurant night at marina',
  'Full occupancy expected overnight'
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

async function seedVesselData() {
  console.log('🚢 Seeding vessel count data...\n');

  const records = [];
  const now = new Date();
  
  // Generate 14 days of data
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Morning entry (9 AM)
    const morningDate = new Date(date);
    morningDate.setHours(9, randomInt(0, 30), 0, 0);
    
    // Morning counts: 35-50 (slightly lower)
    const morningCount = randomInt(35, 50);
    
    records.push({
      count: morningCount,
      recorded_at: morningDate.toISOString(),
      time_of_day: 'morning',
      reporter: randomElement(reporters),
      notes: randomInt(0, 3) === 0 ? randomElement(morningNotes) : null,
      source: 'SEED_DATA'
    });
    
    // Evening entry (4 PM)
    const eveningDate = new Date(date);
    eveningDate.setHours(16, randomInt(0, 30), 0, 0);
    
    // Evening counts: 40-55 (slightly higher than morning)
    const eveningCount = randomInt(40, 55);
    
    records.push({
      count: eveningCount,
      recorded_at: eveningDate.toISOString(),
      time_of_day: 'evening',
      reporter: randomElement(reporters),
      notes: randomInt(0, 3) === 0 ? randomElement(eveningNotes) : null,
      source: 'SEED_DATA'
    });
  }

  console.log(`Generated ${records.length} records (14 days × 2 entries/day)`);
  console.log('Sample entries:');
  records.slice(0, 4).forEach(r => {
    console.log(`  ${r.time_of_day.toUpperCase()}: ${r.count} vessels on ${new Date(r.recorded_at).toLocaleDateString()} by ${r.reporter}`);
  });
  console.log('  ...\n');

  // Insert into database
  console.log('Inserting into database...');
  
  const { data, error } = await supabase
    .from('vessel_counts')
    .insert(records)
    .select();

  if (error) {
    console.error('❌ Error inserting vessel data:', error.message);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${data?.length || 0} vessel count records`);
  
  // Show summary
  const morningAvg = Math.round(
    records
      .filter(r => r.time_of_day === 'morning')
      .reduce((sum, r) => sum + r.count, 0) / 14
  );
  
  const eveningAvg = Math.round(
    records
      .filter(r => r.time_of_day === 'evening')
      .reduce((sum, r) => sum + r.count, 0) / 14
  );
  
  console.log('\n📊 Summary:');
  console.log(`   Average morning count: ${morningAvg} vessels`);
  console.log(`   Average evening count: ${eveningAvg} vessels`);
  console.log(`   Date range: ${new Date(records[0].recorded_at).toLocaleDateString()} - ${new Date(records[records.length - 1].recorded_at).toLocaleDateString()}`);
  console.log('\n🎉 Seed complete!');
}

// Run the seed
seedVesselData().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
