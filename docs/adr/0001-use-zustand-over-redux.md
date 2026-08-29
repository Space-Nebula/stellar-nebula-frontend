# 1. Use Zustand over Redux Toolkit for Application State Management

- Status: Accepted
- Deciders: Frontend Engineering Team
- Date: 2026-08-29

## Context and Problem Statement

Stellar Nebula Frontend requires responsive, lightweight, and modular state management across multiple sub-domains (ships, resources, user sessions, game state, settings). We evaluated whether to adopt Redux Toolkit or Zustand for global application state.

## Decision Drivers

- Minimal boilerplate and bundle size overhead
- Unopinionated API with modular slice capabilities
- Seamless middleware integration (persistence, devtools)
- Performant selector-based re-renders for 3D canvas updates

## Considered Options

- Redux Toolkit
- Zustand
- React Context API alone

## Decision Outcome

Chosen option: "Zustand", because it provides a lightweight (~1KB) functional API without action creators or reducer boilerplate, while enabling high-frequency selective re-renders essential for WebGL performance.

### Positive Consequences

- Drastically simplified store creation and maintenance
- Direct store access outside React component tree (useful for WebGL animation loops)
- Easy implementation of custom persistence and devtools middleware

### Negative Consequences

- Less rigid enforcement of global architecture rules compared to Redux Toolkit conventions
