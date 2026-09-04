import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeCanariesPhone() {
  console.log('Removing phone number from Canaries marina...');

  const { data, error } = await supabase
    .from('marina_profiles')
    .update({
      phone: null,
      updated_at: new Date().toISOString()
    })
    .eq('slug', 'canaries')
    .select();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Success! Updated Canaries marina:');
  console.log(data);
}

removeCanariesPhone();
