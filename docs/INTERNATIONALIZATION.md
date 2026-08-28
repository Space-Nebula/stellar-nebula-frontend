# Internationalization (i18n)

Stellar Nebula targets a global audience for a blockchain game, so all user-facing
strings must be externalized and translatable.

## Framework Selection

- **Recommended: `react-i18next`** paired with `i18next`. It is the de-facto
  standard for React, supports TypeScript, lazy-loading of namespaces, pluralization,
  and RTL meta tags.
- Alternative candidates evaluated: `react-intl` (FormatJS) and `rosetta`. We prefer
  `react-i18next` because of its smaller runtime overhead, broad ecosystem, and
  built-in language detection.

Selection checklist:

- Type-safe translation keys (typed `keyof` resource shapes).
- Support for lazy loading locale files (code splitting).
- SSR-compatible (in case we add server rendering for SEO later).
- Active maintenance and a permissive license.

## Locale Structure

Store translation files under `src/locales/`:

```
src/locales/
  en/
    common.json     # shared nav, buttons, toasts
    home.json       # home page strings
    nebula.json     # nebula view strings
    dashboard.json
    marketplace.json
  es/
    common.json
    ...
```

Each language directory must mirror the same namespace/file structure so keys stay
in sync across locales.

## Defaults & Supported Locales

- Default locale: `en` (base language of record).
- Fallback locale: `en` — any missing key in a non-default locale falls back to
  English, never to a broken empty string.
- Supported locales are defined in a single source of truth
  (e.g. `src/config/i18n.ts`) exporting the locale code, label, `dir` (ltr/rtl),
  and a `moment/dayjs`-style formatting identifier if used.

## Translation Workflow

1. Wrap every user-facing string in `t('namespace:key')`.
   - Never hardcode strings in JSX, `aria-*` labels, `toast` messages, or tests.
2. Extract keys into the relevant namespaced JSON file for `en`.
3. Update the non-English locale files (or mark keys `pending` for translation).
4. Validate with the extraction/CI check:
   - `npm run i18n:extract` — scans source and updates keys.
   - `npm run i18n:check` — fails CI when non-default locales are missing keys
     that exist in `en`.
5. Manual QA pass in every changed locale before merge.

### Key Naming Conventions

- Use `camelCase`, namespaced by feature: `home.heroTitle`, `nebula.scanButton`.
- Reuse common keys instead of duplicating (`common.cancel`, `common.connectWallet`).

## Plurals & Interpolation

- Use i18next plural suffixes (`_one`, `_other`) for countable strings.
- Use `{{variable}}` interpolation for dynamic values; never concatenate
  translated strings ("You have <span>X</span> items" is a bug — translate the
  full sentence).

## RTL (Right-to-Left) Support

- Set `document.documentElement.dir` to `rtl` when the active locale requires it,
  and reset to `ltr` otherwise.
- Update the document `lang` attribute whenever the locale changes.
- Prefer logical CSS properties (`margin-inline-start`, `padding-inline-end`,
  `inset-inline`…) over physical left/right so layouts mirror automatically.
- Verify RTL in every locale that uses it:
  - Text alignment, icon direction, and arrow glyphs.
  - Carousels/sliders move opposite direction.
  - Number/date formatting stays LTR as expected.
- The `Canvas` 3D scene does not need mirroring; only DOM overlays do.

## Locale Management

- Persist the user's selected locale in `localStorage` (e.g.
  `stellar-nebula:locale`) and initialize before first render to avoid flash of
  wrong language.
- Provide a language switcher in the UI (Settings panel) that writes the
  preference and reloads resources synchronously (or shows a loading state).
- Detect the initial locale from, in order: persisted preference → browser
  `navigator.language` (if in supported list) → default `en`.
- Sync the locale with analytics/monitoring events so funnels can be segmented
  by language.

## Accessibility in Translations

- Ensure translated `aria-*` labels are provided via `t()`; never leave
  `aria-label` empty.
- Keep translated strings flexible enough to accommodate longer German/Russian
  text — avoid fixed-height containers that clip text in `direction: rtl` or
  text-heavy locales.

## Testing

- Unit-test locale resources: every non-default locale file must contain at
  least all keys present in `en`.
- Component tests use `en` by default and configure `i18next` once in the test
  setup file.
- Manually smoke-test locale switching, RTL rendering, and pluralization before
  each release.