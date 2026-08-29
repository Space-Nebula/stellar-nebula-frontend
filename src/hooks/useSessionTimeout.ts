import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseSessionTimeoutOptions {
  enabled: boolean
  timeoutMs?: number // Default: 15 minutes (900_000 ms)
  warningMs?: number // Default: 60 seconds (60_000 ms) before timeout
  onTimeout: () => void
}

export interface UseSessionTimeoutResult {
  isWarningOpen: boolean
  remainingWarningSeconds: number
  extendSession: () => void
  dismissWarning: () => void
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const DEFAULT_WARNING_MS = 60 * 1000 // 60 seconds

export function useSessionTimeout({
  enabled,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = DEFAULT_WARNING_MS,
  onTimeout,
}: UseSessionTimeoutOptions): UseSessionTimeoutResult {
  const [isWarningOpenInternal, setIsWarningOpenInternal] = useState(false)
  const [remainingWarningSeconds, setRemainingWarningSeconds] = useState(
    Math.ceil(warningMs / 1000)
  )

  const isWarningOpen = enabled && isWarningOpenInternal

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  const clearTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  const startCountdown = useCallback(() => {
    setIsWarningOpenInternal(true)
    let secondsLeft = Math.ceil(warningMs / 1000)
    setRemainingWarningSeconds(secondsLeft)

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1
      setRemainingWarningSeconds(secondsLeft)

      if (secondsLeft <= 0) {
        clearTimers()
        setIsWarningOpenInternal(false)
        onTimeoutRef.current()
      }
    }, 1000)
  }, [warningMs, clearTimers])

  const resetInactivityTimer = useCallback(() => {
    clearTimers()
    setIsWarningOpenInternal(false)
    setRemainingWarningSeconds(Math.ceil(warningMs / 1000))

    if (!enabled) return

    const timeUntilWarning = Math.max(0, timeoutMs - warningMs)
    inactivityTimerRef.current = setTimeout(() => {
      startCountdown()
    }, timeUntilWarning)
  }, [enabled, timeoutMs, warningMs, clearTimers, startCountdown])

  const extendSession = useCallback(() => {
    resetInactivityTimer()
  }, [resetInactivityTimer])

  const dismissWarning = useCallback(() => {
    setIsWarningOpenInternal(false)
  }, [])

  const isWarningOpenInternalRef = useRef(isWarningOpenInternal)
  isWarningOpenInternalRef.current = isWarningOpenInternal

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      return
    }

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ]

    const handleUserActivity = () => {
      // Don't auto-reset if warning modal is active so user must explicitly extend
      if (isWarningOpenInternalRef.current) return
      resetInactivityTimer()
    }

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })

    const timeUntilWarning = Math.max(0, timeoutMs - warningMs)
    clearTimers()
    inactivityTimerRef.current = setTimeout(() => {
      startCountdown()
    }, timeUntilWarning)

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity)
      })
      clearTimers()
    }
  }, [enabled, timeoutMs, warningMs, startCountdown, clearTimers, resetInactivityTimer])

  return {
    isWarningOpen,
    remainingWarningSeconds,
    extendSession,
    dismissWarning,
  }
}
