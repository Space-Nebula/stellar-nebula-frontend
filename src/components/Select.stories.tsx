import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './Select'

const sampleOptions = [
  { value: 'testnet', label: 'Stellar Testnet' },
  { value: 'futurenet', label: 'Soroban Futurenet' },
  { value: 'mainnet', label: 'Public Mainnet' },
  { value: 'standalone', label: 'Local Standalone' },
]

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: { type: 'boolean' },
    },
    error: {
      control: { type: 'text' },
    },
    helperText: {
      control: { type: 'text' },
    },
    required: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof Select>

export const Default: Story = {
  args: {
    label: 'Target Network',
    options: sampleOptions,
    placeholder: 'Select a network...',
    helperText: 'Choose the Stellar network to connect',
  },
}

export const WithValue: Story = {
  args: {
    label: 'Target Network',
    options: sampleOptions,
    value: 'testnet',
  },
}

export const WithError: Story = {
  args: {
    label: 'Target Network',
    options: sampleOptions,
    error: 'Network selection is required to broadcast transactions.',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Target Network',
    options: sampleOptions,
    value: 'mainnet',
    disabled: true,
    helperText: 'Network cannot be switched during an active voyage.',
  },
}
