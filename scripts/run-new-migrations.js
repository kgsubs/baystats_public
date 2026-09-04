#!/usr/bin/env node
// Run only new migrations (020, 021, 022)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const newMigrations = [
  '020_add_7_grenada_marinas.sql',
  '021_update_st_lucia_contact_info.sql',
  '022_add_placeholder_vessel_counts.sql'
];

async function execSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    },
    body: JSON.stringify({ sql_string: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return response.json();
}

async function runMigrations() {
  console.log(`Running ${newMigrations.length} new migrations\n`);

  for (const file of newMigrations) {
    const filePath = path.join(migrationsDir, file);

    if (!fs.existsSync(filePath)) {
      console.log(`Skipping: ${file} (not found)`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running: ${file}`);

    try {
      await execSql(sql);
      console.log(`  ✓ OK`);
    } catch (err) {
      console.error(`  ✗ ERROR: ${err.message}`);
      // Continue with next migration instead of exiting
    }
  }

  console.log('\n✓ Migration run completed!');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
