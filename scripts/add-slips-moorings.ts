import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Step 1: Adding columns...')
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql_string: `
      ALTER TABLE marina_profiles
      ADD COLUMN IF NOT EXISTS total_slips INTEGER,
      ADD COLUMN IF NOT EXISTS total_moorings INTEGER;
    `
  })
  if (alterError) {
    console.error('Error adding columns:', alterError)
    return
  }
  console.log('✓ Columns added')

  console.log('\nStep 2: Updating Rodney Bay...')
  const { error: rodneyError } = await supabase.rpc('exec_sql', {
    sql_string: "UPDATE marina_profiles SET total_slips = 253, total_moorings = 20 WHERE location = 'Rodney Bay'"
  })
  if (rodneyError) {
    console.error('Error:', rodneyError)
  } else {
    console.log('✓ Updated')
  }

  console.log('\nStep 3: Updating Marigot Bay...')
  const { error: marigotError } = await supabase.rpc('exec_sql', {
    sql_string: "UPDATE marina_profiles SET total_slips = 42, total_moorings = 20 WHERE location = 'Marigot Bay'"
  })
  if (marigotError) {
    console.error('Error:', marigotError)
  } else {
    console.log('✓ Updated')
  }

  console.log('\nVerifying data...')
  const { data, error } = await supabase
    .from('marina_profiles')
    .select('name, location, total_slips, total_moorings')
    .order('location')

  if (error) {
    console.error('Error fetching data:', error)
  } else {
    console.table(data)
  }
}

runMigration()
