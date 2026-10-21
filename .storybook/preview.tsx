import type { Preview } from '@storybook/react-vite'
import { Buffer } from 'buffer'

const globalScope = globalThis as unknown as { Buffer?: typeof Buffer }
if (typeof globalScope.Buffer === 'undefined') {
  globalScope.Buffer = Buffer
}
if (typeof window !== 'undefined') {
  const windowScope = window as unknown as { Buffer?: typeof Buffer }
  if (typeof windowScope.Buffer === 'undefined') {
    windowScope.Buffer = Buffer
  }
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
    },
    backgrounds: {
      default: 'space-dark',
      values: [
        {
          name: 'space-dark',
          value: '#0b0e14',
        },
        {
          name: 'space-deep',
          value: '#030712',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
}

export default preview
