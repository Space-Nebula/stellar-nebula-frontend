import type { Meta, StoryObj } from '@storybook/react-vite'
import { StatusIndicator } from './StatusIndicator'
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
    connect: noopAsync,
    disconnect: noop,
    switchWallet: noopAsync,
    signTransaction: noopSign,
    clearError: noop,
    ...overrides,
  }
}

const meta: Meta<typeof StatusIndicator> = {
  title: 'Wallet/StatusIndicator',
  component: StatusIndicator,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#080815' }],
    },
  },
  args: {
    onOpenConnectModal: noop,
  },
}

export default meta
type Story = StoryObj<typeof StatusIndicator>

export const Disconnected: Story = {
  decorators: [
    (Story) => (
      <WalletContext.Provider value={makeCtx({})}>
        <Story />
      </WalletContext.Provider>
    ),
  ],
}

export const Connected: Story = {
  decorators: [
    (Story) => (
      <WalletContext.Provider
        value={makeCtx({
          walletState: {
            isConnected: true,
            publicKey: 'GAHTJRCKMIQWJSLS6OGCHZMAKSDBUQGIT4AJGBE6KCAJBKNNCLSYTRDS',
            walletType: 'freighter',
            network: 'testnet',
          },
        })}
      >
        <Story />
      </WalletContext.Provider>
    ),
  ],
}

export const Connecting: Story = {
  decorators: [
    (Story) => (
      <WalletContext.Provider value={makeCtx({ isLoading: true })}>
        <Story />
      </WalletContext.Provider>
    ),
  ],
}
