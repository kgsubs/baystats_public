import { useState, useEffect, useCallback } from 'react'

interface WeatherData {
  location: string
  current: {
    temperature: number
    condition: string
    humidity: number
    wind_speed: number
    wind_direction: string
  }
  forecast: Array<{
    day: string
    high: number
    low: number
    condition: string
    precipitation_chance: number
  }>
  marine_forecast: {
    seas: string
    winds: string
    advisories: string[]
  }
  cached_at: string
  next_update: string
}

interface UseWeatherReturn {
  weather: WeatherData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useWeather(): UseWeatherReturn {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/weather', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data: WeatherData = await response.json()
      setWeather(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeather()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWeather])

  return {
    weather,
    loading,
    error,
    refetch: fetchWeather
  }
}
