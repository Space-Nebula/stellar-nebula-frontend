import { useEffect, useRef, useCallback } from 'react'

export interface TouchGestureCallbacks {
  onPinchZoom?: (scaleDelta: number) => void
  onSwipeRotate?: (deltaX: number, deltaY: number) => void
  onTwoFingerPan?: (deltaX: number, deltaY: number) => void
  onTap?: (x: number, y: number) => void
}

interface TouchPoint {
  id: number
  x: number
  y: number
}

const TAP_MAX_DURATION_MS = 250
const TAP_MAX_MOVE_PX = 10
const MIN_PINCH_DISTANCE = 10

function distance(a: TouchPoint, b: TouchPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function midpoint(a: TouchPoint, b: TouchPoint): TouchPoint {
  return { id: -1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * Hook that attaches touch gesture handlers (pinch zoom, swipe rotate,
 * two-finger pan, tap) to a target DOM element.
 *
 * @param targetRef - Ref to the HTML element to attach listeners to
 * @param callbacks - Gesture callback functions
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null)
 * useTouchGestures(ref, {
 *   onPinchZoom: (scale) => setZoom((z) => z * scale),
 *   onTap: (x, y) => console.log('tap', x, y),
 * })
 */
export function useTouchGestures(
  targetRef: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks
) {
  const prevTouchesRef = useRef<TouchPoint[]>([])
  const prevPinchDistRef = useRef<number | null>(null)
  const prevMidpointRef = useRef<TouchPoint | null>(null)
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const getTouchPoints = useCallback((touches: TouchList): TouchPoint[] => {
    return Array.from(touches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }))
  }, [])

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const points = getTouchPoints(e.touches)
      prevTouchesRef.current = points

      if (points.length === 1) {
        tapStartRef.current = { x: points[0].x, y: points[0].y, time: Date.now() }
      } else {
        tapStartRef.current = null
      }

      if (points.length === 2) {
        prevPinchDistRef.current = distance(points[0], points[1])
        prevMidpointRef.current = midpoint(points[0], points[1])
      }
    },
    [getTouchPoints]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const points = getTouchPoints(e.touches)

      if (points.length === 1 && prevTouchesRef.current.length === 1) {
        const prev = prevTouchesRef.current[0]
        const curr = points[0]
        const dx = curr.x - prev.x
        const dy = curr.y - prev.y
        callbacksRef.current.onSwipeRotate?.(dx, dy)

        const tapStart = tapStartRef.current
        if (tapStart) {
          const moved = Math.sqrt((curr.x - tapStart.x) ** 2 + (curr.y - tapStart.y) ** 2)
          if (moved > TAP_MAX_MOVE_PX) {
            tapStartRef.current = null
          }
        }
      }

      if (points.length === 2 && prevTouchesRef.current.length >= 2) {
        const currDist = distance(points[0], points[1])
        const currMid = midpoint(points[0], points[1])

        if (
          prevPinchDistRef.current !== null &&
          Math.abs(currDist - prevPinchDistRef.current) > MIN_PINCH_DISTANCE
        ) {
          const scaleDelta = currDist / prevPinchDistRef.current
          callbacksRef.current.onPinchZoom?.(scaleDelta)
          prevPinchDistRef.current = currDist
        }

        if (prevMidpointRef.current) {
          const panDx = currMid.x - prevMidpointRef.current.x
          const panDy = currMid.y - prevMidpointRef.current.y
          if (Math.abs(panDx) > 0.5 || Math.abs(panDy) > 0.5) {
            callbacksRef.current.onTwoFingerPan?.(panDx, panDy)
          }
          prevMidpointRef.current = currMid
        }
      }

      prevTouchesRef.current = points
    },
    [getTouchPoints]
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const remaining = getTouchPoints(e.touches)

      if (remaining.length === 0) {
        prevPinchDistRef.current = null
        prevMidpointRef.current = null

        const tapStart = tapStartRef.current
        if (tapStart) {
          const elapsed = Date.now() - tapStart.time
          if (elapsed <= TAP_MAX_DURATION_MS) {
            callbacksRef.current.onTap?.(tapStart.x, tapStart.y)
          }
          tapStartRef.current = null
        }
      }

      prevTouchesRef.current = remaining
    },
    [getTouchPoints]
  )

  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [targetRef, handleTouchStart, handleTouchMove, handleTouchEnd])
}
