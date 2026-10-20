import { useMemo, useState } from 'react'
import type { ShipUpgradeOption } from '../Ship/UpgradeModal'
import { useShipUpgrade } from '../../hooks/contracts/useShipUpgrade'
import { useWallet } from '../../contexts/WalletContext'
import { trackEvent } from '../../services/analytics'
import { useTutorialStore } from '../../store/tutorialStore'
import { UPGRADE_CONFIRMATION_DELAY_MS } from '../../constants/game'
import {
  useResourceStore,
  useAchievementStore,
  useShipStore,
  type ResourceType,
  type Ship,
} from '../../store'
import { hasResources } from './dashboardData'
import { getErrorMessage } from '@utils/error-messages'

/**
 * Owns the upgrade bay state and both upgrade paths for the active ship: the local
 * (demo) path that applies optimistically, and the contract path that is simulated,
 * reviewed in a confirm modal, then signed.
 */
export function useShipUpgradeFlow(activeShip: Ship | null) {
  const { walletState } = useWallet()
  const {
    applyOptimisticShipUpdate,
    confirmOptimisticShipUpdate,
    rollbackOptimisticShipUpdate,
    upsertShip,
    optimisticTransactions: shipOptimisticTransactions,
  } = useShipStore()
  const {
    inventory,
    optimisticTransactions,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
  } = useResourceStore()
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null)
  // Contract-path pre-sign review: the upgrade is built + simulated first so
  // the player can verify the fee, resource cost, and expected outcome before
  // the wallet signs anything.
  const [pendingContractUpgrade, setPendingContractUpgrade] = useState<ShipUpgradeOption | null>(
    null
  )
  const [isPreparingUpgrade, setIsPreparingUpgrade] = useState(false)
  const recordUpgradeCompleted = useAchievementStore((state) => state.recordUpgradeCompleted)
  const completeTutorialObjective = useTutorialStore((state) => state.completeObjective)

  const upgradeContract = useShipUpgrade(activeShip?.id)

  const pendingUpgrade = useMemo(
    () =>
      optimisticTransactions.find(
        (transaction) =>
          transaction.status === 'pending' && transaction.label.startsWith('Upgrade:')
      ) ??
      shipOptimisticTransactions.find(
        (transaction) =>
          transaction.status === 'pending' && transaction.label.startsWith('Upgrade:')
      ),
    [optimisticTransactions, shipOptimisticTransactions]
  )

  const latestUpgradeResult = useMemo(
    () =>
      optimisticTransactions.find(
        (transaction) =>
          transaction.label.startsWith('Upgrade:') && transaction.status !== 'pending'
      ) ??
      shipOptimisticTransactions.find(
        (transaction) =>
          transaction.label.startsWith('Upgrade:') && transaction.status !== 'pending'
      ),
    [optimisticTransactions, shipOptimisticTransactions]
  )

  const handleApplyUpgrade = async (upgrade: ShipUpgradeOption) => {
    if (!activeShip || !hasResources(inventory, upgrade.cost)) return

    const changes = Object.fromEntries(
      Object.entries(upgrade.cost).map(([resource, amount]) => [resource, -(amount ?? 0)])
    ) as Partial<Record<ResourceType, number>>
    trackEvent('upgrade_started', {
      upgradeId: upgrade.id,
      shipModel: activeShip.model,
      creditsCost: upgrade.cost.credits ?? 0,
      mineralsCost: upgrade.cost.minerals ?? 0,
    })

    const upgradedShip: Partial<Ship> = {
      cargoCapacity: activeShip.cargoCapacity + (upgrade.cargoDelta ?? 0),
      crewCapacity: activeShip.crewCapacity + (upgrade.crewDelta ?? 0),
      status: upgrade.statusAfter ?? 'docked',
      lastKnownSector: upgrade.sectorLabel ?? activeShip.lastKnownSector,
    }

    // 1. Immediately apply optimistic updates to BOTH resource store and ship store
    const resourceTxId = applyOptimisticUpdate(`Upgrade: ${upgrade.name}`, changes)
    const shipTxId = applyOptimisticShipUpdate(
      `Upgrade: ${upgrade.name}`,
      activeShip.id,
      upgradedShip
    )

    trackEvent('upgrade_started', {
      upgradeId: upgrade.id,
      shipModel: activeShip.model,
      creditsCost: upgrade.cost.credits ?? 0,
      mineralsCost: upgrade.cost.minerals ?? 0,
    })

    const useContractPath = walletState.isConnected && Boolean(upgradeContract.shipNFT)

    if (useContractPath) {
      // Phase 1 — build + simulate, surface the preview, and hand it to the
      // player for review in the confirm modal. Nothing is signed yet and no
      // optimistic update is applied: the actual submission does that.
      setIsPreparingUpgrade(true)
      try {
        await upgradeContract.buildUpgradeTransaction()
        setPendingContractUpgrade(upgrade)
      } catch {
        setUpgradeMessage(
          `${upgrade.name} could not be simulated: ${upgradeContract.error ?? 'unknown error'}.`
        )
        return
      } finally {
        setIsPreparingUpgrade(false)
      }
      setUpgradeMessage(`${upgrade.name} is submitting on-chain…`)
      setIsUpgradeOpen(false)

      try {
        const txHash = await upgradeContract.executeUpgrade()

        if (txHash) {
          confirmOptimisticShipUpdate(shipTxId, undefined, txHash)
          confirmOptimisticUpdate(resourceTxId, undefined, txHash)
          void upgradeContract.refresh()
          recordUpgradeCompleted({ upgradeId: upgrade.id, shipId: activeShip.id })
          completeTutorialObjective('first-upgrade')
          trackEvent('upgrade_confirmed', {
            upgradeId: upgrade.id,
            cargoDelta: upgrade.cargoDelta ?? 0,
            crewDelta: upgrade.crewDelta ?? 0,
            txHash,
          })
          setUpgradeMessage(`${upgrade.name} confirmed on-chain (${txHash.slice(0, 8)}).`)
        } else {
          const errMsg = upgradeContract.error ?? 'Contract upgrade failed'
          rollbackOptimisticShipUpdate(shipTxId, errMsg)
          rollbackOptimisticUpdate(resourceTxId, errMsg)
          trackEvent('upgrade_failed', {
            upgradeId: upgrade.id,
            reason: 'contract_error',
          })
          setUpgradeMessage(`${upgrade.name} failed and changes were rolled back.`)
        }
      } catch (error) {
        const errMsg = getErrorMessage(error, 'Contract upgrade failed')
        rollbackOptimisticShipUpdate(shipTxId, errMsg)
        rollbackOptimisticUpdate(resourceTxId, errMsg)
        trackEvent('upgrade_failed', {
          upgradeId: upgrade.id,
          reason: 'contract_exception',
        })
        setUpgradeMessage(`${upgrade.name} failed and changes were rolled back.`)
      }
      return
    }

    void applyOptimisticUpdate(`Upgrade: ${upgrade.name}`, changes)
    upsertShip(upgradedShip as Ship)

    setUpgradeMessage(`${upgrade.name} is pending transaction confirmation.`)
    setUpgradeMessage(`${upgrade.name} is pending confirmation.`)
    setIsUpgradeOpen(false)

    try {
      await new Promise((resolve) => window.setTimeout(resolve, UPGRADE_CONFIRMATION_DELAY_MS))
      confirmOptimisticShipUpdate(shipTxId)
      confirmOptimisticUpdate(resourceTxId)
      recordUpgradeCompleted({ upgradeId: upgrade.id, shipId: activeShip.id })
      completeTutorialObjective('first-upgrade')
      trackEvent('upgrade_confirmed', {
        upgradeId: upgrade.id,
        cargoDelta: upgrade.cargoDelta ?? 0,
        crewDelta: upgrade.crewDelta ?? 0,
      })
      setUpgradeMessage(`${upgrade.name} confirmed successfully.`)
    } catch (error) {
      rollbackOptimisticShipUpdate(
        shipTxId,
        getErrorMessage(error, 'Upgrade failed')
      )
      rollbackOptimisticUpdate(
        resourceTxId,
        getErrorMessage(error, 'Upgrade failed')
      )
      trackEvent('upgrade_failed', {
        upgradeId: upgrade.id,
        reason: error instanceof Error ? error.name || 'Error' : 'unknown',
      })
      setUpgradeMessage(`${upgrade.name} failed and changes were rolled back.`)
    }
  }

  // Phase 2 — the player reviewed the simulation and confirmed. Now actually
  // sign, submit, and reconcile the optimistic ship update.
  const handleConfirmContractUpgrade = async () => {
    if (!pendingContractUpgrade || !activeShip) return

    const upgrade = pendingContractUpgrade
    const previousShip = activeShip
    const changes = Object.fromEntries(
      Object.entries(upgrade.cost).map(([resource, amount]) => [resource, -(amount ?? 0)])
    ) as Partial<Record<ResourceType, number>>
    const transactionId = applyOptimisticUpdate(`Upgrade: ${upgrade.name}`, changes)

    const upgradedShip = {
      ...activeShip,
      cargoCapacity: activeShip.cargoCapacity + (upgrade.cargoDelta ?? 0),
      crewCapacity: activeShip.crewCapacity + (upgrade.crewDelta ?? 0),
      status: upgrade.statusAfter ?? 'docked',
      lastKnownSector: upgrade.sectorLabel ?? activeShip.lastKnownSector,
    }

    setPendingContractUpgrade(null)
    setUpgradeMessage(
      `${upgrade.name} is awaiting your wallet signature (times out after 60 seconds).`
    )

    const txHash = await upgradeContract.executeUpgrade()

    if (txHash) {
      upsertShip(upgradedShip)
      confirmOptimisticUpdate(transactionId)
      trackEvent('upgrade_confirmed', {
        upgradeId: upgrade.id,
        cargoDelta: upgrade.cargoDelta ?? 0,
        crewDelta: upgrade.crewDelta ?? 0,
        txHash,
      })
      setUpgradeMessage(`${upgrade.name} confirmed on-chain (${txHash.slice(0, 8)}).`)
      setIsUpgradeOpen(false)
    } else {
      upsertShip(previousShip)
      rollbackOptimisticUpdate(transactionId, upgradeContract.error ?? 'Contract upgrade failed')
      trackEvent('upgrade_failed', {
        upgradeId: upgrade.id,
        reason: 'contract_error',
      })
      setUpgradeMessage(`${upgrade.name} failed and resource changes were rolled back.`)
    }
  }

  return {
    inventory,
    walletState,
    upgradeContract,
    isUpgradeOpen,
    setIsUpgradeOpen,
    upgradeMessage,
    pendingContractUpgrade,
    setPendingContractUpgrade,
    isPreparingUpgrade,
    pendingUpgrade,
    latestUpgradeResult,
    handleApplyUpgrade,
    handleConfirmContractUpgrade,
  }
}
