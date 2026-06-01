import type { Meta, StoryObj } from '@storybook/react-vite'
import LoadingScreen from './LoadingScreen'

const meta: Meta<typeof LoadingScreen> = {
  title: 'UI/LoadingScreen',
  component: LoadingScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof LoadingScreen>

export const Initializing: Story = {
  args: {
    progress: 10,
    stageLabel: 'Initializing systems',
  },
}

export const Midway: Story = {
  args: {
    progress: 45,
    stageLabel: 'Loading assets',
    message: 'Downloading cosmic textures...',
  },
}

export const AlmostDone: Story = {
  args: {
    progress: 95,
    stageLabel: 'Finalizing',
    message: 'Ready to launch...',
  },
}
