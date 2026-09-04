import React from 'react'
import type { VesselHistoryPoint } from '../../hooks/useVessels'

interface TrendChartProps {
  history: VesselHistoryPoint[]
  currentCount: number
  average7Day: number
}

export const TrendChart: React.FC<TrendChartProps> = ({ 
  history, 
  currentCount,
  average7Day 
}) => {
  if (!history || history.length === 0) {
    return (
      <div className="text-center text-gray-500 py-2 text-sm">
        No history
      </div>
    )
  }

  // Use last 5 days max for compact display
  const displayHistory = history.slice(-5)
  
  // Calculate chart dimensions
  const maxCount = Math.max(...displayHistory.map(h => h.count), currentCount, average7Day)
  const minCount = Math.min(...displayHistory.map(h => h.count), currentCount, average7Day)
  const range = maxCount - minCount || 1

  // Compact chart dimensions
  const height = 80
  const padding = 6
  const chartHeight = height - padding * 2

  // Helper to calculate Y position
  const getY = (count: number) => {
    return padding + chartHeight - ((count - minCount) / range) * chartHeight
  }

  // Generate bar positions
  const barWidth = 20
  const gap = 8
  const totalWidth = displayHistory.length * (barWidth + gap) + gap

  return (
    <div>
      {/* SVG Chart */}
      <svg 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="overflow-visible"
      >
        {/* Average line */}
        <line
          x1={0}
          y1={getY(average7Day)}
          x2={totalWidth}
          y2={getY(average7Day)}
          stroke="#3B82F6"
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />

        {/* Bars for each day */}
        {displayHistory.map((point, index) => {
          const x = gap + index * (barWidth + gap)
          const y = getY(point.count)
          const barHeight = chartHeight - y + padding
          const isAboveAverage = point.count > average7Day

          return (
            <g key={point.date}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={isAboveAverage ? '#10B981' : '#9CA3AF'}
                className="transition-all duration-300"
              />
              
              {/* Count label */}
              <text
                x={x + barWidth / 2}
                y={y - 3}
                textAnchor="middle"
                className="text-[10px] fill-gray-600"
              >
                {point.count}
              </text>
              
              {/* Day label */}
              <text
                x={x + barWidth / 2}
                y={height - 1}
                textAnchor="middle"
                className="text-[10px] fill-gray-500"
              >
                {new Date(point.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Compact Legend */}
      <div className="flex justify-center gap-3 mt-1 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
          <span>Above avg ({average7Day})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-gray-400 rounded-sm" />
          <span>Below</span>
        </div>
      </div>
    </div>
  )
}

export default TrendChart
