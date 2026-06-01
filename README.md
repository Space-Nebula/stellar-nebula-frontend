# Nebula Nomad Frontend

**Nebula Nomad: On-Chain Space Exploration Sim** – The frontend for a serene, decentralized space exploration game on the Stellar blockchain. Drift through procedurally generated nebulae, harvest stardust resources as Stellar assets, and upgrade your NFT ship in a chill, combat-free experience. Built with React, TypeScript, Vite, Stellar SDK, and Three.js for immersive, mobile-first visuals.

This repo powers the web app interface, connecting to the [backend smart contracts](https://github.com/Space-Nebula/stellar-nebula-nomad) via Soroban. It's designed for seamless Web3 integration: wallet connects, real-time txns, and on-chain procedural generation seeded by Stellar ledgers for fair, verifiable exploration.

## Overview

Nebula Nomad reimagines Web3 gaming as relaxing discovery. No grinding or PvPjust captain your customizable spaceship (NFT modules), scan cosmic anomalies for loot, and trade on Stellar's DEX. Key innovations:

- **Ledger-Seeded Procedural Gen**: Nebula layouts and rarity use Stellar transaction hashes as RNG seeds transparent and tamper-proof.
- **Micro-Transaction Economy**: Harvest costs 0.01 XLM; upgrades burn resources for yields. All on-chain for true ownership.
- **Modern Stack**: React 18+ for dynamic UI, Three.js for particle-based nebulae (lightweight, performant on mobile), Stellar SDK for frictionless blockchain ops.

This frontend demonstrates Stellar's low-latency for real time gaming, targeting crypto newcomers with 5 min sessions. Ecosystem impact: Reusable hooks for Soroban-Wallet integration in other dApps. Part of [Space-Nebula](https://github.com/Space-Nebula), seeking Drips Wave II funding for AR expansions and community modules.

[Live Demo](https://nebula-nomad.vercel.app) (Futurenet) | [Backend Repo](https://github.com/Space-Nebula/stellar-nebula-nomad) | [Docs Repo](https://github.com/Space-Nebula/stellar-nebula-docs)

## Features

- **Wallet Integration**: Connect via Freighter or Albedo; sign txns for scans/upgrades.
- **Immersive Nebula View**: Three.js canvas renders procedural clouds with interactive scanning (click to harvest).
- **Ship Dashboard**: Real-time stats, asset viewer for NFTs/resources, upgrade flows with txn previews.
- **Responsive Design**: Mobile-first (Tailwind CSS), dark mode, haptics for scans.
- **Contract Hooks**: `useNebulaScan` for calling `scan_nebula`/`upgrade_ship` with error handling.
- **Testing & Accessibility**: Vitest for components, ARIA labels for Web3 UX.

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn.
- Stellar testnet wallet (e.g., Freighter browser extension).
- Funded Futurenet account (get test XLM at [lab.stellar.org](https://lab.stellar.org)).

### Setup

1. Clone the repo:
   git clone https://github.com/Space-Nebula/stellar-nebula-frontend.git
   cd stellar-nebula-frontend
   text2. Install dependencies:
   npm install
   text3. Run dev server:
   npm run dev
   textOpen [http://localhost:5173](http://localhost:5173) – connect wallet and scan a nebula!

## Docker

You can also run the project using Docker for a consistent development environment:

### Development

```bash
npm run docker:dev
```

This will start the development server with hot reloading at `http://localhost:5173`.

### Production Build

```bash
npm run docker:build
npm run docker:prod
```

This will build and serve the production version at `http://localhost:8080`.

## Storybook

We use Storybook to document and develop our UI components in isolation.

To start Storybook:

```bash
npm run storybook
```

To build Storybook for deployment:

```bash
npm run build-storybook
```

### Local Testing with Backend

- Deploy backend contracts to Futurenet (see [backend README](https://github.com/Space-Nebula/stellar-nebula-nomad)).
- Update `utils/stellar.ts` with contract IDs.
- Mock txns in tests with MSW for offline dev.

## Architecture

High-level flow: User → Wallet Connect → Scan Button → Hook Calls Contract → Three.js Animates Loot → DEX Trade UI.

graph TD
A[User Wallet<br/>(Freighter)] --> B[App.tsx<br/>(Providers: Wallet, Stellar)]
B --> C[NebulaView.tsx<br/>(Three.js Canvas)]
C --> D[useNebulaScan Hook<br/>(Stellar SDK)]
D --> E[Soroban Contracts<br/>(scan_nebula)]
E --> F[Asset Minter<br/>(Stardust NFT)]
F --> G[UI Update<br/>(ShipDashboard)]
G --> H[DEX Trade Modal<br/>(Stellar SDK)]

Providers: Wraps app with StellarProvider for network config.
State Management: Zustand for lightweight ship/resources state (off-chain cache).
Error Boundaries: Catches txn failures with user-friendly toasts (react-hot-toast).

Development
Building
textnpm run build # Outputs to /dist
Testing

Unit: npm test (Vitest + React Testing Library).
Performance: npm run performance:test (FPS and memory regression coverage), npm run performance:ci (Lighthouse CI with budget enforcement).
E2E: Add Cypress later; current coverage: Components (80%+).
Lint: npm run lint (ESLint + Prettier).

Performance Testing

See [docs/performance-testing.md](docs/performance-testing.md) for thresholds, local commands, and Lighthouse report interpretation.

Deployment

Vercel/Netlify: npm run deploy (via scripts/deploy.sh – auto-links to backend).
Optimize: Vite bundles Three.js efficiently; use vite-plugin-glsl for shaders if expanding.

Environment Variables

VITE_STELLAR_NETWORK=futurenet (or mainnet).
VITE_CONTRACT_ID=your_deployed_id.

Contributing
We welcome contributions! Fork, branch (feat/your-feature), and submit PRs.

Issues: Use templates for bugs/features. Label: good-first-issue for newcomers.
Branching: main for stable; dev for integrations.
Commits: Conventional (e.g., feat: add scan animation); changelog auto-gen.
Reviews: 1 approval + tests passing.

See CONTRIBUTING.md for details. Join us on Stellar Discord (#soroban channel).
Code of Conduct
This project adheres to the Contributor Covenant Code of Conduct. By participating, you agree to uphold it. Harassment-free: Report issues to conduct@novastellarlabs.eth.
Full text in CODE_OF_CONDUCT.md.
License
This project is MIT licensed. See LICENSE for details.
Acknowledgments

Stellar Team: For Soroban and SDKpowering fair on-chain gaming.
Open-Source Deps: React, Three.js, Stellar SDKhuge thanks to maintainers.
Inspiration: No Man's Sky procedural vibes, but blockchain-native.
Funders: Built with community support; eyeing Drips Wave II for polish.
