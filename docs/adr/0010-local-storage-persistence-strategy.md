# 10. LocalStorage and State Persistence Strategy

- Status: Accepted
- Deciders: Architecture & Frontend Team
- Date: 2026-08-29

## Context and Problem Statement

Safely storing wallet session tokens, user graphics preferences, and optimistic game transaction state across browser sessions.

## Decision Outcome

Chosen option: Zustand `persist` middleware with versioned schemas, storage key namespacing (`stellar-nebula:*`), and explicit session cleanup mechanisms.
