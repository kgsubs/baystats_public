interface ForecastRowProps {
  forecast: Array<{
    day: string
    high: number
    low: number
    condition: string
    precipitation_chance: number
  }>
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

export function ForecastRow({ forecast }: ForecastRowProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Forecast</h3>
      
      <div className="space-y-2">
        {forecast.map((day, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getWeatherIcon(day.condition)}</span>
              <div>
                <div className="font-medium text-sm text-gray-900">{day.day}</div>
                <div className="text-xs text-gray-500">{day.condition}</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <span className="font-semibold text-gray-900">{day.high}°</span>
                <span className="text-gray-400">/</span>
                <span className="text-gray-600">{day.low}°</span>
              </div>
              {day.precipitation_chance > 0 && (
                <div className="text-xs text-blue-600">
                  💧 {day.precipitation_chance}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
