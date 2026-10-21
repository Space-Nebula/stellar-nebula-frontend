# Storybook Guide

Stellar Nebula uses Storybook for isolated component development, visual testing, and interactive documentation.

## Running Storybook Locally

Start the Storybook development server:

```bash
npm run storybook
```

This starts the dev server at `http://localhost:6006`.

## Building Static Storybook

To build the static documentation bundle:

```bash
npm run build-storybook
```

The output will be generated in `storybook-static/`.

## Writing New Stories

Follow the Component Story Format (CSF 3) pattern:

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { MyComponent } from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'UI/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
  },
}

export default meta
type Story = StoryObj<typeof MyComponent>

export const Default: Story = {
  args: {
    variant: 'primary',
  },
}
```

## Best Practices

1. **Interactive Controls**: Always specify `argTypes` controls for props so designers and developers can test edge cases interactively.
2. **Accessibility Audits**: Storybook runs automated a11y checks using `@storybook/addon-a11y`. Check the Accessibility tab in the panel.
3. **Variants**: Include stories for all core variants (e.g. Default, Loading, Disabled, Error).
