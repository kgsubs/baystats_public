import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixRestroomsEmoji() {
  console.log('Updating Restrooms emoji from 🚿 to 🚻...\n')

  // Get all marinas
  const { data: marinas } = await supabase
    .from('marina_profiles')
    .select('id, name, location, services')

  if (!marinas) {
    console.log('No marinas found')
    return
  }

  for (const marina of marinas) {
    const services = marina.services as any[]

    // Find restrooms service and update emoji
    let updated = false
    const updatedServices = services.map(s => {
      if (s.id === 'restrooms' && s.emoji === '🚿') {
        updated = true
        return { ...s, emoji: '🚻' }
      }
      return s
    })

    if (updated) {
      console.log(`Updating ${marina.name}...`)
      const { error } = await supabase.rpc('exec_sql', {
        sql_string: `UPDATE marina_profiles SET services = '${JSON.stringify(updatedServices)}'::jsonb WHERE id = '${marina.id}'`
      })

      if (error) {
        console.error(`  Error: ${error.message}`)
      } else {
        console.log('  ✓ Updated')
      }
    }
  }

  console.log('\nVerifying changes...')
  const { data: updated } = await supabase
    .from('marina_profiles')
    .select('name, services')

  updated?.forEach(m => {
    const services = m.services as any[]
    const restrooms = services.find(s => s.id === 'restrooms')
    if (restrooms) {
      console.log(`${m.name}: Restrooms emoji = ${restrooms.emoji}`)
    }
  })
}

fixRestroomsEmoji()
