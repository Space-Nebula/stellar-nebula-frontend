# Code Style Guide

This documents the conventions actually enforced by this repo's tooling
(`eslint.config.js`, `.prettierrc`, `tsconfig.app.json`) plus the naming/structure conventions
already used across `src/`. When in doubt, match the surrounding code over this document — but
if you think the tooling should be stricter (or looser) about something, open an issue rather
than drifting from it silently.

## Formatting (Prettier)

Enforced by `.prettierrc` and checked in CI via `npm run format:check`:

- No semicolons (`semi: false`)
- Single quotes (`singleQuote: true`)
- 2-space indentation (`tabWidth: 2`)
- Trailing commas where valid in ES5 (`trailingComma: "es5"`)
- 100-character print width (`printWidth: 100`)
- Always parenthesize arrow function params (`arrowParens: "always"`)
- LF line endings (`endOfLine: "lf"`)

Run `npm run format` to apply these automatically, or `npm run format:check` to verify without
writing. The Husky `pre-commit` hook runs Prettier on staged files automatically via
`lint-staged`.

## Linting (ESLint)

Configured in `eslint.config.js`. Notable project-specific rules (beyond the standard
`react-hooks`/`jsx-a11y`/`typescript-eslint` recommended sets):

- **No `any`** — `@typescript-eslint/no-explicit-any` is an error. Use `unknown` and narrow it,
  or a proper generic.
- **Type-only imports** must use `import type` (`@typescript-eslint/consistent-type-imports`).
- **No deep relative imports** — `../../../` is banned (`no-restricted-imports`); use the `@/`
  path alias (or one of the scoped aliases below) instead.
- **No direct `console.log`/`console.info`** — `no-console` only allows `warn`/`error`.
  Application code logs through the shared `logger` (`src/services/logging.ts`).
- **`_`-prefixed names are intentionally unused** — applies to args, locals, and caught errors,
  so `catch (_err)` or an unused `_index` param won't trigger `no-unused-vars`.
- Accessibility: custom controls must have an accessible name
  (`jsx-a11y/control-has-associated-label`, which also covers the `IconButton` component), and
  the 3D canvas's `application`/`tabpanel` roles are allowed to be focusable
  (`jsx-a11y/no-noninteractive-tabindex`).

Run `npm run lint` to check, `npm run lint:fix` to auto-fix what's fixable.

## TypeScript

- `strict` mode is on, along with `noUnusedLocals`, `noUnusedParameters`, and
  `noFallthroughCasesInSwitch` (see `tsconfig.app.json`). Code must type-check clean under
  `npm run build` (`tsc -b`).
- Never widen contract/service return types to `any`/`unknown` without immediately narrowing —
  see [CONTRIBUTING.md § Type generation guidelines](../CONTRIBUTING.md#type-generation-guidelines)
  for the contract-layer-specific rules.

### Path aliases

Defined in both `tsconfig.app.json` and `vite.config.ts` — keep them in sync if you add one:

| Alias           | Resolves to                   |
| --------------- | ----------------------------- |
| `@/*`           | `src/*`                       |
| `@components/*` | `src/components/*`            |
| `@contexts/*`   | `src/contexts/*`              |
| `@hooks`        | `src/hooks/index.ts` (barrel) |
| `@hooks/*`      | `src/hooks/*`                 |
| `@utils/*`      | `src/utils/*`                 |
| `@store/*`      | `src/store/*`                 |
| `@types/*`      | `src/types/*`                 |
| `@constants/*`  | `src/constants/*`             |
| `@config/*`     | `src/config/*`                |
| `@services/*`   | `src/services/*`              |
| `@assets/*`     | `src/assets/*`                |

Prefer the most specific alias available (`@hooks/useDebounce` or the `@hooks` barrel import,
not `@/hooks/useDebounce`).

## Naming Conventions

- **Hooks**: `use<PascalCase>` (e.g. `useNebulaScan`, `useFreighterWallet`), one hook per file,
  colocated tests in a sibling `__tests__/` folder as `<hookName>.test.ts(x)`.
- **Components**: `PascalCase` file and export name, one primary component per file
  (`Button.tsx` exports `Button`). Folders under `src/components/` are named for the feature
  area (`Wallet/`, `Dashboard/`, `Ship/`, …), not the component type.
- **Services/utilities**: `camelCase` functions and filenames (e.g.
  `src/utils/stellar/responseParser.ts` exporting `parseContractResponseXdr`).
- **Types/interfaces**: `PascalCase`, with contract-layer params/results suffixed `Params` /
  `Result` (e.g. `ScanNebulaParams`, `ScanNebulaResult`).
- **Zustand stores**: `camelCase` file name ending in `Store` (e.g. `userStore.ts`), exporting a
  `use<Name>Store` hook.

## File & Folder Structure

- `src/components/<Feature>/` — UI grouped by feature area, not by component type.
- `src/hooks/` — general-purpose hooks; `src/hooks/contracts/` — hooks that wrap a specific
  on-chain contract interaction.
- `src/services/` — framework-agnostic logic (contracts, wallets, API client, analytics,
  logging); should be importable and testable without React.
- `src/store/` — Zustand stores for cross-component client state.
- `src/contexts/` — React Context providers for DI-style concerns (see
  [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) for when to use a store vs. a context).
- `src/utils/` — pure helper functions, grouped into subfolders by domain
  (`stellar/`, `threejs/`, `procedural/`, `performance/`).
- Tests live beside the code they cover, in a `__tests__/` subfolder.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`,
`chore:`, `refactor:`, `test:`, …) — the project's changelog entries are written against this
convention. There's no `commitlint` hook enforcing this mechanically today, so review your own
message before pushing.
