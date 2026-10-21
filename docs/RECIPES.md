# Common Development Recipes

A reference catalog of common architecture recipes, design patterns, and operational workarounds for Stellar Nebula.

---

## 1. Rate-Limited RPC Queries with Exponential Backoff

```typescript
export async function fetchWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 500
): Promise<T> {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      if (attempt >= maxRetries) throw err
      const backoff = delayMs * Math.pow(2, attempt - 1)
      await new Promise((resolve) => setTimeout(resolve, backoff))
    }
  }
  throw new Error('Exceeded maximum retry attempts')
}
```

---

## 2. Adaptive Frame Rate Throttling

When frame rates drop below 30 FPS for multiple continuous sample windows, degrade rendering quality dynamically:

```typescript
import { useState, useEffect } from 'react'

export function useAdaptiveQuality(currentFps: number) {
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'low'>('high')

  useEffect(() => {
    if (currentFps < 25) {
      setQualityLevel('low')
    } else if (currentFps < 45) {
      setQualityLevel('medium')
    } else {
      setQualityLevel('high')
    }
  }, [currentFps])

  return qualityLevel
}
```

---

## 3. Safe Session LocalStorage Persister

Safely handles browser privacy modes and quota limits:

```typescript
export const safeStorage = {
  get: <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch {
      return fallback
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('LocalStorage unavailable or quota exceeded:', e)
    }
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch {}
  },
}
```
