import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactElement } from 'react'
import ErrorBoundary from './ErrorBoundary'

function Boom(): ReactElement {
  throw new Error('Simulated render error')
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#242424' }],
    },
  },
}

export default meta
type Story = StoryObj<typeof ErrorBoundary>

export const ErrorState: Story = {
  render: () => (
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  ),
}

export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundary fallback={<p style={{ padding: 24, color: '#f87171' }}>Custom fallback UI</p>}>
      <Boom />
    </ErrorBoundary>
  ),
}

export const NoError: Story = {
  render: () => (
    <ErrorBoundary>
      <p style={{ padding: 24, color: 'rgba(255,255,255,0.87)' }}>Everything is fine</p>
    </ErrorBoundary>
  ),
}
