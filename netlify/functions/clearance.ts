import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { verifyJwt } from '../../src/lib/auth'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

interface MarinaInfo {
  name: string
  address: string
  phone: string
  website: string
  website_label: string
  source_url: string
  source_name: string
  // Extended fields from marina_profiles
  boat_size_capacity?: string
  total_berths?: number
  total_slips?: number
  total_moorings?: number
  mooring_ball_availability?: string
  restrooms_showers?: string
  water_depth?: string
  fuel_dock?: string
  water_availability?: string
  power_connections?: string
  maintenance_repair?: string
  chandlery?: string
  wifi?: string
  amenities?: string[]
  services?: Array<{
    id: string
    name: string
    emoji: string
    enabled: boolean
    category?: string
  }>
  // Location and booking
  latitude?: number
  longitude?: number
  reserve_berth_url?: string
  // Additional services and communication
  additional_services?: Record<string, string>
  vhf_channel?: string
}

interface ClearanceInfo {
  customs_hours: string
  immigration_hours: string
  fees: {
    entry_per_person: number
    exit_per_person: number
    overtime_penalty: number
  }
  marina: MarinaInfo
  last_updated: string
  notes?: string
}

interface Schedule {
  mon_fri: string
  saturday?: string
  sunday?: string
}

interface OfficeStatus {
  hours: string
  is_open: boolean
  next_open: string | null
  next_close: string | null
  schedule: Schedule
  status_line: string
}

// Parse hours string like "08:00-16:00 AST" into open/close times
function parseHours(hoursStr: string): { openHour: number; openMinute: number; closeHour: number; closeMinute: number } | null {
  const match = hoursStr.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/)
  if (!match) return null
  
  return {
    openHour: parseInt(match[1], 10),
    openMinute: parseInt(match[2], 10),
    closeHour: parseInt(match[3], 10),
    closeMinute: parseInt(match[4], 10)
  }
}

// Get current time in AST (Atlantic Standard Time, UTC-4)
function getASTTime(): Date {
  const now = new Date()
  // AST is UTC-4
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc - (4 * 3600000))
}

// Parse hours to get open/close times for display
function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

// Interface for structured office hours
interface StructuredHours {
  mon_fri: { open: string; close: string }
  sat?: { open: string; close: string }
  sun?: { open: string; close: string }
}

// Format schedule display according to user rules:
// - If time not set for Sat, don't show Sat
// - If time not set for Sun, don't show Sun
// - If only one weekend day set, only show that day
// - If both weekend days set with same times, show "Sat+Sun"
// - If both weekend days set with different times, show separate lines
function formatScheduleFromStructured(hours: StructuredHours): Schedule {
  const monFriHours = `${hours.mon_fri.open}-${hours.mon_fri.close}`
  const hasSat = !!hours.sat
  const hasSun = !!hours.sun
  
  // No weekend hours
  if (!hasSat && !hasSun) {
    return { mon_fri: monFriHours }
  }
  
  // Only Saturday
  if (hasSat && !hasSun) {
    return {
      mon_fri: monFriHours,
      sat: `${hours.sat!.open}-${hours.sat!.close}`
    }
  }
  
  // Only Sunday
  if (!hasSat && hasSun) {
    return {
      mon_fri: monFriHours,
      sun: `${hours.sun!.open}-${hours.sun!.close}`
    }
  }
  
  // Both Sat and Sun - return both so frontend can decide to combine or separate
  const satHours = `${hours.sat!.open}-${hours.sat!.close}`
  const sunHours = `${hours.sun!.open}-${hours.sun!.close}`
  
  // Always return both sat and sun - frontend will combine if they're the same
  return {
    mon_fri: monFriHours,
    sat: satHours,
    sun: sunHours
  }
}

// Legacy function for backwards compatibility with text-based hours
function getSchedule(hoursStr: string, hasSaturdayHours = false, hasSundayHours = false): Schedule {
  const parsed = parseHours(hoursStr)
  if (!parsed) {
    return { mon_fri: hoursStr.replace(' AST', '') }
  }
  
  const { openHour, openMinute, closeHour, closeMinute } = parsed
  const weekdayHours = `${formatTime(openHour, openMinute)}-${formatTime(closeHour, closeMinute)}`
  
  // Default: Mon-Fri only (closed weekends)
  if (!hasSaturdayHours && !hasSundayHours) {
    return { mon_fri: weekdayHours }
  }
  
  // Has Saturday hours
  if (hasSaturdayHours && !hasSundayHours) {
    return {
      mon_fri: weekdayHours,
      sat: '08:00-12:00'
    }
  }
  
  // Has both Sat+Sun hours
  if (hasSaturdayHours && hasSundayHours) {
    return {
      mon_fri: weekdayHours,
      sat: '08:00-12:00',
      sun: '08:00-12:00'
    }
  }
  
  return { mon_fri: weekdayHours }
}

// Check if office is currently open
function checkOfficeStatus(
  hoursStr: string,
  now: Date,
  structuredHours: StructuredHours
): OfficeStatus {
  const hasSaturdayHours = !!structuredHours.sat
  const hasSundayHours = !!structuredHours.sun
  const parsed = parseHours(hoursStr)
  if (!parsed) {
    return { 
      hours: hoursStr, 
      is_open: false, 
      next_open: null, 
      next_close: null,
      schedule: { mon_fri: hoursStr },
      status_line: 'Closed Now'
    }
  }

  const { openHour, openMinute, closeHour, closeMinute } = parsed
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute
  const openTime = openHour * 60 + openMinute
  const closeTime = closeHour * 60 + closeMinute

  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isSaturday = dayOfWeek === 6
  const isSunday = dayOfWeek === 0

  // Determine if open based on day and hours
  let isOpen = false
  let schedule: Schedule = getSchedule(hoursStr, hasSaturdayHours, hasSundayHours)
  
  if (!isWeekend) {
    // Weekday - use regular hours
    isOpen = currentTime >= openTime && currentTime < closeTime
  } else if (isSaturday && hasSaturdayHours) {
    // Saturday with special hours (assume 08:00-12:00)
    isOpen = currentTime >= (8 * 60) && currentTime < (12 * 60)
  } else if (isSunday && hasSundayHours) {
    // Sunday with special hours (assume 08:00-12:00)
    isOpen = currentTime >= (8 * 60) && currentTime < (12 * 60)
  }
  // Weekend without special hours = closed

  let nextOpen: string | null = null
  let nextClose: string | null = null
  let statusLine: string

  if (isOpen) {
    // Currently open - show when closing
    if (isSaturday && hasSaturdayHours) {
      nextClose = '12:00 AST'
    } else if (isSunday && hasSundayHours) {
      nextClose = '12:00 AST'
    } else {
      nextClose = `${formatTime(closeHour, closeMinute)} AST`
    }
    statusLine = `Open Now | Closes ${nextClose.replace(' AST', '')}`
  } else {
    // Closed - figure out when next open
    if (!isWeekend && currentTime < openTime) {
      // Before opening on weekday
      nextOpen = `${formatTime(openHour, openMinute)} AST`
      statusLine = `Closed Now | Opens ${nextOpen.replace(' AST', '')}`
    } else {
      // After hours or weekend - find next opening
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDay = tomorrow.getDay()
      
      if (isSaturday) {
        if (hasSundayHours && structuredHours.sun) {
          const sunOpen = structuredHours.sun.open
          nextOpen = `${sunOpen} AST (Sunday)`
          statusLine = `Closed Now | Opens ${sunOpen} SUN`
        } else {
          nextOpen = `${formatTime(openHour, openMinute)} AST (Monday)`
          statusLine = `Closed Now | Opens ${formatTime(openHour, openMinute)} MON`
        }
      } else if (isSunday) {
        nextOpen = `${formatTime(openHour, openMinute)} AST (Monday)`
        statusLine = `Closed Now | Opens ${formatTime(openHour, openMinute)} MON`
      } else {
        // Weekday after hours
        if (tomorrowDay === 6 && !hasSaturdayHours) {
          // Tomorrow is Sat but closed Sat - opens Monday
          nextOpen = `${formatTime(openHour, openMinute)} AST (Monday)`
          statusLine = `Closed Now | Opens ${formatTime(openHour, openMinute)} MON`
        } else if (tomorrowDay === 6 && hasSaturdayHours && structuredHours.sat) {
          // Tomorrow is Sat with Sat hours
          const satOpen = structuredHours.sat.open
          nextOpen = `${satOpen} AST (Saturday)`
          statusLine = `Closed Now | Opens ${satOpen} SAT`
        } else {
          // Normal next weekday (tomorrow)
          nextOpen = `${formatTime(openHour, openMinute)} AST (tomorrow)`
          statusLine = `Closed Now | Opens ${formatTime(openHour, openMinute)}`
        }
      }
    }
  }

  return {
    hours: hoursStr,
    is_open: isOpen,
    next_open: nextOpen,
    next_close: nextClose,
    schedule,
    status_line: statusLine
  }
}

// Get office hours from marina_profiles
// The columns already contain the effective values (manual edits update these directly)
async function getMarinaOfficeHours(slug: string): Promise<{
  customs: StructuredHours | null;
  immigration: StructuredHours | null;
  clearance_notes: string | null;
  fees: { entry_per_person: number; exit_per_person: number; overtime_penalty: number } | null;
  last_updated: string | null;
} | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('marina_profiles')
      .select('customs_hours_structured, immigration_hours_structured, clearance_notes, office_hours_manual_at, office_hours_scraped_at')
      .eq('slug', slug)
      .in('status', ['approved', 'manual_only'])
      .single()

    if (error || !data) {
      console.log('No marina found for office hours:', slug, error?.message)
      return null
    }

    // Use the column values directly - these contain the effective values
    // (manual edits update these columns directly via the admin API)
    const effectiveCustoms = data.customs_hours_structured
    const effectiveImmigration = data.immigration_hours_structured
    const effectiveNotes = data.clearance_notes
    
    // Determine last updated time
    const lastUpdated = data.office_hours_manual_at || data.office_hours_scraped_at

    return {
      customs: effectiveCustoms,
      immigration: effectiveImmigration,
      clearance_notes: effectiveNotes,
      // Default fees - these could be added to marina_profiles later
      fees: { entry_per_person: 15, exit_per_person: 15, overtime_penalty: 50 },
      last_updated: lastUpdated
    }
  } catch (e) {
    console.error('Error fetching marina office hours:', e)
    return null
  }
}

async function getClearanceInfo(): Promise<ClearanceInfo | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('clearance_info')
    .select('customs_hours, immigration_hours, fees, last_updated')
    .order('last_updated', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching clearance info:', error)
    return null
  }

  return data as ClearanceInfo
}

// Fetch full marina profile from marina_profiles table
async function getMarinaProfile(slug: string = 'rodney-bay'): Promise<MarinaInfo | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('marina_profiles')
      .select('*')
      .in('status', ['approved', 'manual_only'])
      .eq('slug', slug)
      .single()

    if (error) {
      // Table doesn't exist or other error - return null to use fallback
      if (error.code === 'PGRST205' || error.message?.includes('marina_profiles')) {
        console.log('marina_profiles table not found, using fallback data')
      } else {
        console.error('Error fetching marina profile:', error)
      }
      return null
    }

    if (!data) return null

    return {
      name: data.name,
      address: data.address,
      phone: data.phone,
      website: data.website,
      website_label: data.website_label,
      source_url: data.marinelink_url,
      source_name: 'MarineLink.com',
      boat_size_capacity: data.boat_size_capacity,
      total_berths: data.total_berths,
      mooring_ball_availability: data.mooring_ball_availability,
      restrooms_showers: data.restrooms_showers,
      water_depth: data.water_depth,
      fuel_dock: data.fuel_dock,
      water_availability: data.water_availability,
      power_connections: data.power_connections,
      maintenance_repair: data.maintenance_repair,
      chandlery: data.chandlery,
      wifi: data.wifi,
      amenities: data.amenities,
      services: data.services,
      latitude: data.latitude,
      longitude: data.longitude,
      reserve_berth_url: data.reserve_berth_url,
      additional_services: data.additional_services,
      vhf_channel: data.vhf_channel,
      total_slips: data.total_slips,
      total_moorings: data.total_moorings
    }
  } catch (e) {
    console.log('marina_profiles table not found, using fallback data')
    return null
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get location from query params (default to rodney-bay)
    const location = event.queryStringParameters?.location || 'rodney-bay'

    // else: free location or verified pro user -- proceed normally

    // Fetch all data sources in parallel
    const [marinaOfficeHours, clearanceInfo, marinaProfile] = await Promise.all([
      getMarinaOfficeHours(location),
      getClearanceInfo(),
      getMarinaProfile(location)
    ])

    // Default marina info from MarineLink.com (fallback)
    const defaultMarinaInfo: MarinaInfo = {
      name: 'IGY Rodney Bay Marina',
      address: 'Rodney Bay, Gros Islet, St. Lucia',
      phone: '+1-758-452-0324',
      website: 'http://www.igy-rodneybay.com',
      website_label: 'igy-rodneybay.com',
      source_url: 'https://ports.marinelink.com/ports/port/rodney-bay',
      source_name: 'MarineLink.com',
      latitude: 14.0808,
      longitude: -60.9551,
      reserve_berth_url: 'https://www.igymarinas.com/reserve-a-slip/?marina_id=1082'
    }

    const now = getASTTime()
    
    // Default structured hours
    const defaultHours: StructuredHours = { mon_fri: { open: '08:00', close: '16:00' } }
    
    // Use structured hours from marina_profiles, fallback to defaults
    const customsHours = marinaOfficeHours?.customs || defaultHours
    const immigrationHours = marinaOfficeHours?.immigration || defaultHours
    
    // Format hours string for display (e.g., "08:00-16:00 AST")
    const customsHoursStr = `${customsHours.mon_fri.open}-${customsHours.mon_fri.close} AST`
    const immigrationHoursStr = `${immigrationHours.mon_fri.open}-${immigrationHours.mon_fri.close} AST`
    
    // Generate schedules using the display rules
    const customsSchedule = formatScheduleFromStructured(customsHours)
    const immigrationSchedule = formatScheduleFromStructured(immigrationHours)
    
    // Check open/close status - pass structured hours for each office
    const customsStatus = checkOfficeStatus(customsHoursStr, now, customsHours)
    const immigrationStatus = checkOfficeStatus(immigrationHoursStr, now, immigrationHours)
    
    // Override schedules with properly formatted ones
    customsStatus.schedule = customsSchedule
    immigrationStatus.schedule = immigrationSchedule
    
    // Check if we have actual data or using defaults
    const hasRealData = !!marinaOfficeHours?.customs
    
    const notes = marinaOfficeHours?.clearance_notes || clearanceInfo?.notes || 'Closed weekends and public holidays'
    const fees = marinaOfficeHours?.fees || clearanceInfo?.fees || { entry_per_person: 15, exit_per_person: 15, overtime_penalty: 50 }
    const lastUpdated = marinaOfficeHours?.last_updated || clearanceInfo?.last_updated || new Date().toISOString()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        customs: customsStatus,
        immigration: immigrationStatus,
        fees,
        marina: marinaProfile || defaultMarinaInfo,
        last_updated: lastUpdated,
        notes: hasRealData ? notes : 'Default hours - please verify with marina',
        current_ast_time: now.toISOString(),
        source: marinaOfficeHours ? 'marina_profile' : (clearanceInfo ? 'clearance_info' : 'default')
      })
    }

  } catch (error) {
    console.error('Clearance endpoint error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch clearance information' })
    }
  }
}
