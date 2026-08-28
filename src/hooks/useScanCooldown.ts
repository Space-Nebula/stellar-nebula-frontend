import { useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'

const DEFAULT_COOLDOWN_MS = 60_000

export function useScanCooldown() {
  const scanCooldowns = useGameStore((s) => s.scanCooldowns)
  const addScanCooldown = useGameStore((s) => s.addScanCooldown)
  const pruneExpiredCooldowns = useGameStore((s) => s.pruneExpiredCooldowns)
  const isNebulaOnCooldown = useGameStore((s) => s.isNebulaOnCooldown)

  const getRemainingSeconds = useCallback(
    (pointId: string): number => {
      const entry = scanCooldowns.find((c) => c.nebulaId === pointId)
      if (!entry) return 0
      const now = Date.now()
      const expiry = new Date(entry.readyAt).getTime()
      const remaining = expiry - now
      return remaining > 0 ? Math.ceil(remaining / 1000) : 0
    },
    [scanCooldowns]
  )

  const startCooldown = useCallback(
    (pointId: string, cooldownMs = DEFAULT_COOLDOWN_MS) => {
      addScanCooldown(pointId, cooldownMs)
    },
    [addScanCooldown]
  )

  const canScan = useCallback(
    (pointId: string): boolean => {
      return !isNebulaOnCooldown(pointId)
    },
    [isNebulaOnCooldown]
  )

  return {
    scanCooldowns,
    getRemainingSeconds,
    startCooldown,
    canScan,
    pruneExpiredCooldowns,
  }
}
