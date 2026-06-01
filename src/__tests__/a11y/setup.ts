import { configureAxe } from 'jest-axe'

export const axe = configureAxe({
  rules: {
    // Relax color-contrast in test env since CSS variables aren't resolved
    'color-contrast': { enabled: false },
  },
})
