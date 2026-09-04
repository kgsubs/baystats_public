import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkMarigotServices() {
  const { data } = await supabase
    .from('marina_profiles')
    .select('name, location, services')
    .eq('location', 'Marigot Bay')
    .single()

  if (!data) {
    console.log('No data found')
    return
  }

  console.log(`\n${data.name} - Detailed Service Analysis:`)
  console.log('='.repeat(60))

  const services = data.services as any[]

  console.log(`\nTotal services in array: ${services.length}`)

  // Check for exact duplicates
  const serviceIds = services.map(s => s.id)
  const duplicateIds = serviceIds.filter((id, index) => serviceIds.indexOf(id) !== index)

  if (duplicateIds.length > 0) {
    console.log('\n⚠️  DUPLICATE SERVICE IDs FOUND:')
    duplicateIds.forEach(id => {
      const matches = services.filter(s => s.id === id)
      console.log(`   ID "${id}" appears ${matches.length} times:`)
      matches.forEach((s, i) => {
        console.log(`     ${i + 1}. ${s.name} (${s.emoji}) - enabled: ${s.enabled}`)
      })
    })
  }

  // List all services
  console.log('\nAll services:')
  services.forEach((s, i) => {
    const status = s.enabled ? '✓ ENABLED' : '✗ disabled'
    console.log(`${i + 1}. [${s.id}] ${s.name} (${s.emoji}) - ${status}`)
  })

  // Check for services with same name
  const enabledServices = services.filter(s => s.enabled)
  console.log(`\nEnabled services: ${enabledServices.length}`)

  const nameGroups = enabledServices.reduce((acc, s) => {
    if (!acc[s.name]) acc[s.name] = []
    acc[s.name].push(s)
    return acc
  }, {} as Record<string, any[]>)

  console.log('\nEnabled services grouped by name:')
  Object.entries(nameGroups).forEach(([name, items]) => {
    if (items.length > 1) {
      console.log(`⚠️  "${name}" appears ${items.length} times:`)
      items.forEach((s, i) => {
        console.log(`     ${i + 1}. id: ${s.id}, emoji: ${s.emoji}`)
      })
    } else {
      console.log(`   "${name}" - OK`)
    }
  })
}

checkMarigotServices()
