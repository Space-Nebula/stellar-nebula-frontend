# 5. React Three Fiber Post-Processing & Particle Shader Pipeline

- Status: Accepted
- Deciders: Graphics Team
- Date: 2026-08-29

## Context and Problem Statement

Rendering deep space environments requires bloom filters, noise fields, and high-density particle systems without frame drops.

## Decision Outcome

Chosen option: `@react-three/postprocessing` combined with instanced buffer geometries for procedural particle generation.
