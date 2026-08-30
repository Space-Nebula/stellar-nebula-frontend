# 2. Three.js Implementation Approach for Interactive 3D Visualizations

- Status: Accepted
- Deciders: Graphics & Frontend Team
- Date: 2026-08-29

## Context and Problem Statement

The application features interactive 3D celestial rendering including nebulae, stars, and space anomalies. We needed to choose between raw WebGL, standard Three.js imperatively, or React Three Fiber (@react-three/fiber).

## Decision Drivers

- Declarative integration with React state
- Shader customizability for particle effects and volumetric nebulae
- Performance optimization (instanced meshes, custom render loops)

## Considered Options

- Raw WebGL / GLSL shaders
- Imperative Three.js wrapped in React refs
- React Three Fiber (@react-three/fiber) + Drei

## Decision Outcome

Chosen option: "React Three Fiber", because it allows writing declarative Three.js scenes using React components while retaining 100% of Three.js performance and ecosystem access.

### Positive Consequences

- Clean, modular 3D scene component architecture
- Reusable visual helpers from `@react-three/drei`
- Easy state binding between React hooks and 3D canvas object instances
