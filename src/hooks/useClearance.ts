// The useClearance() hook that used to live in this file was never called
// anywhere in the app and was removed as dead code. The types below are
// kept: useBriefingData.ts's useBriefingClearance still uses OfficeStatus
// and MarinaInfo.
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
  } | null
  marina: MarinaInfo | null
  last_updated: string | null
  notes: string | null
  current_ast_time?: string
}

