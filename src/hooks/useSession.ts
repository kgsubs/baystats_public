import { useState, useEffect, useCallback } from 'react'

interface SessionStatus {
  tier: 'free' | 'pro'
  session_active: boolean
  session_start?: string
  session_end?: string
  time_remaining_minutes?: number
  unlimited?: boolean
  can_start_new_session?: boolean
  subscription_status?: string | null
  current_period_end?: string | null
  plan_tier?: string | null
  is_admin?: boolean
}

interface UseSessionReturn {
  tier: 'free' | 'pro' | null
  sessionActive: boolean
  timeRemaining: number | null
  unlimited: boolean
  loading: boolean
  error: string | null
  subscription_status: string | null
  current_period_end: string | null
  plan_tier: string | null
  isAdmin: boolean
  startSession: () => Promise<void>
  refreshSession: () => Promise<void>
}

export function useSession(): UseSessionReturn {
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session/check', {
        credentials: 'include'
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Not authenticated')
          return
        }
        throw new Error('Failed to check session')
      }

      const data: SessionStatus = await response.json()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const startSession = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start session')
      }

      // Refresh session status after starting
      await checkSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }, [checkSession])

  // Initial check and polling
  useEffect(() => {
    checkSession()

    // Poll every 60 seconds
    const interval = setInterval(checkSession, 60000)
    return () => clearInterval(interval)
  }, [checkSession])

  return {
    tier: status?.tier || null,
    sessionActive: status?.session_active || false,
    timeRemaining: status?.time_remaining_minutes || null,
    unlimited: status?.unlimited || false,
    loading,
    error,
    subscription_status: status?.subscription_status ?? null,
    current_period_end: status?.current_period_end ?? null,
    plan_tier: status?.plan_tier ?? null,
    isAdmin: status?.is_admin || false,
    startSession,
    refreshSession: checkSession
  }
}
