interface WeatherCardProps {
  weather: {
    location: string
    current: {
      temperature: number
      condition: string
      humidity: number
      wind_speed: number
      wind_direction: string
    }
    cached_at: string
  }
  onRefresh?: () => void
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('clear') || c.includes('sunny')) return '☀️'
  if (c.includes('cloud')) return '☁️'
  if (c.includes('rain') || c.includes('shower')) return '🌧️'
  if (c.includes('storm') || c.includes('thunder')) return '⛈️'
  if (c.includes('fog') || c.includes('mist')) return '🌫️'
  return '🌤️'
}

function getTimeAgo(timestamp: string): string {
  const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes === 1) return '1m ago'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1h ago'
  return `${hours}h ago`
}

export function WeatherCard({ weather, onRefresh }: WeatherCardProps) {
  const { current, location, cached_at } = weather

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500">{location}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{getTimeAgo(cached_at)}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 text-gray-400 hover:text-blue-600 transition"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{getWeatherIcon(current.condition)}</span>
        <div>
          <div className="text-3xl text-gray-900">
            {Math.round(current.temperature)}°C / {Math.round((current.temperature * 9/5) + 32)}°F
          </div>
          <div className="text-sm text-gray-600">{current.condition}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-xs">
        <div className="text-center">
          <div className="text-gray-500">Humidity</div>
          <div className="font-semibold text-gray-900">{current.humidity}%</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Wind</div>
          <div className="font-semibold text-gray-900">{current.wind_speed} mph</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Direction</div>
          <div className="font-semibold text-gray-900">{current.wind_direction}</div>
        </div>
      </div>
    </div>
  )
}
