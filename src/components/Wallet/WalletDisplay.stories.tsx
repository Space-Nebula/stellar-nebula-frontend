import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from '@storybook/test'
import { WalletDisplay } from './WalletDisplay'
import { WalletContext } from '@/contexts/WalletContext'
import type { WalletContextValue } from '@/contexts/WalletContext'

function makeCtx(overrides: Partial<WalletContextValue>): WalletContextValue {
  return {
    walletState: { isConnected: false, publicKey: null, walletType: null, network: null },
    isLoading: false,
    error: null,
    isReconnecting: false,
    reconnectError: null,
    isFreighterInstalled: false,
    isAlbedoAvailable: false,
    connect: fn(),
    disconnect: fn(),
    switchWallet: fn(),
    signTransaction: fn(),
    clearError: fn(),
    ...overrides,
  }
}

const meta: Meta<typeof WalletDisplay> = {
  title: 'Wallet/WalletDisplay',
  component: WalletDisplay,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080815' }],
    },
  },
  args: { onOpenConnectModal: fn() },
}

export default meta
type Story = StoryObj<typeof WalletDisplay>

export const Disconnected: Story = {
  decorators: [
    (Story) => (
      <WalletContext.Provider value={makeCtx({})}>
        <Story />
      </WalletContext.Provider>
    ),
  ],
}

export const Reconnecting: Story = {
  decorators: [
    (Story) => (
      <WalletContext.Provider value={makeCtx({ isReconnecting: true })}>
        <Story />
      </WalletContext.Provider>
    ),
  ],
}

export const ReconnectFailed: Story = {
  decorators: [
    (Story) => (
      <WalletContext.Provider
        value={makeCtx({ reconnectError: 'Previous wallet session expired. Please reconnect.' })}
      >
        <Story />
      </WalletContext.Provider>
    ),
  ],
}
