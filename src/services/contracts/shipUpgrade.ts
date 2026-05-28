import { BASE_FEE, Operation, TransactionBuilder, rpc, xdr, type Transaction } from '@stellar/stellar-sdk'
import type { StellarNetworkConfig } from '@config/stellar'
import { env } from '@config/env'
import type { ResourceAssetBalance } from '@services/assets/resources'
import type { ShipNFTRecord } from '@services/nft/shipNFT'
import { simulateContractTransaction } from '@utils/stellar/simulate'
import type { ContractNativeValue, ParsedSimulationResult } from '@utils/stellar/responseParser'

export interface ShipUpgradeStats {
  hull: number
  shield: number
  speed: number
  cargoCapacity: number
  crewCapacity: number
}

export interface ShipUpgradeRequirements {
  credits: number
  stardust: number
  nebulite: number
  cosmicDust: number
}

export interface ShipUpgradeQuote {
  canUpgrade: boolean
  missing: Array<{ resource: keyof ShipUpgradeRequirements; deficit: number }>
  requirements: ShipUpgradeRequirements
  updatedStats: ShipUpgradeStats
}

export interface ShipUpgradeBuildResult {
  xdr: string
  transaction: Transaction
  quote: ShipUpgradeQuote
  simulation: ParsedSimulationResult<ContractNativeValue>
}

function asNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateUpgradeRequirements(
  shipId: string,
  ship: ShipNFTRecord | null
): ShipUpgradeRequirements {
  const stats = ship?.metadata.stats ?? {}
  const baseTier = Math.max(1, asNumber(stats.tier) || 1)
  const hull = asNumber(stats.hull) || 100
  const shield = asNumber(stats.shield) || 50
  const cargo = asNumber(stats.cargoCapacity) || 100

  return {
    credits: 250 + baseTier * 125 + Math.floor(cargo / 2),
    stardust: 15 + Math.floor(hull / 20),
    nebulite: 20 + Math.floor(shield / 10),
    cosmicDust: 2 + (shipId.length % 4),
  }
}

export function calculateUpgradedStats(ship: ShipNFTRecord | null): ShipUpgradeStats {
  const stats = ship?.metadata.stats ?? {}
  const hull = asNumber(stats.hull) || 100
  const shield = asNumber(stats.shield) || 50
  const speed = asNumber(stats.speed) || 10
  const cargoCapacity = asNumber(stats.cargoCapacity) || 100
  const crewCapacity = asNumber(stats.crewCapacity) || 4

  return {
    hull: hull + 15,
    shield: shield + 10,
    speed: speed + 1,
    cargoCapacity: cargoCapacity + 25,
    crewCapacity: crewCapacity + 1,
  }
}

export function validateUpgrade(
  requirements: ShipUpgradeRequirements,
  balances: ResourceAssetBalance[]
): ShipUpgradeQuote {
  const held = new Map<string, number>()

  for (const balance of balances) {
    held.set(balance.code.toUpperCase(), asNumber(balance.balance))
  }

  const resourceToAssetCode: Record<keyof ShipUpgradeRequirements, string> = {
    credits: 'XLM',
    stardust: 'STARDUST',
    nebulite: 'NEBULITE',
    cosmicDust: 'COSMICDUST',
  }

  const resources: Array<keyof ShipUpgradeRequirements> = [
    'credits',
    'stardust',
    'nebulite',
    'cosmicDust',
  ]
  const missing = resources.flatMap((resource) => {
    const available = held.get(resourceToAssetCode[resource]) ?? 0
    const deficit = requirements[resource] - available
    return deficit > 0 ? [{ resource, deficit }] : []
  })

  return {
    canUpgrade: missing.length === 0,
    missing,
    requirements,
    updatedStats: {
      hull: 0,
      shield: 0,
      speed: 0,
      cargoCapacity: 0,
      crewCapacity: 0,
    },
  }
}

export async function buildShipUpgradeTransaction(params: {
  accountId: string
  shipId: string
  ship: ShipNFTRecord | null
  balances: ResourceAssetBalance[]
  config?: StellarNetworkConfig
}): Promise<ShipUpgradeBuildResult> {
  const config = params.config
  const rpcServer = new rpc.Server(config?.rpcUrl ?? env.STELLAR_RPC_URL)
  const networkPassphrase = config?.networkPassphrase ?? env.STELLAR_PASSPHRASE
  const requirements = calculateUpgradeRequirements(params.shipId, params.ship)
  const updatedStats = calculateUpgradedStats(params.ship)
  const quote = {
    ...validateUpgrade(requirements, params.balances),
    updatedStats,
  }

  const sourceAccount = await rpcServer.getAccount(params.accountId)
  const payload = {
    ship_id: params.shipId,
    account_id: params.accountId,
    requirements,
    updated_stats: updatedStats,
    ship_nft: params.ship?.metadata ?? null,
  }

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: env.NEBULA_CONTRACT_ID,
        function: 'upgrade_ship',
        args: [xdr.ScVal.scvString(JSON.stringify(payload))],
      })
    )
    .setTimeout(30)
    .setNetworkPassphrase(networkPassphrase)
    .build()

  const prepared = await rpcServer.prepareTransaction(tx)
  const simulation = await simulateContractTransaction<ContractNativeValue>(prepared.toXDR(), {
    config,
    instructionLeeway: 3_000_000,
  })

  return {
    xdr: prepared.toXDR(),
    transaction: prepared,
    quote,
    simulation,
  }
}
