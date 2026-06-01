import { useState, useCallback } from 'react'

/**
 * Persist state to localStorage with the same API as useState.
 *
 * @param key     - localStorage key
 * @param initial - initial / fallback value
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'dark')
 */
export function useLocalStorage<T>(
  key: string,
  initial: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initial
    } catch {
      return initial
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const next = value instanceof Function ? value(prev) : value
          window.localStorage.setItem(key, JSON.stringify(next))
          return next
        })
      } catch {
        // localStorage may be unavailable (private browsing, quota exceeded)
      }
    },
    [key]
  )

  return [storedValue, setValue]
}
