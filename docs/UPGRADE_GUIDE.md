# Version Upgrade Guide

This guide provides practical instructions for developers upgrading their local development environments and deployments between versions of the Nebula Nomad frontend.

---

## Version Compatibility Matrix

| Nebula Frontend Version | Node.js Runtime | React Version | Stellar SDK Version | Freighter API | Three.js   |
| ----------------------- | --------------- | ------------- | ------------------- | ------------- | ---------- |
| **v1.0.0** (Current)    | `>= 20.12.0`    | `19.x`        | `^13.0.0`           | `^6.0.0`      | `^0.170.0` |
| **v0.9.x**              | `>= 18.18.0`    | `18.3.x`      | `^12.0.0`           | `^5.0.0`      | `^0.160.0` |
| **v0.8.x**              | `>= 18.0.0`     | `18.2.x`      | `^11.0.0`           | `^4.0.0`      | `^0.150.0` |

---

## Step-by-Step Upgrade Procedure

### Step 1: Verify Prerequisites

Ensure your local environment uses a supported Node.js version:

```bash
node -v # Should return >= v20.12.0
npm -v  # Should return >= v10.0.0
```

If needed, switch with nvm:

```bash
nvm install 20
nvm use 20
```

### Step 2: Clean Existing Dependencies

Remove old build artifacts and caches:

```bash
rm -rf node_modules dist .vite
npm cache clean --force
```

### Step 3: Install Updated Dependencies

Install exact dependencies as pinned in `package-lock.json`:

```bash
npm ci
```

### Step 4: Environment Variable Verification

Compare your `.env` against `.env.example`:

```bash
cp -n .env.example .env
```

Ensure the following required keys are configured:

```env
VITE_STELLAR_NETWORK=TESTNET
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
VITE_CONTRACT_ID=CA...
```

### Step 5: Run Verification Suite

Verify the upgrade locally before committing:

```bash
npm run typecheck # Validate TypeScript types
npm run lint      # Check ESLint rules
npm test          # Run Vitest test suite
npm run build     # Verify production build
```

---

## Troubleshooting Common Issues

### Issue 1: `React is not defined` or JSX Transform Errors

**Cause**: Legacy components relying on implicit React import in scope.  
**Resolution**: Ensure `tsconfig.app.json` has `"jsx": "react-jsx"`.

### Issue 2: Freighter `window.freighter is undefined`

**Cause**: Browser extension sandbox isolation.  
**Resolution**: Import from `@stellar/freighter-api` directly:

```typescript
import { isConnected } from '@stellar/freighter-api'
```

### Issue 3: WebGL Context Creation Failure

**Cause**: Browser does not support WebGL2 or hardware acceleration is disabled.  
**Resolution**: The application falls back gracefully to the 2D vessel summary view while displaying a non-blocking performance notification.

---

## Rollback Plan

If an upgrade encounters unexpected production regressions:

1. Revert to the prior Git release tag: `git checkout v0.9.4`
2. Reinstall dependencies: `npm ci`
3. Re-run `npm run build` and redeploy.
