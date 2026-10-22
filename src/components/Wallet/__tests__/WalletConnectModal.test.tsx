import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WalletConnectModal } from '../../WalletConnectModal'
import type { UseWalletConnectReturn } from '@hooks/useWalletConnect'

const hookState = vi.hoisted(() => ({ current: {} as UseWalletConnectReturn }))

vi.mock('@hooks/useWalletConnect', () => ({
  useWalletConnect: () => hookState.current,
}))

const connect = vi.fn().mockResolvedValue(undefined)
const clearError = vi.fn()

HTMLDialogElement.prototype.showModal = vi.fn()
HTMLDialogElement.prototype.close = vi.fn()

function setHook(overrides: Partial<UseWalletConnectReturn> = {}) {
  hookState.current = {
    isAvailable: true,
    isConfigured: true,
    isConnected: false,
    isConnecting: false,
    publicKey: null,
    network: null,
    error: null,
    connect,
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    clearError,
    ...overrides,
  }
}

describe('WalletConnectModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setHook()
  })

  it('renders nothing when closed', () => {
    render(<WalletConnectModal isOpen={false} onClose={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('explains QR scanning and offers to open the WalletConnect modal', async () => {
    render(<WalletConnectModal isOpen onClose={vi.fn()} />)

    // happy-dom treats <dialog> content as hidden; query with hidden enabled.
    const button = screen.getByRole('button', {
      name: /open walletconnect qr code/i,
      hidden: true,
    })
    expect(button).toBeEnabled()
    await userEvent.click(button)

    expect(connect).toHaveBeenCalledOnce()
  })

  it('is accessible and dismissible', async () => {
    const onClose = vi.fn()
    render(<WalletConnectModal isOpen onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { hidden: true })
    expect(dialog.getAttribute('aria-label')).toMatch(/connect with walletconnect/i)
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    await userEvent.click(
      screen.getByRole('button', { name: /close walletconnect modal/i, hidden: true })
    )

    expect(clearError).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a configuration error and disables connecting without a project id', () => {
    setHook({ isConfigured: false })
    render(<WalletConnectModal isOpen onClose={vi.fn()} />)

    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(
      /VITE_WALLETCONNECT_PROJECT_ID/
    )
    expect(
      screen.getByRole('button', { name: /open walletconnect qr code/i, hidden: true })
    ).toBeDisabled()
  })

  it('shows a waiting state while the wallet approves', () => {
    setHook({ isConnecting: true })
    render(<WalletConnectModal isOpen onClose={vi.fn()} />)

    expect(screen.getByText(/waiting for approval/i, { exact: false })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /open walletconnect qr code/i, hidden: true })
    ).toBeDisabled()
  })

  it('announces pairing failures', () => {
    setHook({ error: 'Failed to establish WalletConnect session' })
    render(<WalletConnectModal isOpen onClose={vi.fn()} />)

    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent(
      /failed to establish walletconnect session/i
    )
  })

  it('closes once the session is approved', async () => {
    const onClose = vi.fn()
    setHook({ isConnected: true, publicKey: 'GWALLETCONNECT', network: 'testnet' })

    render(<WalletConnectModal isOpen onClose={onClose} />)

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
