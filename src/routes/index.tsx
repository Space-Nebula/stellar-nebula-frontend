/* eslint-disable */
import { lazy, Suspense, type ReactNode, useEffect } from 'react'
import { createBrowserRouter, useLocation } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import LoadingScreen from '../components/Loading/LoadingScreen'
import {
  SkeletonDashboard,
  SkeletonNebulaView,
  SkeletonMarketplace,
  SkeletonLeaderboard,
} from '../components/Loading'
import { FeatureErrorBoundary } from '../components/ErrorBoundary'
import { createScopedLogger } from '../services/logging'
import { addMonitoringBreadcrumb, captureMonitoringEvent } from '../services/monitoring'
import { trackEvent } from '../services/analytics'

const log = createScopedLogger('Routes')

const Home = lazy(() => import('../pages/Home'))
const Marketplace = lazy(() => import('../pages/Marketplace'))
const NebulaView = lazy(() => import('../pages/NebulaView'))
const NotFound = lazy(() => import('../pages/NotFound'))
const ShipDashboard = lazy(() => import('../pages/ShipDashboard'))
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage'))

/** Default fallback kept for the root Suspense boundary */
const defaultFallback = (
  <LoadingScreen
    stageLabel="Plotting route"
    message="Charting course to the requested sector..."
    progress={35}
  />
)

/**
 * Wrap a page component with:
 * 1. A Suspense boundary using a page-specific skeleton (or the default LoadingScreen)
 * 2. A FeatureErrorBoundary so a broken page cannot crash the entire shell
 */
function withPageBoundary(
  component: ReactNode,
  feature: string,
  suspenseFallback: ReactNode = defaultFallback
) {
  return (
    <FeatureErrorBoundary feature={feature}>
      <Suspense fallback={suspenseFallback}>{component}</Suspense>
    </FeatureErrorBoundary>
  )
}

// Component to track route changes
function RouteChangeTracker() {
  const location = useLocation()

  useEffect(() => {
    const pageName = location.pathname || '/'
    log.info(`Page view: ${pageName}`)

    // Track page view
    addMonitoringBreadcrumb(`Navigation: ${pageName}`, 'page-view')
    trackEvent('scan_started', { page: pageName })

    // Capture page view event in monitoring
    captureMonitoringEvent('page_view', { path: pageName })
  }, [location.pathname])

  return null
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <>
        <RouteChangeTracker />
        <AppLayout />
      </>
    ),
    children: [
      {
        index: true,
        element: withPageBoundary(
          <Home />,
          'Home',
          <LoadingScreen
            stageLabel="Launching command center"
            message="Loading home..."
            progress={20}
          />
        ),
      },
      {
        path: 'nebula',
        element: withPageBoundary(<NebulaView />, 'Nebula View', <SkeletonNebulaView />),
      },
      {
        path: 'dashboard',
        element: withPageBoundary(<ShipDashboard />, 'Ship Dashboard', <SkeletonDashboard />),
      },
      {
        path: 'marketplace',
        element: withPageBoundary(<Marketplace />, 'Marketplace', <SkeletonMarketplace />),
      },
      {
        path: 'leaderboard',
        element: withPageBoundary(<LeaderboardPage />, 'Leaderboard', <SkeletonLeaderboard />),
      },
      {
        path: '*',
        element: withPageBoundary(<NotFound />, 'Not Found'),
      },
    ],
  },
])
