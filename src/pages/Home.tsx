import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConnectModal, WalletDisplay } from '@components/Wallet'

const FEATURES = [
  {
    title: 'Scan Nebulite',
    copy: 'Fly the scan points and harvest Nebulite, the mineable resource paid out on-chain.',
  },
  {
    title: 'Command your fleet',
    copy: 'Inspect hull integrity, assign ship classes, and keep your squadron ready between expeditions.',
  },
  {
    title: 'Trade the market',
    copy: 'Buy ship upgrades and rare inventory from allied stations without losing your route.',
  },
  {
    title: 'Wallet-backed progress',
    copy: 'Every claim and upgrade is tied to your Stellar wallet, so your progress travels with you.',
  },
]

const VALUE_POINTS = [
  'On-chain ownership of ships and harvested resources',
  'Low-fee settlement on the Stellar network',
  'Connect with the Freighter extension or the Albedo web wallet',
  'Built for desktop and mobile from the same navigation deck',
]

function Home() {
  const [isConnectOpen, setIsConnectOpen] = useState(false)

  return (
    <>
      <section className="page-hero home-hero">
        <p className="eyebrow">Command Center</p>
        <h1>Explore live nebula routes from one navigation deck.</h1>
        <p className="page-copy">
          Track discoveries, monitor fleet readiness, and jump into the marketplace without losing
          your place in the mission flow.
        </p>

        <div className="home-hero-actions">
          <WalletDisplay onOpenConnectModal={() => setIsConnectOpen(true)} />
          <Link to="/nebula" className="primary-action">
            Survey the Nebula
          </Link>
        </div>

        <p className="home-hero-note">
          Connect a Stellar wallet to sign scans and claim resources on-chain.
        </p>
      </section>

      <section className="home-section" aria-labelledby="feature-heading">
        <h2 id="feature-heading" className="home-section-title">
          Command the deep
        </h2>
        <div className="home-feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="home-feature">
              <h3 className="home-feature-title">{feature.title}</h3>
              <p className="home-feature-copy">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-value" aria-labelledby="value-heading">
        <p className="eyebrow">Why Stellar</p>
        <h2 id="value-heading" className="home-section-title">
          Own your progress on-chain
        </h2>
        <p className="page-copy">
          Stellar Nebula turns long-range scanning into a verifiable mission loop: scan sectors,
          detect anomalies, harvest resources, and upgrade NFT-capable ships settled transparently
          on the Stellar network.
        </p>
        <ul className="home-value-list">
          {VALUE_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <ConnectModal isOpen={isConnectOpen} onClose={() => setIsConnectOpen(false)} />
    </>
  )
}

export default Home
