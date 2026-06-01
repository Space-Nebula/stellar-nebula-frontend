import { lazy, Suspense, type ReactNode, useEffect } from 'react'
import { createBrowserRouter, useLocation } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import LoadingScreen from '../components/Loading/LoadingScreen'
import { createScopedLogger } from '../services/logging'
import { addMonitoringBreadcrumb, captureMonitoringEvent } from '../services/monitoring'
import { trackEvent } from '../services/analytics'

const log = createScopedLogger('Routes')

const Home = lazy(() => import('../pages/Home'))
const Marketplace = lazy(() => import('../pages/Marketplace'))
const NebulaView = lazy(() => import('../pages/NebulaView'))
const NotFound = lazy(() => import('../pages/NotFound'))
const ShipDashboard = lazy(() => import('../pages/ShipDashboard'))

const withSuspense = (component: ReactNode) => (
  <Suspense
    fallback={
      <LoadingScreen
        stageLabel="Plotting route"
        message="Charting course to the requested sector..."
        progress={35}
      />
    }
  >
    {component}
  </Suspense>
)

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
        element: withSuspense(<Home />),
      },
      {
        path: 'nebula',
        element: withSuspense(<NebulaView />),
      },
      {
        path: 'dashboard',
        element: withSuspense(<ShipDashboard />),
      },
      {
        path: 'marketplace',
        element: withSuspense(<Marketplace />),
      },
      {
        path: '*',
        element: withSuspense(<NotFound />),
      },
    ],
  },
])
