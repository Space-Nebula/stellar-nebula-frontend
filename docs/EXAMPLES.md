# Code Examples

This document provides runnable code examples for common workflows and integration points in Stellar Nebula.

## Table of Contents

- [1. Wallet Connection](#1-wallet-connection)
- [2. Building and Submitting Stellar Operations](#2-building-and-submitting-stellar-operations)
- [3. Three.js Procedural Nebula Rendering](#3-threejs-procedural-nebula-rendering)
- [4. React Hook Integration](#4-react-hook-integration)
- [5. Standalone Example Files](#5-standalone-example-files)

---

## 1. Wallet Connection

### Connecting to Freighter

```typescript
import { isConnected, getAddress, signTransaction } from '@stellar/freighter-api'

export async function connectFreighterWallet() {
  const connected = await isConnected()
  if (!connected) {
    throw new Error('Freighter extension not detected or unlocked.')
  }
  const { address, error } = await getAddress()
  if (error || !address) {
    throw new Error(`Connection failed: ${error}`)
  }
  return address
}
```

### Connecting to Albedo

```typescript
import albedo from '@albedo-link/intent'

export async function connectAlbedoWallet() {
  const result = await albedo.publicKey({ require_existing: false })
  return result.pubkey
}
```

---

## 2. Building and Submitting Stellar Operations

### Transferring XLM via Horizon

```typescript
import * as StellarSdk from '@stellar/stellar-sdk'

export async function transferXlm(
  senderKey: string,
  destinationKey: string,
  amount: string,
  serverUrl = 'https://horizon-testnet.stellar.org',
  signTx: (xdr: string) => Promise<string>
) {
  const server = new StellarSdk.Horizon.Server(serverUrl)
  const account = await server.loadAccount(senderKey)
  const fee = await server.fetchBaseFee()

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: fee.toString(),
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationKey,
        asset: StellarSdk.Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build()

  const signedXdr = await signTx(transaction.toXDR())
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET)
  return await server.submitTransaction(signedTx)
}
```

---

## 3. Three.js Procedural Nebula Rendering

```typescript
import * as THREE from 'three'

export function createNebulaCloud(particleCount = 2000, radius = 40): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  const base = new THREE.Color('#4c1d95')
  const tip = new THREE.Color('#06b6d4')

  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * 2 * Math.PI
    const phi = Math.acos(2 * Math.random() - 1)
    const r = Math.cbrt(Math.random()) * radius

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    const blended = base.clone().lerp(tip, r / radius)
    colors[i * 3] = blended.r
    colors[i * 3 + 1] = blended.g
    colors[i * 3 + 2] = blended.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  })

  return new THREE.Points(geometry, material)
}
```

---

## 4. React Hook Integration

### Using Fee Estimation Hook

```tsx
import React from 'react'
import { useFeeEstimation } from '../hooks/useFeeEstimation'

export const FeeDisplay: React.FC = () => {
  const { baseFee, surgeMultiplier, loading } = useFeeEstimation()

  if (loading) return <div>Estimating network fee...</div>

  return (
    <div className="fee-badge">
      <span>Fee: {baseFee} stroops</span>
      {surgeMultiplier > 1 && <span> (Surge: {surgeMultiplier}x)</span>}
    </div>
  )
}
```

---

## 5. Standalone Example Files

Check the dedicated sample files located in `docs/examples/`:

- `docs/examples/wallet-connection.ts`
- `docs/examples/stellar-transaction.ts`
- `docs/examples/nebula-rendering.ts`
