import { useState } from 'react'
import { NebulaCanvas } from '@components/Canvas'
import { ConnectModal, WalletDisplay } from '@components/Wallet'

function NebulaView() {
  const [isConnectOpen, setIsConnectOpen] = useState(false)

  return (
    <div className="nebula-view">
      <section className="page-panel nebula-view-meta">
        <p className="eyebrow">Nebula View</p>
        <h1>Survey active stellar clouds.</h1>
        <p className="page-copy">
          Review mapped sectors, anomaly density, and navigation conditions for upcoming
          expeditions.
        </p>

        <div className="home-hero-actions">
          <WalletDisplay onOpenConnectModal={() => setIsConnectOpen(true)} />
        </div>
      </section>

      <div className="nebula-view-canvas">
        <NebulaCanvas />
      </div>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </div>
  )
}

export default NebulaView