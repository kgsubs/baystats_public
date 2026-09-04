import React from 'react'

interface CrowdingBadgeProps {
  level: 'low' | 'moderate' | 'high'
  showTooltip?: boolean
}

export const CrowdingBadge: React.FC<CrowdingBadgeProps> = ({ 
  level, 
  showTooltip = true 
}) => {
  const config = {
    low: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      label: 'Low',
      icon: '🟢',
      description: 'Plenty of space available'
    },
    moderate: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      label: 'Moderate',
      icon: '🟡',
      description: 'Getting busy, some berths available'
    },
    high: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-200',
      label: 'High',
      icon: '🔴',
      description: 'Very busy, limited space'
    }
  }

  const { bg, text, border, label, icon, description } = config[level]

  return (
    <div className="relative group">
      <div 
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${bg} ${text} ${border} font-medium text-sm`}
      >
        <span>{icon}</span>
        <span>{label} Traffic</span>
      </div>
      
      {showTooltip && (
        <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded px-2 py-1 -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {description}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800" />
        </div>
      )}
    </div>
  )
}

export default CrowdingBadge
