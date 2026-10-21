# Stellar Nebula Tutorials

Welcome to the step-by-step developer tutorials for Stellar Nebula.

---

## Tutorial 1: Getting Started with Local Development

### 1. Prerequisites

- Node.js >= 20
- npm >= 10
- Git

### 2. Setup

```bash
git clone <repository-url>
cd stellar-nebula-frontend
npm install
cp .env.example .env
npm run dev
```

### 3. Running Test Suites

```bash
# Run unit and component tests
npm test

# Run Storybook locally
npm run storybook
```

---

## Tutorial 2: Connecting a Stellar Wallet

### Step 1: Hooking into the Wallet Context

Use the built-in wallet hook in your view component:

```tsx
import React from 'react'
import { useFreighterWallet } from '../hooks/useFreighterWallet'
import { Button } from '../components/Button'

export const ConnectWalletPanel: React.FC = () => {
  const { address, isConnected, connect, disconnect } = useFreighterWallet()

  if (isConnected) {
    return (
      <div>
        <p>Connected account: {address}</p>
        <Button onClick={disconnect}>Disconnect</Button>
      </div>
    )
  }

  return <Button onClick={connect}>Connect Freighter</Button>
}
```

---

## Tutorial 3: Building a Soroban Contract Call

1. Instantiate the contract spec or prepare the invocation arguments.
2. Simulate the transaction against the RPC node to calculate resource footprint.
3. Sign and assemble transaction authorization entries.
4. Broadcast transaction and track status until ledger finality.

```typescript
import * as StellarSdk from '@stellar/stellar-sdk'

export async function invokeSorobanContract(
  contractId: string,
  methodName: string,
  args: StellarSdk.xdr.ScVal[],
  signerPublicKey: string
) {
  const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org')
  const account = await server.getAccount(signerPublicKey)

  const contract = new StellarSdk.Contract(contractId)
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(30)
    .build()

  const preparedTx = await server.prepareTransaction(tx)
  return preparedTx
}
```

---

## Tutorial 4: Creating a New 3D Scene View

When adding a Three.js scene, leverage React Three Fiber and the custom render loop tracker:

1. Import `@react-three/fiber` canvas wrapper.
2. Add camera controls and lighting.
3. Attach procedural meshes or particle systems.
4. Enable adaptive performance monitoring via `useFrameRateMonitor`.
