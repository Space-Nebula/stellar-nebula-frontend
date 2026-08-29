import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import type * as WalletsService from '@services/wallets'
import { WalletProvider } from '@/contexts/WalletContext'
import { ConnectModal } from '../ConnectModal'

vi.mock('@services/wallets', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof WalletsService
  return {
    ...actual,
    isFreighterInstalled: vi.fn().mockResolvedValue(true),
    connectFreighter: vi.fn().mockResolvedValue('GFREIGHTER123'),
    getFreighterNetwork: vi.fn().mockResolvedValue('testnet'),
    isAlbedoAvailable: vi.fn().mockReturnValue(true),
    connectAlbedo: vi.fn().mockResolvedValue('GALBEDO123'),
    signTransactionWithFreighter: vi.fn(),
    signTransactionWithAlbedo: vi.fn(),
  }
})

// happy-dom doesn't implement <dialog> — patch the prototype
HTMLDialogElement.prototype.showModal = vi.fn()
HTMLDialogElement.prototype.close = vi.fn()

function renderModal(isOpen = true, onClose = vi.fn()) {
  return render(
    <WalletProvider>
      <ConnectModal isOpen={isOpen} onClose={onClose} />
    </WalletProvider>
  )
}

describe('ConnectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders wallet options when open', () => {
    renderModal()
    expect(screen.getByText('Freighter')).toBeInTheDocument()
    expect(screen.getByText('Albedo')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    renderModal(false)
    expect(screen.queryByText('Freighter')).not.toBeInTheDocument()
  })

  it('shows Available badge for installed wallets', async () => {
    renderModal()
    await waitFor(() => {
      expect(screen.getAllByText('Available').length).toBeGreaterThan(0)
    })
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    renderModal(true, onClose)
    // Wait for async Freighter check to settle so no un-wrapped state update warning
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    // Use hidden:true because happy-dom treats <dialog> content as aria-hidden by default
    const closeBtn = screen.getByRole('button', { name: /close modal/i, hidden: true })
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('initiates Freighter connection when option is clicked', async () => {
    const { connectFreighter } = await import('@services/wallets')
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('Freighter').closest('button')).not.toBeDisabled()
    })

    await act(async () => {
      await userEvent.click(screen.getByText('Freighter').closest('button')!)
    })
    expect(connectFreighter).toHaveBeenCalled()
  })

  it('initiates Albedo connection when option is clicked', async () => {
    const { connectAlbedo } = await import('@services/wallets')
    renderModal()

    await waitFor(() => {
      expect(screen.getByText('Albedo').closest('button')).not.toBeDisabled()
    })

    await act(async () => {
      await userEvent.click(screen.getByText('Albedo').closest('button')!)
    })
    expect(connectAlbedo).toHaveBeenCalled()
  })

  it('displays an error message on connection failure', async () => {
    const { connectFreighter } = await import('@services/wallets')
    vi.mocked(connectFreighter).mockRejectedValue(new Error('User rejected'))

    renderModal()

    await waitFor(() => {
      expect(screen.getByText('Freighter').closest('button')).not.toBeDisabled()
    })

    await act(async () => {
      await userEvent.click(screen.getByText('Freighter').closest('button')!)
    })

    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(/rejected/i)
  })
})
