import { useState, useEffect, useCallback } from 'react'

export interface VesselHistoryPoint {
  date: string
  count: number
}

export interface VesselData {
  current_count: number
  recorded_at: string
  time_of_day?: string
  trend: 'increasing' | 'decreasing' | 'stable'
  trend_percentage: number
  average_7day: number
  crowding_level: 'low' | 'moderate' | 'high'
  history: VesselHistoryPoint[]
  data_source: string
  live_data: boolean
  last_reporter?: string
  total_berths: number
  occupancy_rate: number
  next_check?: string
  note?: string
}

interface UseVesselsReturn {
  data: VesselData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useVessels(): UseVesselsReturn {
  const [data, setData] = useState<VesselData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVessels = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/vessels', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch vessel data')
      }

      const vesselData: VesselData = await response.json()
      setData(vesselData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVessels()

    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchVessels, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchVessels])

  return {
    data,
    loading,
    error,
    refetch: fetchVessels
  }
}
