# System Overview

High-level structure of the Stellar Nebula frontend: the user's browser and wallet,
the React single-page application, the service layer that talks to the outside
world, and the external services it depends on (Stellar network, Soroban smart
contracts, Sentry, and an optional backend API).

```mermaid
graph TB
    subgraph "User Layer"
        User[User Browser]
        Wallet[Stellar Wallet<br/>Freighter/Albedo]
    end

    subgraph "Frontend Application"
        App[React SPA]
        Router[React Router]
        UI[UI Components]
        Canvas[Three.js Canvas]
        State[Zustand Stores]
        Contexts[React Contexts]
    end

    subgraph "Service Layer"
        WalletSvc[Wallet Service]
        ContractSvc[Contract Service]
        AssetSvc[Asset Service]
        Analytics[Analytics Service]
        Monitoring[Monitoring Service]
        API[API Client]
    end

    subgraph "External Services"
        Stellar[Stellar Network<br/>Horizon + Soroban RPC]
        Contracts[Smart Contracts<br/>Nebula + Token]
        Sentry[Sentry<br/>Error Tracking]
        Backend[Backend API<br/>Optional]
    end

    User --> App
    User --> Wallet
    App --> Router
    Router --> UI
    Router --> Canvas
    UI --> State
    UI --> Contexts
    Canvas --> State

    Contexts --> WalletSvc
    UI --> ContractSvc
    UI --> AssetSvc

    WalletSvc --> Wallet
    ContractSvc --> Stellar
    AssetSvc --> Stellar
    API --> Backend

    Analytics --> Backend
    Monitoring --> Sentry

    ContractSvc --> Contracts
    Contracts --> Stellar
```

See [`docs/ARCHITECTURE.md#system-overview`](../ARCHITECTURE.md#system-overview)
for the prose description of each layer, and
[`docs/ARCHITECTURE.md#technology-choices`](../ARCHITECTURE.md#technology-choices)
for why each technology was picked.
