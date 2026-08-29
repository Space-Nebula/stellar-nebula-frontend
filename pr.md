Closes #155, #233, #232, #230

### Summary of Changes

- **#155**: Created ADR template and 10 Architecture Decision Records in `docs/adr/`.
- **#233**: Extended `sessionStore` with session start time, active duration tracking, action logging, sync status, and analytics integration.
- **#232**: Integrated Zustand DevTools middleware across state stores for state change logging and time-travel debugging in dev mode.
- **#230**: Implemented operation locking, queuing, conflict detection, and pending state management in `gameStore` to prevent race conditions in concurrent updates.
- Updated `.gitignore` with `mimo` ignore patterns (`.mimo`, `mimo`, `*.mimo`, `.mimo/*`, `mimo/*`).
