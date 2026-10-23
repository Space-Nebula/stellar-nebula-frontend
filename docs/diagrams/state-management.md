# State Management

All nine Zustand stores and five React contexts in `src/store/` and
`src/contexts/`, grouped by the kind of state they hold.

```mermaid
graph LR
    subgraph "Persisted Zustand Stores (localStorage)"
        gameStore[gameStore<br/>phase, cooldowns, locks]
        shipStore[shipStore<br/>ships, active ship]
        resourceStore[resourceStore<br/>inventory, harvest log]
        settingsStore[settingsStore<br/>graphics, sound, network]
        userStore[userStore<br/>session, auth]
        tutorialStore[tutorialStore<br/>progress]
        sessionStore[sessionStore<br/>session window, actions]
        graphicsStore[graphicsStore<br/>bloom, zoom, starfield]
        achievementStore[achievementStore<br/>stats, unlocks]
    end

    subgraph "Ephemeral Store (not persisted)"
        renderStatsStore[renderStatsStore<br/>draw calls, triangles]
    end

    subgraph "React Contexts"
        WalletContext
        ThemeContext
        NotificationContext
        ModalContext
        NetworkContext
    end

    subgraph "Consumers"
        NebulaCanvas
        ShipDashboard
        Marketplace
        SettingsPanel
        TutorialOverlay
        AchievementToasts
    end

    NebulaCanvas --> gameStore
    NebulaCanvas --> renderStatsStore
    NebulaCanvas --> graphicsStore
    ShipDashboard --> shipStore
    ShipDashboard --> resourceStore
    Marketplace --> resourceStore
    SettingsPanel --> settingsStore
    TutorialOverlay --> tutorialStore
    AchievementToasts --> achievementStore

    WalletContext --> userStore
    WalletContext --> sessionStore
    NebulaCanvas --> WalletContext
    ShipDashboard --> WalletContext
    Marketplace --> NetworkContext
```

The full field-by-field breakdown of every store and context — including which
fields persist, their schema versions, and which components read them — is in
[`docs/STATE_MANAGEMENT.md`](../STATE_MANAGEMENT.md).
