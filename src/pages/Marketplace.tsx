import { DEXInterface } from '../components/Marketplace/DEXInterface'

function Marketplace() {
  return (
    <div className="marketplace-view">
      <section className="page-panel">
        <p className="eyebrow">Marketplace</p>
        <h1>Trade modules and mission supplies.</h1>
        <p className="page-copy">
          Browse ship upgrades, exploration contracts, and rare inventory from allied stations. Swap
          harvested resources directly on the Stellar network below.
        </p>
      </section>

      <section className="page-panel" aria-label="Stellar exchange">
        <DEXInterface />
      </section>
    </div>
  )
}

export default Marketplace
