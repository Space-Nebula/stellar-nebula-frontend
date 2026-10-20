# TypeScript Guidelines

This project runs TypeScript in `strict` mode (`tsconfig.app.json`), with `noUnusedLocals` and `noUnusedParameters` enabled. These notes cover the rules that keep types useful.

## No explicit `any`

ESLint reports `@typescript-eslint/no-explicit-any` as an error (`eslint.config.js`). Use these instead:

- `unknown` for values whose shape you have not checked yet. Narrow it with a type guard before use.
- A specific type or a generic parameter when the shape is known.
- A small structural type when only a few fields are read, for example `{ next?: string | null }`.

```ts
// Narrow an unknown value before reading its fields
function hasUpdatedAt(value: unknown): value is { updatedAt: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { updatedAt?: unknown }).updatedAt === 'number'
  )
}
```

## Declaration files for untyped globals

Some scripts are loaded from a CDN and attach themselves to `window`, so no package provides their types. Declare them in `src/types/declarations.d.ts`:

```ts
interface Window {
  LogRocket?: LogRocketClient
}
```

Keep that file free of `import` and `export` statements. Without them it is a global script, and its `interface Window` merges into the browser's own `Window`.

For a npm package that ships no types, prefer its `@types/*` package when one exists. Add a `declare module 'name'` block to `src/types/` only when no types exist. Adding a dependency or `@types` package also changes `package-lock.json`, so update both in the same commit.

## Unused code

Unused imports and locals are errors, so delete them. A parameter that a callback signature requires can stay, named with a leading `_`, which the lint config allows (see `eslint.config.js`).
