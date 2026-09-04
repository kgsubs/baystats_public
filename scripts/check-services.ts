import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkServices() {
  const { data, error } = await supabase
    .from('marina_profiles')
    .select('name, location, services')
    .order('location')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\nServices data in database:\n')
  data?.forEach(marina => {
    console.log(`\n${marina.name} (${marina.location}):`)
    if (marina.services && Array.isArray(marina.services)) {
      console.log(`  Total services: ${marina.services.length}`)
      const enabled = marina.services.filter((s: any) => s.enabled)
      console.log(`  Enabled services: ${enabled.length}`)
      enabled.forEach((s: any) => console.log(`    - ${s.name} (${s.emoji})`))
    } else {
      console.log('  NO SERVICES DATA')
    }
  })
}

checkServices()
