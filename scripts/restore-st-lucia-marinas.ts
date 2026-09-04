#!/usr/bin/env tsx
/**
 * Restore St. Lucia marinas to the database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const DEFAULT_SERVICES = [
  // Power options
  { id: 'power_110v', name: '110V', emoji: '⚡', category: 'power', enabled: true },
  { id: 'power_220v', name: '220V', emoji: '⚡', category: 'power', enabled: true },
  { id: 'power_240v', name: '240V', emoji: '⚡', category: 'power', enabled: false },
  // Basic services
  { id: 'fuel', name: 'Fuel Dock', emoji: '⛽', category: 'basic', enabled: true },
  { id: 'water', name: 'Water', emoji: '💧', category: 'basic', enabled: true },
  { id: 'wifi', name: 'WiFi', emoji: '📶', category: 'basic', enabled: true },
  { id: 'restrooms', name: 'Restrooms', emoji: '🚿', category: 'basic', enabled: true },
  { id: 'showers', name: 'Showers', emoji: '🚿', category: 'basic', enabled: true },
  { id: 'chandlery', name: 'Chandlery', emoji: '🛠️', category: 'basic', enabled: true },
  { id: 'mooring', name: 'Mooring Balls', emoji: '⚓', category: 'basic', enabled: false },
  { id: 'repairs', name: 'Repairs', emoji: '🔧', category: 'basic', enabled: true },
  // Amenities
  { id: 'laundry', name: 'Laundry', emoji: '🧺', category: 'amenity', enabled: true },
  { id: 'provisioning', name: 'Provisioning', emoji: '🛒', category: 'amenity', enabled: true },
  { id: 'restaurant', name: 'Restaurant', emoji: '🍽️', category: 'amenity', enabled: true },
  { id: 'bar', name: 'Bar', emoji: '🍺', category: 'amenity', enabled: true },
  { id: 'pool', name: 'Pool', emoji: '🏊', category: 'amenity', enabled: false },
  { id: 'security', name: 'Security', emoji: '🔒', category: 'amenity', enabled: true },
];

async function restoreMarinas() {
  console.log('🔄 Restoring St. Lucia marinas...\n');

  const marinas = [
    {
      name: 'IGY Rodney Bay Marina',
      slug: 'rodney-bay',
      location: 'Rodney Bay',
      country: 'Saint Lucia',
      address: 'Rodney Bay, Gros Islet, St. Lucia',
      phone: '+1-758-452-0324',
      website: 'http://www.igy-rodneybay.com',
      website_label: 'igy-rodneybay.com',
      latitude: 14.0808,
      longitude: -60.9551,
      total_berths: 253,
      power_connections: '110/220V shore power connections',
      water_availability: 'Potable water available at docks',
      fuel_dock: 'Dedicated fuel dock with gasoline and diesel',
      wifi: 'Available within marina complex',
      chandlery: 'Well-stocked chandlery on site',
      restrooms_showers: 'Modern restrooms and shower facilities available',
      status: 'approved',
      services: DEFAULT_SERVICES,
    },
    {
      name: 'Marigot Bay Marina',
      slug: 'marigot-bay',
      location: 'Marigot Bay',
      country: 'Saint Lucia',
      address: 'Marigot Bay, St. Lucia',
      phone: '+1-758-451-4974',
      website: 'https://www.marigotbaymarina.com',
      website_label: 'marigotbaymarina.com',
      latitude: 13.9667,
      longitude: -61.0167,
      total_berths: 40,
      power_connections: '110/220V shore power',
      water_availability: 'Potable water at all slips',
      fuel_dock: 'Diesel and gasoline available dockside',
      wifi: 'Free WiFi throughout marina',
      chandlery: 'Chandlery on site',
      restrooms_showers: 'Modern facilities with showers and restrooms',
      status: 'approved',
      services: DEFAULT_SERVICES,
    },
    {
      name: 'Soufrière',
      slug: 'soufriere',
      location: 'Soufrière',
      country: 'Saint Lucia',
      address: 'Soufrière, St. Lucia',
      phone: '+1-758-459-7200',
      website: null,
      website_label: null,
      latitude: 13.8539,
      longitude: -61.0623,
      total_berths: 15,
      power_connections: null,
      water_availability: 'Available',
      fuel_dock: null,
      wifi: null,
      chandlery: null,
      restrooms_showers: 'Basic facilities',
      status: 'approved',
      services: [
        ...DEFAULT_SERVICES.map(s => ({ ...s, enabled: s.id === 'water' }))
      ],
    },
    {
      name: 'Jalousie (Sugar Beach)',
      slug: 'jalousie',
      location: 'Jalousie',
      country: 'Saint Lucia',
      address: 'Jalousie, St. Lucia',
      phone: '+1-758-459-7000',
      website: 'https://www.sugarbeachresort.com',
      website_label: 'sugarbeachresort.com',
      latitude: 13.8246,
      longitude: -61.0681,
      total_berths: 8,
      power_connections: null,
      water_availability: 'Available',
      fuel_dock: null,
      wifi: 'Available at resort',
      chandlery: null,
      restrooms_showers: 'Resort facilities available',
      status: 'approved',
      services: [
        ...DEFAULT_SERVICES.map(s => ({
          ...s,
          enabled: s.id === 'water' || s.id === 'wifi' || s.id === 'restaurant' || s.id === 'bar'
        }))
      ],
    },
    {
      name: 'Canaries',
      slug: 'canaries',
      location: 'Canaries',
      country: 'Saint Lucia',
      address: 'Canaries, St. Lucia',
      phone: null,
      website: null,
      website_label: null,
      latitude: 13.9077,
      longitude: -61.0676,
      total_berths: 5,
      power_connections: null,
      water_availability: null,
      fuel_dock: null,
      wifi: null,
      chandlery: null,
      restrooms_showers: null,
      status: 'approved',
      services: [
        ...DEFAULT_SERVICES.map(s => ({ ...s, enabled: false }))
      ],
    },
  ];

  for (const marina of marinas) {
    const { data, error } = await supabase
      .from('marina_profiles')
      .insert([marina])
      .select();

    if (error) {
      console.error(`❌ Error restoring ${marina.name}:`, error);
    } else {
      console.log(`✅ Restored ${marina.name}`);
    }
  }

  console.log('\n✨ Restoration complete!');
}

restoreMarinas();
