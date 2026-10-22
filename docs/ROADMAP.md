# Roadmap

Nebula Nomad is a community-driven, Stellar/Soroban-based frontend. This roadmap is intentionally modest and grounded in the current state of the code — it will be revised as priorities shift. For what's already shipped, see [docs/FEATURES.md](FEATURES.md); for recent technical changes, see [CHANGELOG.md](../CHANGELOG.md).

## Now

Stabilize and document the existing feature set:

- Keep documentation (architecture, API reference, contributing guide) in sync with the codebase as it grows — this roadmap, the [docs/API/](API/) reference, and [docs/ARCHITECTURE.md](ARCHITECTURE.md) are part of that effort.
- Maintain performance and accessibility budgets already enforced in CI (`npm run performance:test`, `npm run test:a11y`, Lighthouse CI).
- Expand end-to-end coverage in `e2e/` alongside new features.

## Next

- **Backend API integration**: `docs/ARCHITECTURE.md` notes an optional backend API data source for leaderboards/analytics — formalize this once the backend repo exposes stable endpoints.
- **Expanded marketplace functionality**: Build out order history, open-order management, and richer trade analytics on top of the existing `DEXInterface`/`OrderBook`/`TradeForm` components.
- **Broader social features**: The current `Social` surface is a single share action (`ShareButton`); consider friend lists, trading, or co-op exploration if there's demand.
- **License decision**: The repository does not yet declare an open-source license — this should be resolved before wider external contribution is encouraged.

## Later / Exploratory

- **AR / mobile-native expansion**: Previously discussed as a stretch goal for future funding rounds (e.g. Stellar community funding programs); no implementation work has started.
- **Additional wallet support**: Beyond the current Freighter/Albedo/Ledger set, evaluate demand for other Stellar-compatible wallets as they mature.
- **Community-authored modules**: Explore a plugin-style extension point for community-built mini-games or cosmetic modules once the core loop is stable.

---

Have an idea or a priority disagreement? Open an issue — see [CONTRIBUTING.md](../CONTRIBUTING.md) for how to propose changes.
