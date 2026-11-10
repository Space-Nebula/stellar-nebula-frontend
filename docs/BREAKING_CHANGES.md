# Breaking Changes Log

This log documents all breaking architectural, API, and dependency changes across versions of the Nebula Nomad frontend.

---

## Version 1.0.0 (Current Release)

### Core Framework & Build Tooling

- **Vite 6 / React 19 Migration**: Upgraded to React 19 and Vite 6. Legacy React 18 polyfills and manual memoization hacks have been replaced with React Compiler-friendly patterns.
- **Node.js 20+ Requirement**: Node 18 is officially end-of-life and unsupported. Minimum runtime is Node 20.12.0+.

### Wallet & Blockchain Interfaces

- **Freighter API Module Modernization**: Deprecated window-level Freighter globals. All wallet interactions must use `@stellar/freighter-api`.
- **Soroban RPC v21 Alignment**: Replaced legacy contract simulation methods with `@stellar/stellar-sdk` v13 `rpc.Server` interface. Direct Horizon endpoints are no longer queried for Soroban contract state.
- **Stellar Passphrase Enforcement**: `Networks.TESTNET` or `Networks.PUBLIC` passphrase must be supplied explicitly when constructing transactions; default fallbacks are disabled to prevent accidental cross-network execution.

### Graphics & Visual Performance

- **WebGL2 Context Exclusivity**: Legacy WebGL 1 fallback context creation is discontinued. Modern browser support for WebGL2 is mandatory.
- **Manual Asset Disposal**: Three.js textures, geometries, and mesh materials require explicit lifecycle cleanup on component unmount.

---

## Deprecation Schedule

| Feature / API                       | Status     | Deprecation Target | Replacement                        |
| ----------------------------------- | ---------- | ------------------ | ---------------------------------- |
| `window.freighter`                  | Deprecated | v1.1.0             | `@stellar/freighter-api`           |
| `useLegacyHorizonContract`          | Deprecated | v1.1.0             | `useSorobanContract`               |
| `VesselCanvasLegacy`                | Removed    | v1.0.0             | `NebulaCanvas` (WebGL2)            |
| `onSuccess`/`onError` in `useQuery` | Removed    | v1.0.0             | Global `QueryCache` or `useEffect` |

---

## Upgrade Actions Checklist

- [ ] Check Node version with `node -v` (must be >= 20.12.0).
- [ ] Run `npm install` to update to `@stellar/stellar-sdk` and `@stellar/freighter-api`.
- [ ] Replace any remaining `window.freighter` occurrences with modular `@stellar/freighter-api` hooks.
- [ ] Review custom components for React 19 `ref` forwarding updates.
- [ ] Verify GPU disposal lifecycles in 3D Three.js canvas components.
