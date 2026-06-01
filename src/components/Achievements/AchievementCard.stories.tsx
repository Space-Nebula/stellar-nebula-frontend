import type { Meta, StoryObj } from '@storybook/react-vite'
import { AchievementCard } from './AchievementCard'

const meta: Meta<typeof AchievementCard> = {
  title: 'Game/AchievementCard',
  component: AchievementCard,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md p-6 bg-black">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AchievementCard>

export const Locked: Story = {
  args: {
    achievement: {
      id: '1',
      title: 'First Voyage',
      description: 'Travel your first 100 light years.',
      icon: '🚀',
      progress: 25,
      target: 100,
      unlocked: false,
      rarity: 'common',
    },
  },
}

export const Common: Story = {
  args: {
    achievement: {
      id: '2',
      title: 'Stardust Collector',
      description: 'Collect 100 units of Stardust.',
      icon: '✨',
      progress: 100,
      target: 100,
      unlocked: true,
      rarity: 'common',
      unlockedAt: '2024-03-20T10:00:00Z',
    },
  },
}

export const Legendary: Story = {
  args: {
    achievement: {
      id: '3',
      title: 'Nebula Master',
      description: 'Explore 10 different nebulae.',
      icon: '🌌',
      progress: 10,
      target: 10,
      unlocked: true,
      rarity: 'legendary',
      unlockedAt: '2024-03-21T15:30:00Z',
    },
  },
}
