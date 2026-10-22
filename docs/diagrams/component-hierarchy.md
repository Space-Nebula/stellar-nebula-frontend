# Component Hierarchy

React component tree from the root `App.tsx` down through routing, layout, and
the three main feature areas: the nebula canvas, the ship dashboard, and the
marketplace.

```mermaid
graph TD
    App[App.tsx<br/>Root Component] --> Providers[Context Providers]
    App --> Router[React Router]

    Providers --> ThemeProvider
    Providers --> WalletProvider
    Providers --> NotificationProvider

    Router --> AppLayout

    AppLayout --> Navigation
    AppLayout --> Pages
    AppLayout --> Footer
    AppLayout --> NotificationBootstrap

    Pages --> Home
    Pages --> NebulaView
    Pages --> ShipDashboard
    Pages --> Marketplace

    NebulaView --> NebulaCanvas
    NebulaView --> ScanControls

    NebulaCanvas --> NebulaScene
    NebulaCanvas --> CameraControls
    NebulaCanvas --> FpsCounter

    NebulaScene --> ParticleSystem
    NebulaScene --> ShipModel
    NebulaScene --> Starfield
    NebulaScene --> InteractiveScanPoint

    ShipDashboard --> ShipStats
    ShipDashboard --> Inventory
    ShipDashboard --> UpgradeModal
    ShipDashboard --> TransactionHistory

    Marketplace --> DEXInterface
    Marketplace --> OrderBook
    Marketplace --> TradeForm
    Marketplace --> TradeHistory
```

Note `Providers` here covers the three contexts shown; the app also wraps pages
in `ModalProvider` and `NetworkProvider` for the global modal stack and
multi-network switching. See
[`docs/STATE_MANAGEMENT.md`](../STATE_MANAGEMENT.md#react-contexts-srccontexts) for the
full context list, and
[`docs/ARCHITECTURE.md#component-relationships`](../ARCHITECTURE.md#component-relationships)
for what each layer is responsible for.
