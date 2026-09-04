import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function removeNonMarinas() {
  const nonMarinas = ['Canaries', 'Jalousie', 'Soufrière']

  console.log('Removing non-marina locations from database...\n')

  for (const location of nonMarinas) {
    console.log(`Deleting ${location}...`)

    // Delete from marina_profiles
    const { error: marinaError } = await supabase
      .from('marina_profiles')
      .delete()
      .eq('location', location)

    if (marinaError) {
      console.error(`  Error deleting ${location} from marina_profiles:`, marinaError)
    } else {
      console.log(`  ✓ Deleted from marina_profiles`)
    }

    // Delete from vessel_counts (if exists)
    const { error: vesselError } = await supabase
      .from('vessel_counts')
      .delete()
      .eq('location', location.toLowerCase())

    if (vesselError) {
      console.error(`  Error deleting ${location} from vessel_counts:`, vesselError)
    } else {
      console.log(`  ✓ Deleted from vessel_counts`)
    }
  }

  console.log('\nVerifying remaining marinas...')
  const { data } = await supabase
    .from('marina_profiles')
    .select('name, location')
    .order('location')

  console.table(data)
}

removeNonMarinas()
