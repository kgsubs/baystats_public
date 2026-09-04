import { useState, useEffect, useCallback } from 'react'
import type { Service } from '../types/services'

export interface TimeRange {
  open: string
  close: string
}

export interface OfficeHoursStructured {
  mon_fri: TimeRange
  sat?: TimeRange
  sun?: TimeRange
}

export interface Schedule {
  mon_fri: string
  sat?: string
  sun?: string
}

export interface OfficeStatus {
  hours: string
  is_open: boolean
  next_open: string | null
  next_close: string | null
  schedule: Schedule
  status_line: string
}

export interface MarinaInfo {
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
  services?: Service[]
  // Location and booking
  latitude?: number
  longitude?: number
  reserve_berth_url?: string
  // Additional services and communication
  additional_services?: Record<string, string>
  vhf_channel?: string
}

export interface ClearanceData {
  customs: OfficeStatus
  immigration: OfficeStatus
  fees: {
    entry_per_person: number
    exit_per_person: number
    overtime_penalty: number
  }
  marina: MarinaInfo
  last_updated: string
  notes: string
  current_ast_time?: string
}

interface UseClearanceReturn {
  data: ClearanceData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useClearance(): UseClearanceReturn {
  const [data, setData] = useState<ClearanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClearance = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/clearance', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch clearance information')
      }

      const clearanceData: ClearanceData = await response.json()
      setData(clearanceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClearance()

    // Auto-refresh every 5 minutes (office status can change)
    const interval = setInterval(fetchClearance, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchClearance])

  return {
    data,
    loading,
    error,
    refetch: fetchClearance
  }
}
