// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dev-dist',
    'node_modules',
    'coverage',
    'storybook-static',
    'playwright-report',
    'test-results',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      eslintConfigPrettier,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // `_`-prefixed names are intentionally unused everywhere, not only arguments.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // `application` is the ARIA role for widgets that manage their own keyboard
      // input (the 3D canvas); like `tabpanel`, it must be focusable.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'application'], allowExpressionValues: true },
      ],
      // Enforce accessible names for buttons and interactive controls
      'jsx-a11y/control-has-associated-label': [
        'error',
        {
          labelAttributes: ['aria-label', 'aria-labelledby'],
          controlComponents: ['IconButton'],
          depth: 3,
        },
      ],
      // Explicit `any` defeats type checking. Use `unknown` and narrow instead.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      // Application code logs through `logger` (src/services/logging.ts). Direct console
      // calls are errors, except warn/error which the logger itself may emit.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'jsx-a11y/heading-has-content': 'error',
      // Enforce `@/` path aliases over deep relative imports (../../../…)
      // so refactors inside src/ don't break import paths across the codebase.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '\\.\\./\\.\\./\\.\\./',
              message:
                'Deep relative imports (../../../) are not allowed. Use the @/ path alias instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // The logger is the one place that wraps console, and tests may inspect it directly.
    files: [
      'src/services/logging.ts',
      '**/__tests__/**',
      '**/*.test.{ts,tsx}',
      'test/**',
      'e2e/**',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  ...storybook.configs['flat/recommended'],
])
