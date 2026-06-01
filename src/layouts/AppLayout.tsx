import { Outlet } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Footer from '../components/Layout/Footer'
import LoadingScreen from '../components/Loading/LoadingScreen'
import NotificationBootstrap from '../components/Notifications/NotificationBootstrap'
import { useWallet } from '../contexts'

function AppLayout() {
  const { isReconnecting } = useWallet()

  if (isReconnecting) {
    return (
      <LoadingScreen
        stageLabel="Restoring mission link"
        message="Reconnecting secure wallet session..."
        progress={68}
      />
    )
  }

  return (
    <div className="app-shell">
      <NotificationBootstrap />
      <Navigation />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default AppLayout
