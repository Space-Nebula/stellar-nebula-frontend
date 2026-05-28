import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useNotifications, useWallet } from '@/contexts'

const routeTitles: Record<string, string> = {
  '/': 'Command Center online',
  '/nebula': 'Nebula scanners active',
  '/dashboard': 'Ship systems report ready',
  '/marketplace': 'Marketplace feed synced',
}

export default function NotificationBootstrap() {
  const location = useLocation()
  const { walletState } = useWallet()
  const { addNotification } = useNotifications()
  const routeSeen = useRef<string | null>(null)
  const walletSeen = useRef(false)

  useEffect(() => {
    addNotification({
      type: 'event',
      title: 'Mission control initialized',
      description: 'Live mission updates and ship events will appear in this panel.',
    })
  }, [addNotification])

  useEffect(() => {
    if (routeSeen.current === location.pathname) return
    routeSeen.current = location.pathname

    addNotification({
      type: 'event',
      title: routeTitles[location.pathname] ?? 'Sector route loaded',
      description: `Navigation adjusted to ${location.pathname}.`,
    })
  }, [addNotification, location.pathname])

  useEffect(() => {
    if (!walletState.isConnected || !walletState.publicKey || walletSeen.current) return
    walletSeen.current = true

    addNotification({
      type: 'transaction',
      title: 'Wallet connected',
      description: `Linked account ${walletState.publicKey.slice(0, 6)}…${walletState.publicKey.slice(-6)} for secure actions.`,
    })
  }, [addNotification, walletState.isConnected, walletState.publicKey])

  return null
}
