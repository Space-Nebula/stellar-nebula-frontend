import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import LoadingScreen from '../components/Loading/LoadingScreen'

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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
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
