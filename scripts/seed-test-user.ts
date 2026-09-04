// Seed test user for QA
// Usage: npx ts-node scripts/seed-test-user.ts

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local')
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedTestUser() {
  const email = process.env.SEED_USER_EMAIL || ''
  const password = process.env.SEED_USER_PASSWORD || ''

  if (!email || !password) {
    console.error('Set SEED_USER_EMAIL and SEED_USER_PASSWORD before running this script')
    process.exit(1)
  }
  const tier = 'pro' // Give pro tier for full access during QA

  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      console.log(`✓ User ${email} already exists`)
      console.log('  You can log in with:')
      console.log(`  Email: ${email}`)
      console.log(`  Password: ${password}`)
      return
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user into our custom users table
    const { data: user, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        tier
      })
      .select('id, email, tier')
      .single()

    if (insertError || !user) {
      console.error('✗ Failed to create user:', insertError?.message)
      process.exit(1)
    }

    // Create Supabase Auth user (linked by email)
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_id: user.id }
    })

    if (authError) {
      console.warn('⚠ Auth user creation warning:', authError.message)
      // Continue anyway - user is created in our table
    }

    console.log('✓ Test user created successfully!')
    console.log('')
    console.log('Login credentials:')
    console.log(`  Email:    ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`  Tier:     ${tier}`)
    console.log('')
    console.log('Go to http://localhost:5173/login and sign in!')

  } catch (error) {
    console.error('✗ Error:', error)
    process.exit(1)
  }
}

seedTestUser()
