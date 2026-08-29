#155 Missing Architecture Decision Records (ADRs)
Repo Avatar
Space-Nebula/stellar-nebula-frontend
Description:

No documentation of key architectural decisions like why Zustand over Redux, Three.js implementation approach, or Stellar network choice rationale.

File Change: Create docs/adr/ directory with template-based ADR files

Acceptance Criteria: Document at least 10 major architectural decisions with context and rationale

Importance: Team knowledge sharing and onboarding

Branch: docs/architecture-decisions

PR Title: "Docs: Add Architecture Decision Records"

Additional Note: Fix all cli tests and checks before you push and use ADR template format

4 matches
#233 Session Store Not Used
Repo Avatar
Space-Nebula/stellar-nebula-frontend
Description: sessionStore exists but no actual session tracking or temporary state management.

File Change: Implement session tracking

Acceptance Criteria: Track session start, duration, actions, sync status, clear on disconnect

Importance: Analytics and debugging

Branch: feat/session-tracking

PR Title: "Feat: Implement session state tracking"

Additional Note: Fix all cli tests and checks before you push and integrate with analytics#232 No State Debugging Tools
Repo Avatar
Space-Nebula/stellar-nebula-frontend
Description:

No Redux DevTools or logging for state changes during development.

File Change: Add Zustand DevTools middleware

Acceptance Criteria: Integrate Zustand DevTools, log state changes in dev mode, time-travel debugging

Importance: Developer experience

Branch: feat/state-devtools

PR Title: "Feat: Add Zustand DevTools for debugging"

Additional Note: Fix all cli tests and checks before you push and disable in production

#230 Race Conditions in Concurrent Updates
Repo Avatar
Space-Nebula/stellar-nebula-frontend
Description:

Multiple scan operations or transactions could cause race conditions in state updates.

File Change: Add operation locking mechanism

Acceptance Criteria: Prevent concurrent operations of same type, queue operations, show pending state, handle conflicts

Importance: Data consistency

Branch: fix/race-conditions

PR Title: "Fix: Prevent race conditions in state updates"

Additional Note: Fix all cli tests and checks before you push and test concurrent scenarios
