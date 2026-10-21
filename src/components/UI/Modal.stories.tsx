import type { Meta, StoryObj } from '@storybook/react-vite'
import { Modal } from './Modal'
import { Button } from '../Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: { type: 'boolean' },
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
    },
    hideHeader: {
      control: { type: 'boolean' },
    },
    hideCloseButton: {
      control: { type: 'boolean' },
    },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Confirm Warp Jump',
    size: 'md',
    children: (
      <div className="py-2 text-space-100">
        Initiating warp jump will consume 120 units of Nebulite fuel. Proceed to destination?
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => {}}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => {}}>
          Engage Warp
        </Button>
      </div>
    ),
    onClose: () => {},
  },
}

export const SmallAlert: Story = {
  args: {
    isOpen: true,
    title: 'Session Warning',
    size: 'sm',
    children: (
      <div className="py-2 text-space-100">
        Your active session will expire in 2 minutes. Extend connection?
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => {}}>
          Extend
        </Button>
      </div>
    ),
    onClose: () => {},
  },
}
