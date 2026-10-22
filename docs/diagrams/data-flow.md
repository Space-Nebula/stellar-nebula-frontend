# Data Flow: Scanning a Nebula

Sequence diagram for the application's main on-chain action — scanning a nebula
zone for resources — from the user's click through wallet signing to the
on-chain confirmation and UI update.

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Component
    participant Hook as useNebulaScan
    participant Context as WalletContext
    participant Service as SorobanContractClient
    participant Wallet as Wallet Extension
    participant Stellar as Stellar Network
    participant Store as Zustand Store

    User->>UI: Click "Scan Nebula"
    UI->>Hook: scan(nebulaId, scannerPublicKey)
    Hook->>Service: buildScanTransaction()
    Hook->>Stellar: simulateContractTransaction(unsignedXdr)
    Stellar-->>Hook: Simulation result
    Hook->>Context: signTransaction(xdr)
    Context->>Wallet: Request signature
    Wallet-->>User: Show approval dialog
    User->>Wallet: Approve
    Wallet-->>Context: Signed XDR
    Context-->>Hook: Signed XDR
    Hook->>Service: submitScanTransaction(signedXdr)
    Service->>Stellar: sendTransaction() + pollTransaction()
    Stellar-->>Service: GetSuccessfulTransactionResponse
    Service-->>Hook: ScanNebulaResult
    Hook-->>UI: result, isLoading=false
    UI->>Store: resourceStore.harvestResource(...)
    Store-->>UI: Re-render with new inventory
    UI-->>User: Show success + rewards
```

Full step-by-step narration, error handling at each hop, and two more flows
(wallet connect, WebSocket live updates) live in
[`docs/DATA_FLOW.md`](../DATA_FLOW.md).
