import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkLocations() {
  const { data } = await supabase
    .from('marina_profiles')
    .select('location, name')
    .order('location')

  console.table(data)
}

checkLocations()
