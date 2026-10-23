# Architecture Diagrams

Standalone diagram files for the Stellar Nebula frontend, pulled out of
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) so each one can be viewed, linked to,
and updated on its own. Every diagram is a [Mermaid](https://mermaid.js.org/) code
block inside a plain `.md` file — GitHub renders these automatically in the file
view, no build step required. While editing, paste the block into
[the Mermaid Live Editor](https://mermaid.live) to preview and validate syntax
before committing.

| Diagram                                            | Description                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`system-overview.md`](system-overview.md)         | High-level system structure: user/wallet, the React SPA, the service layer, and the external Stellar/Soroban/Sentry/backend services it talks to.                        |
| [`component-hierarchy.md`](component-hierarchy.md) | React component tree from `App.tsx` down through routes, layout, pages, and the nebula canvas / ship dashboard / marketplace subtrees.                                   |
| [`state-management.md`](state-management.md)       | Every Zustand store and React context, grouped by what consumes them. See [`docs/STATE_MANAGEMENT.md`](../STATE_MANAGEMENT.md) for the full write-up.                    |
| [`data-flow.md`](data-flow.md)                     | Sequence diagram for the nebula-scan contract call, from button click to on-chain confirmation and UI update. See [`docs/DATA_FLOW.md`](../DATA_FLOW.md) for more flows. |

For component relationships, technology choices, deployment topology, and coding
patterns and conventions, see the main [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md).
