import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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

interface VesselCount {
  count: number
  recorded_at: string
  time_of_day?: string
  reporter?: string
}

interface HistoryPoint {
  date: string
  count: number
}

function getCrowdingLevel(count: number): 'low' | 'moderate' | 'high' {
  if (count < 30) return 'low'
  if (count <= 60) return 'moderate'
  return 'high'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

async function getVesselData(location: string = 'rodney-bay'): Promise<{ 
  current: VesselCount | null; 
  history: HistoryPoint[];
  data_source: string;
  last_reporter?: string;
}> {
  // Get latest count from database for specific location
  const { data: latest, error: latestError } = await getSupabaseAdmin()
    .from('vessel_counts')
    .select('count, recorded_at, time_of_day, reporter')
    .eq('location', location)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  if (latestError) {
    console.error('Error fetching latest vessel count:', latestError)
  }

  // Get 7-day history for location
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: historyData, error: historyError } = await getSupabaseAdmin()
    .from('vessel_counts')
    .select('count, recorded_at')
    .eq('location', location)
    .gte('recorded_at', sevenDaysAgo.toISOString())
    .order('recorded_at', { ascending: false })

  if (historyError) {
    console.error('Error fetching vessel history:', historyError)
  }

  // Process history - get latest for each day
  const historyMap = new Map<string, number>()
  historyData?.forEach((entry: VesselCount) => {
    const date = formatDate(entry.recorded_at)
    if (!historyMap.has(date)) {
      historyMap.set(date, entry.count)
    }
  })

  // Convert to array and limit to 7 days
  const history: HistoryPoint[] = Array.from(historyMap.entries())
    .slice(0, 7)
    .map(([date, count]) => ({ date, count }))
    .reverse()

  return {
    current: latest || null,
    history,
    data_source: 'manual_entry',
    last_reporter: latest?.reporter
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
    // Get location from query params
    const location = event.queryStringParameters?.location || 'rodney-bay'
    
    // Get total berths for this location
    const { data: marina } = await getSupabaseAdmin()
      .from('marina_profiles')
      .select('total_berths')
      .eq('slug', location)
      .single()
    
    const totalBerths = marina?.total_berths || 253
    
    const { current, history, data_source, last_reporter } = await getVesselData(location)

    if (!current) {
      // No data available yet
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          current_count: 0,
          recorded_at: new Date().toISOString(),
          trend: 'stable',
          trend_percentage: 0,
          average_7day: 0,
          crowding_level: 'low',
          history: [],
          data_source,
          last_reporter: null,
          note: 'No vessel data available yet. Please use the admin form to add counts.',
          total_berths: totalBerths,
          occupancy_rate: 0
        })
      }
    }

    const currentCount = current.count
    const occupancyRate = Math.round((currentCount / totalBerths) * 100)

    // Calculate 7-day average
    const allCounts = history.length > 0 ? history.map(h => h.count) : [currentCount]
    const average7Day = Math.round(
      allCounts.reduce((sum, count) => sum + count, 0) / allCounts.length
    )

    // Calculate trend
    const trend: 'increasing' | 'decreasing' | 'stable' = 
      currentCount > average7Day ? 'increasing' : 
      currentCount < average7Day ? 'decreasing' : 'stable'
    
    const trendPercentage = average7Day > 0 
      ? Math.round(((currentCount - average7Day) / average7Day) * 100)
      : 0

    // Determine crowding level
    const crowdingLevel = getCrowdingLevel(currentCount)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        current_count: currentCount,
        recorded_at: current.recorded_at,
        time_of_day: current.time_of_day,
        trend,
        trend_percentage: Math.abs(trendPercentage),
        average_7day: average7Day,
        crowding_level: crowdingLevel,
        history,
        data_source,
        live_data: false,
        last_reporter,
        total_berths: totalBerths,
        occupancy_rate: occupancyRate,
        next_check: current.time_of_day === 'morning' 
          ? 'Evening check at 4:00 PM'
          : 'Morning check at 9:00 AM'
      })
    }

  } catch (error) {
    console.error('Vessels endpoint error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch vessel data' })
    }
  }
}
