import { describe, expect, it, vi } from 'vitest'
import { validateUpgradeContractCall } from '../shipUpgrade'
import type { ResourceAssetBalance } from '../../assets/resources'
import type { ShipNFTRecord } from '../../nft/shipNFT'

vi.mock('@config/env', () => ({
  env: {
    STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    STELLAR_PASSPHRASE: 'Test SDF Network ; September 2015',
    NEBULA_CONTRACT_ID: 'CTEST',
  },
}))

const ship: ShipNFTRecord = {
  accountId: 'GACCOUNT',
  assetCode: 'SHIPNFT',
  metadata: {
    name: 'Aurora',
    stats: {
      tier: 1,
      hull: 100,
      shield: 50,
      speed: 10,
      cargoCapacity: 100,
      crewCapacity: 4,
    },
    attributes: [],
  },
  fetchedAt: '2026-08-20T00:00:00.000Z',
}

function balances(values: Record<string, string>): ResourceAssetBalance[] {
  return Object.entries(values).map(([code, balance]) => ({
    code,
    balance,
    assetType: code === 'XLM' ? 'native' : 'credit_alphanum12',
  }))
}

describe('ship upgrade contract validation', () => {
  it('rejects invalid contract call inputs and missing balances', () => {
    const result = validateUpgradeContractCall({
      accountId: '',
      shipId: '',
      ship,
      balances: balances({ XLM: '1' }),
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.join(' ')).toMatch(/source account/i)
    expect(result.errors.join(' ')).toMatch(/ship id/i)
    expect(result.errors.join(' ')).toMatch(/insufficient resources/i)
  })

  it('accepts a funded upgrade call and returns the projected quote', () => {
    const result = validateUpgradeContractCall({
      accountId: 'GACCOUNT',
      shipId: 'ship-1',
      ship,
      balances: balances({
        XLM: '10000',
        STARDUST: '10000',
        NEBULITE: '10000',
        COSMICDUST: '10000',
      }),
    })

    expect(result.isValid).toBe(true)
    expect(result.quote.canUpgrade).toBe(true)
    expect(result.quote.updatedStats).toMatchObject({
      hull: 115,
      shield: 60,
      cargoCapacity: 125,
    })
  })
})
