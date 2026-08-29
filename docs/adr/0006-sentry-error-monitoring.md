# 6. Sentry Integration for Client-Side Error & Performance Tracking

- Status: Accepted
- Deciders: DevOps & Frontend Team
- Date: 2026-08-29

## Context and Problem Statement

Production web application requires real-time exception tracking and telemetry to diagnose wallet connection failures and WebGL context loss.

## Decision Outcome

Chosen option: `@sentry/react` with automated breadcrumbs for wallet actions, store mutations, and boundary fallbacks.
