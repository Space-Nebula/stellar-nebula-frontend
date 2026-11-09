# Migration Guides

This document provides comprehensive, step-by-step migration guides for major transitions and breaking architectural updates in the Nebula Nomad frontend.

---

## Table of Contents

1. [Migration from v0.9 to v1.0](#migration-from-v09-to-v10)
   - [React 19 & Compiler Modernization](#1-react-19--compiler-modernization)
   - [Stellar SDK v13+ & Soroban RPC Alignment](#2-stellar-sdk-v13--soroban-rpc-alignment)
   - [Freighter Wallet Integration Overhaul](#3-freighter-wallet-integration-overhaul)
   - [State Management & TanStack Query v5](#4-state-management--tanstack-query-v5)
2. [Three.js & WebGL Performance Engine Migration](#threejs--webgl-performance-engine-migration)
3. [Environment Configuration Updates](#environment-configuration-updates)

---

## Migration from v0.9 to v1.0

### 1. React 19 & Compiler Modernization

#### Breaking Change

React 19 deprecates string refs, legacy context, and changes how `ref` props are forwarded to components. `forwardRef` is no longer mandatory, and `use()` handles asynchronous resolution.

#### Before (v0.9):

```tsx
import React, { forwardRef } from 'react'

interface VesselCardProps {
  id: string
  name: string
}

export const VesselCard = forwardRef<HTMLDivElement, VesselCardProps>((props, ref) => {
  return (
    <div ref={ref} className="vessel-card">
      <h3>{props.name}</h3>
    </div>
  )
})
VesselCard.displayName = 'VesselCard'
```

#### After (v1.0):

```tsx
import React from 'react'

interface VesselCardProps {
  id: string
  name: string
  ref?: React.Ref<HTMLDivElement>
}

export function VesselCard({ id, name, ref }: VesselCardProps) {
  return (
    <div ref={ref} className="vessel-card">
      <h3>{name}</h3>
    </div>
  )
}
```

---

### 2. Stellar SDK v13+ & Soroban RPC Alignment

#### Breaking Change

The Stellar SDK modernized transaction submission and Soroban RPC querying. Legacy Horizon polling for contract invocations is replaced with `rpc.Server.simulateTransaction` and `rpc.Server.sendTransaction`.

#### Before (v0.9):

```typescript
import { Server } from 'stellar-sdk'

const server = new Server('https://horizon-testnet.stellar.org')
const account = await server.loadAccount(publicKey)
// Legacy horizon-based contract call polling
```

#### After (v1.0):

```typescript
import { rpc, TransactionBuilder, Networks } from '@stellar/stellar-sdk'

const server = new rpc.Server(import.meta.env.VITE_SOROBAN_RPC_URL)
const simResult = await server.simulateTransaction(tx)
if (rpc.Api.isSimulationSuccess(simResult)) {
  const sendResult = await server.sendTransaction(tx)
  // Track status via getTransaction
}
```

---

### 3. Freighter Wallet Integration Overhaul

#### Breaking Change

Freighter API v5+ moved from window-injected globals (`window.freighter`) to modular imports via `@stellar/freighter-api` with unified asynchronous error handling.

#### Before (v0.9):

```typescript
if (window.freighter) {
  const pk = await window.freighter.getPublicKey()
}
```

#### After (v1.0):

```typescript
import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api'

const connected = await isConnected()
if (connected.isConnected) {
  const { publicKey } = await getPublicKey()
  console.log('Connected wallet:', publicKey)
}
```

---

### 4. State Management & TanStack Query v5

#### Breaking Change

TanStack Query v5 unified query functions under object signatures and removed legacy callback handlers (`onSuccess`, `onError`) from `useQuery`.

#### Before (v0.9):

```typescript
const { data } = useQuery(['vessels', accountId], () => fetchVessels(accountId), {
  onSuccess: (data) => console.log('Loaded', data),
})
```

#### After (v1.0):

```typescript
const { data } = useQuery({
  queryKey: ['vessels', accountId],
  queryFn: () => fetchVessels(accountId),
})
```

---

## Three.js & WebGL Performance Engine Migration

Nebula Nomad visualizes celestial vessels using Three.js and `@react-three/fiber`. In v1.0:

- Canvas context creation uses strict WebGL2 contexts.
- Geometries and materials must implement explicit `.dispose()` lifecycles when components unmount to prevent GPU memory leaks.
- Framerate optimization budgets enforce 60 FPS under standard load.

---

## Environment Configuration Updates

In `.env`:

- `VITE_STELLAR_NETWORK` must be set to `TESTNET` or `PUBLIC`.
- `VITE_SOROBAN_RPC_URL` replaces deprecated `VITE_HORIZON_RPC_URL`.
- `VITE_CONTRACT_ID` specifies the deployed Soroban contract address.
