import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorDisplay } from './ErrorDisplay'

const meta: Meta<typeof ErrorDisplay> = {
  title: 'UI/ErrorDisplay',
  component: ErrorDisplay,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ErrorDisplay>

export const NetworkError: Story = {
  args: {
    error: new Error('Network request timed out while fetching ledger state.'),
    onRetry: () => alert('Retrying network operation...'),
  },
}

export const WalletError: Story = {
  args: {
    error: new Error('User declined transaction signature in Freighter.'),
    onRetry: () => alert('Requesting signature again...'),
  },
}

export const WithoutRetry: Story = {
  args: {
    error: 'An unexpected application state occurred in the simulation.',
  },
}
