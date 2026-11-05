import { useState, useEffect, useRef, useCallback } from 'react'
import type { LiveAttendanceFeed } from '../types'
import { sessionsApi } from '../api/sessions'

const POLL_INTERVAL = 3000

export function useRealtime(sessionId: string | null, enabled = true) {
  const [data, setData] = useState<LiveAttendanceFeed | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFeed = useCallback(async () => {
    if (!sessionId) return
    try {
      const feed = await sessionsApi.getLiveFeed(sessionId)
      setData(feed)
      setError(null)
    } catch (err) {
      setError('Failed to fetch live feed')
      console.error('[useRealtime]', err)
    }
  }, [sessionId])

  useEffect(() => {
    if (!enabled || !sessionId) {
      setData(null)
      return
    }

    setLoading(true)
    fetchFeed().finally(() => setLoading(false))

    intervalRef.current = setInterval(fetchFeed, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionId, enabled, fetchFeed])

  const refresh = useCallback(() => {
    fetchFeed()
  }, [fetchFeed])

  return { data, loading, error, refresh }
}
