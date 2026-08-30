import type { Meta, StoryObj } from '@storybook/react-vite'
import { WalletDisplay } from './WalletDisplay'
import { WalletContext } from '@/contexts/WalletContext'
import type { WalletContextValue } from '@/contexts/WalletContext'

const noop = () => undefined
const noopAsync = async () => undefined
const noopSign = async () => null

function makeCtx(overrides: Partial<WalletContextValue>): WalletContextValue {
  return {
    walletState: { isConnected: false, publicKey: null, walletType: null, network: null },
    isLoading: false,
    error: null,
    isReconnecting: false,
    reconnectError: null,
    isFreighterInstalled: false,
    isAlbedoAvailable: false,
    networkMismatchWarning: null,
    connect: noopAsync,
    disconnect: noop,
    switchWallet: noopAsync,
    signTransaction: noopSign,
    clearError: noop,
    clearNetworkWarning: noop,
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
  args: { onOpenConnectModal: noop },
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
