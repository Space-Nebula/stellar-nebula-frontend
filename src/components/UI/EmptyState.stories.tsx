import type { Meta, StoryObj } from '@storybook/react-vite'
import { EmptyState } from './EmptyState'

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    compact: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {
    icon: '🚀',
    title: 'No Active Missions',
    description: 'You have not scanned any nebula coordinates yet. Begin your exploration today.',
    action: {
      label: 'Start First Mission',
      onClick: () => alert('Starting mission...'),
    },
    secondaryAction: {
      label: 'Read Guide',
      onClick: () => alert('Opening guide...'),
    },
  },
}

export const Compact: Story = {
  args: {
    compact: true,
    icon: '📦',
    title: 'Inventory Empty',
    description: 'Harvest nebulite clusters to craft ship upgrades.',
    action: {
      label: 'Scan Sector',
      onClick: () => alert('Scanning...'),
    },
  },
}
