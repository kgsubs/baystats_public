#!/usr/bin/env tsx
/**
 * Update all St. Lucia marinas with complete contact and service data
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const ALL_SERVICES = [
  // Power options
  { id: 'power_110v', name: '110V', emoji: '⚡', category: 'power' },
  { id: 'power_220v', name: '220V', emoji: '⚡', category: 'power' },
  { id: 'power_240v', name: '240V', emoji: '⚡', category: 'power' },
  // Basic services
  { id: 'fuel', name: 'Fuel Dock', emoji: '⛽', category: 'basic' },
  { id: 'water', name: 'Water', emoji: '💧', category: 'basic' },
  { id: 'wifi', name: 'WiFi', emoji: '📶', category: 'basic' },
  { id: 'restrooms', name: 'Restrooms', emoji: '🚿', category: 'basic' },
  { id: 'showers', name: 'Showers', emoji: '🚿', category: 'basic' },
  { id: 'chandlery', name: 'Chandlery', emoji: '🛠️', category: 'basic' },
  { id: 'mooring', name: 'Mooring Balls', emoji: '⚓', category: 'basic' },
  { id: 'repairs', name: 'Repairs', emoji: '🔧', category: 'basic' },
  // Amenities
  { id: 'laundry', name: 'Laundry', emoji: '🧺', category: 'amenity' },
  { id: 'provisioning', name: 'Provisioning', emoji: '🛒', category: 'amenity' },
  { id: 'restaurant', name: 'Restaurant', emoji: '🍽️', category: 'amenity' },
  { id: 'bar', name: 'Bar', emoji: '🍺', category: 'amenity' },
  { id: 'pool', name: 'Pool', emoji: '🏊', category: 'amenity' },
  { id: 'security', name: 'Security', emoji: '🔒', category: 'amenity' },
];

function getServicesWithEnabled(enabledIds: string[]) {
  return ALL_SERVICES.map(s => ({
    ...s,
    enabled: enabledIds.includes(s.id)
  }));
}

const marinaUpdates = [
  {
    slug: 'rodney-bay',
    name: 'IGY Rodney Bay Marina',
    phone: '+1 758-458-7200',
    vhf_channel: '16',
    additional_services: {
      email: 'RBM@igymarinas.com',
      fax: '+1 758-452-0185',
      manager: 'Sean Devaux',
      immigration_phone: '+1 758-456-3825',
      customs_phone: '+1 758-452-0235'
    },
    website: 'https://www.igymarinas.com/marinas/rodney-bay-marina/',
    website_label: 'igy-rodneybay.com',
    reserve_berth_url: 'https://www.igymarinas.com/reserve-a-slip/?marina_id=1082',
    total_berths: 253,
    services: getServicesWithEnabled([
      'power_110v', 'power_220v', 'fuel', 'water', 'wifi',
      'restrooms', 'showers', 'chandlery', 'repairs',
      'laundry', 'provisioning', 'restaurant', 'bar', 'security'
    ])
  },
  {
    slug: 'marigot-bay',
    name: 'Marigot Bay Marina',
    phone: '+1 758-451-4275',
    vhf_channel: '12',
    additional_services: {
      email: 'manager@marigotbaymarina.com',
      email_alt: '[email protected]',
      phone_alt: '+1 758-728-9948',
      fax: '+1 758-451-4276',
      dock_master: 'Troy Blanchard - docks@marigotbaymarina.com',
      manager_cell: '+1 758-285-4515'
    },
    website: 'https://marigotbayyachthaven.com/',
    website_label: 'marigotbayyachthaven.com',
    total_berths: 42,
    services: getServicesWithEnabled([
      'power_110v', 'power_220v', 'fuel', 'water', 'wifi',
      'restrooms', 'showers', 'mooring', 'chandlery', 'repairs',
      'laundry', 'provisioning', 'restaurant', 'bar', 'pool', 'security'
    ])
  },
  {
    slug: 'soufriere',
    name: 'Soufrière Marine Management Area',
    phone: '+1 758-459-5500',
    vhf_channel: '16',
    additional_services: {
      email: '[email protected]',
      email_alt: 'smma@candw.lc',
      mobile: '+1 758-724-6331',
      fax: '+1 758-459-7799'
    },
    website: 'https://smmainc.com/',
    website_label: 'smmainc.com',
    total_berths: 60,
    services: getServicesWithEnabled([
      'water', 'mooring', 'provisioning'
    ])
  },
  {
    slug: 'jalousie',
    name: 'Sugar Beach (Jalousie)',
    phone: '+1 758-456-8000',
    vhf_channel: null,
    additional_services: {
      email: 'reservations@viceroyhotelsandresorts.com',
      email_events: 'events@viceroyhotelsandresorts.com',
      phone_us_canada: '+1 800-235-4300',
      phone_international: '+1 925-298-6438'
    },
    website: 'https://www.viceroyhotelsandresorts.com/sugar-beach',
    website_label: 'viceroyhotelsandresorts.com',
    total_berths: 8,
    services: getServicesWithEnabled([
      'water', 'wifi', 'restaurant', 'bar', 'pool', 'security'
    ])
  },
  {
    slug: 'canaries',
    name: 'Canaries',
    phone: null,
    vhf_channel: null,
    additional_services: {
      nearest_authority: 'SMMA',
      smma_phone: '+1 758-459-5500',
      smma_email: '[email protected]'
    },
    website: null,
    website_label: null,
    total_berths: null,
    services: getServicesWithEnabled([
      'water', 'mooring'
    ])
  },
];

async function updateMarinas() {
  console.log('🔄 Updating St. Lucia marinas with complete data...\n');

  for (const update of marinaUpdates) {
    const { slug, ...data } = update;

    const { error } = await supabase
      .from('marina_profiles')
      .update(data)
      .eq('slug', slug);

    if (error) {
      console.error(`❌ Error updating ${slug}:`, error);
    } else {
      console.log(`✅ Updated ${data.name}`);
      console.log(`   Phone: ${data.phone || 'N/A'}`);
      console.log(`   VHF: ${data.vhf_channel || 'N/A'}`);
      console.log(`   Email: ${data.additional_services?.email || 'N/A'}`);
      console.log(`   Services: ${data.services.filter((s: any) => s.enabled).length} enabled`);
      console.log('');
    }
  }

  console.log('✨ All marinas updated!');
}

updateMarinas();
