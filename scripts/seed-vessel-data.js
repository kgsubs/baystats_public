// Script to seed test vessel count data
// Usage: export $(cat .env.local | xargs) && node scripts/seed-vessel-data.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Generate 7 days of test data
async function seedVesselData() {
  const testData = [
    { count: 36, daysAgo: 6 },
    { count: 41, daysAgo: 5 },
    { count: 37, daysAgo: 4 },
    { count: 40, daysAgo: 3 },
    { count: 35, daysAgo: 2 },
    { count: 38, daysAgo: 1 },
    { count: 45, daysAgo: 0 }  // Today
  ]

  console.log('Seeding vessel count data...')

  for (const entry of testData) {
    const date = new Date()
    date.setDate(date.getDate() - entry.daysAgo)
    date.setHours(14, 30, 0, 0)  // 2:30 PM

    const { error } = await supabaseAdmin
      .from('vessel_counts')
      .insert({
        count: entry.count,
        recorded_at: date.toISOString()
      })

    if (error) {
      console.error(`Error inserting day -${entry.daysAgo}:`, error)
    } else {
      console.log(`✓ Inserted: ${entry.count} vessels on ${date.toISOString().split('T')[0]}`)
    }
  }

  console.log('\nSeeding complete!')
}

seedVesselData().catch(console.error)
