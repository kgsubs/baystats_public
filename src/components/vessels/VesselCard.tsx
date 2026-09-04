import React from 'react'
import { CrowdingBadge } from './CrowdingBadge'
import { TrendChart } from './TrendChart'
import type { VesselData } from '../../hooks/useVessels'

interface VesselCardProps {
  data: VesselData
  onRefresh?: () => void
}

export const VesselCard: React.FC<VesselCardProps> = ({ data, onRefresh }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return { icon: '↑', color: 'text-green-600', bg: 'bg-green-50' }
      case 'decreasing':
        return { icon: '↓', color: 'text-red-600', bg: 'bg-red-50' }
      default:
        return { icon: '→', color: 'text-gray-600', bg: 'bg-gray-50' }
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
  }

  const trend = getTrendIcon(data.trend)
  const sign = data.trend === 'increasing' ? '+' : data.trend === 'decreasing' ? '-' : ''
  const availableBerths = data.total_berths - data.current_count

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      {/* Header with Marina Status */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-lg font-semibold">Vessel Count</h2>
              <CrowdingBadge level={data.crowding_level} />
            </div>
            {/* Marina Status inline */}
            <div className="flex items-center gap-3 mt-1 text-xs text-blue-100">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {availableBerths} available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                {data.occupancy_rate}% occupied
              </span>
            </div>
          </div>
          
          {/* Large Count - Header Right */}
          <div className="text-right">
            <div className="text-4xl text-white">
              {data.current_count}
            </div>
            <div className="text-blue-200 text-xs">vessels</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Trend & Occupancy Row */}
        <div className="flex items-center gap-4 mb-4">
          {/* Trend Indicator */}
          <div className={`${trend.bg} rounded-lg px-3 py-2 text-center flex-shrink-0`}>
            <div className={`text-2xl ${trend.color}`}>
              {trend.icon}
            </div>
            <div className={`text-sm font-medium ${trend.color}`}>
              {sign}{data.trend_percentage}%
            </div>
            <div className="text-xs text-gray-500">vs 7d avg</div>
          </div>

          {/* Occupancy Bar */}
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Occupancy</span>
              <span className="font-medium">{data.occupancy_rate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  data.occupancy_rate > 80 ? 'bg-red-500' : 
                  data.occupancy_rate > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(data.occupancy_rate, 100)}%` }}
              />
            </div>
            <div className="text-right text-xs text-gray-400 mt-1">
              {data.current_count} / {data.total_berths} berths
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {data.history.length > 0 && (
          <div className="border-t border-gray-100 pt-3 mt-auto">
            <h3 className="text-xs font-medium text-gray-500 mb-2">7-Day Trend</h3>
            <TrendChart 
              history={data.history} 
              currentCount={data.current_count}
              average7Day={data.average_7day}
            />
          </div>
        )}

        {/* Footer Info */}
        <div className="border-t border-gray-100 pt-3 mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-gray-500">
            Updated {formatTimeAgo(data.recorded_at)}
            {data.time_of_day && (
              <span className="text-gray-400"> • {data.time_of_day}</span>
            )}
          </div>
          
          {data.last_reporter && (
            <div className="text-gray-400">
              by {data.last_reporter}
            </div>
          )}
        </div>

        {/* Next Check Info */}
        {data.next_check && (
          <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1.5">
            📅 {data.next_check}
          </div>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-3 w-full py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors text-xs font-medium"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  )
}

export default VesselCard
