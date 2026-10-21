import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconButton } from './IconButton'

const meta: Meta<typeof IconButton> = {
  title: 'UI/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'ghost', 'outline', 'subtle'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof IconButton>

export const Default: Story = {
  args: {
    'aria-label': 'Refresh sector data',
    variant: 'default',
    size: 'md',
    children: '↻',
  },
}

export const Ghost: Story = {
  args: {
    'aria-label': 'Close dialog',
    variant: 'ghost',
    size: 'md',
    children: '✕',
  },
}

export const Outline: Story = {
  args: {
    'aria-label': 'Zoom in nebula',
    variant: 'outline',
    size: 'lg',
    children: '+',
  },
}

export const Subtle: Story = {
  args: {
    'aria-label': 'Settings',
    variant: 'subtle',
    size: 'sm',
    children: '⚙',
  },
}
