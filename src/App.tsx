import { RouterProvider } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { NotificationProvider, WalletProvider } from './contexts'
import { router } from './routes'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </WalletProvider>
    </ErrorBoundary>
  )
}

export default App
