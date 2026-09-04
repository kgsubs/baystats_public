import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkDuplicates() {
  const { data } = await supabase
    .from('marina_profiles')
    .select('name, location, services')
    .eq('location', 'Rodney Bay')
    .single()

  if (!data) {
    console.log('No data found')
    return
  }

  console.log(`\n${data.name} Services:`)
  console.log('='.repeat(50))

  const services = data.services as any[]
  const enabledServices = services.filter(s => s.enabled)

  console.log(`\nTotal services: ${services.length}`)
  console.log(`Enabled services: ${enabledServices.length}\n`)

  // Check for duplicates by ID
  const serviceIds = enabledServices.map(s => s.id)
  const duplicateIds = serviceIds.filter((id, index) => serviceIds.indexOf(id) !== index)

  if (duplicateIds.length > 0) {
    console.log('⚠️  DUPLICATE SERVICE IDs FOUND:')
    duplicateIds.forEach(id => console.log(`   - ${id}`))
  }

  // Check for duplicates by name
  const serviceNames = enabledServices.map(s => s.name)
  const duplicateNames = serviceNames.filter((name, index) => serviceNames.indexOf(name) !== index)

  if (duplicateNames.length > 0) {
    console.log('⚠️  DUPLICATE SERVICE NAMES FOUND:')
    duplicateNames.forEach(name => console.log(`   - ${name}`))
  }

  console.log('\nAll enabled services:')
  enabledServices.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.emoji}) [id: ${s.id}]`)
  })

  // Group by emoji to see if multiple services share the same emoji
  const emojiGroups = enabledServices.reduce((acc, s) => {
    if (!acc[s.emoji]) acc[s.emoji] = []
    acc[s.emoji].push(s.name)
    return acc
  }, {} as Record<string, string[]>)

  console.log('\nServices grouped by emoji:')
  Object.entries(emojiGroups).forEach(([emoji, names]) => {
    if (names.length > 1) {
      console.log(`${emoji} -> ${names.join(', ')} ⚠️  MULTIPLE SERVICES`)
    } else {
      console.log(`${emoji} -> ${names[0]}`)
    }
  })
}

checkDuplicates()
