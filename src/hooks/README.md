# Custom Hooks

All custom React hooks live here. Follow the naming convention `use<PascalCase>`.

## Available Hooks

### `useLocalStorage<T>(key, initial)`

Persist state to `localStorage` with the same API as `useState`.

```tsx
import { useLocalStorage } from '@hooks'

const [theme, setTheme] = useLocalStorage('theme', 'dark')
```

### `useDebounce<T>(value, delay?)`

Debounce a value — only updates after `delay` ms of inactivity (default 300 ms).

```tsx
import { useDebounce } from '@hooks'

const debouncedSearch = useDebounce(searchTerm, 400)
```

### `useFreighterWallet()`

Connect / disconnect the Freighter browser-extension wallet and sign transactions.

```tsx
import { useFreighterWallet } from '@hooks'

function WalletButton() {
  const { walletState, isLoading, error, connect, disconnect } = useFreighterWallet()

  return walletState.isConnected ? (
    <button onClick={disconnect}>Disconnect {walletState.publicKey?.slice(0, 8)}…</button>
  ) : (
    <button onClick={connect} disabled={isLoading}>
      {isLoading ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
}
```

## Conventions

- File name matches hook name: `useDebounce.ts` → `useDebounce`
- One hook per file
- Export from `index.ts` barrel
- Full TypeScript types — no `any`
