# Performance Optimization Guide

This document outlines the performance architectural patterns, rendering lifecycle optimizations, and battery conservation strategies implemented in the Stellar Nebula frontend.

## 1. Animation Frame Loop Optimization (#380)

### Background & Problem

Web applications utilizing 3D graphics (Three.js / React Three Fiber) and continuous physics calculations frequently consume CPU and GPU cycles on every display refresh tick via `requestAnimationFrame`. When a user navigates to another browser tab or minimizes the browser window, standard animation frame loops can continue firing or accumulate unthrottled cycles, resulting in:

- High idle CPU usage (typically 15% - 40% on modern multi-core devices).
- Severe battery drain on mobile devices and laptops.
- Thermal throttling and device overheating.
- Frame-rate stuttering when returning to the tab due to accumulated deltas.

### Page Visibility API Integration

The Page Visibility API (`document.visibilityState` and the `visibilitychange` event) is now integrated across all animation and rendering components:

- **`usePageVisibility` Hook** (`src/hooks/useAnimationFrame.ts`):
  Tracks tab active state reactively and unsubscribes cleanly upon unmount.
- **`useAnimationFrame` Hook** (`src/hooks/useAnimationFrame.ts`):
  Guards the frame callback against inactive tabs, automatically canceling scheduled `requestAnimationFrame` ticks when `document.hidden` is true, and safely resetting delta timestamps upon reactivation to prevent jump artifacts.
- **`NebulaCanvas` Component** (`src/components/Canvas/NebulaCanvas.tsx`):
  Toggles `@react-three/fiber`'s `frameloop` prop dynamically:
  - `frameloop="always"` when visible.
  - `frameloop="never"` when hidden.
    Setting `frameloop="never"` suspends the internal WebGL rendering pipeline, completely halting shader execution and scene evaluations.
- **`useFrameRateMonitor` Hook** (`src/hooks/useFrameRateMonitor.ts`):
  Suspends frame rate tracking during inactive periods, preventing skewed FPS metrics and saving background cycles.

### Results & Acceptance Criteria

- **Idle Inactivity**: CPU utilization falls to ~0% when the tab is hidden.
- **Seamless Resumption**: Canvas and animations resume smoothly without jump-cuts upon tab reactivation.
- **Battery Optimization**: Significantly reduces power draw on mobile browsers and portable devices.

### Utility Functions (`src/utils/performance.ts`)

- `isTabVisible()`: Synchronous check for document visibility.
- `onVisibilityChange(onVisible, onHidden)`: Helper to subscribe to visibility transitions.
- `getRecommendedFrameloop(isVisible, mode)`: Returns the appropriate R3F frameloop state (`'always' | 'demand' | 'never'`).
- `getBatteryStatus()`: Reads battery charging state and level if supported by the browser.

## 2. Mobile FPS Optimization (#351)

### Background & Problem

Complex particle fields, custom vertex/fragment shaders, high device pixel ratios, and post-processing effects (such as Bloom and Depth of Field) previously led to frame drops below 30 FPS on mobile and low-end devices, causing perceptible input latency and jittery animations.

### Optimization Strategies

1. **Adaptive Particle Count Calculation (`src/utils/three-performance.ts`)**:
   - Dynamic particle calculation scales particle density based on device capabilities (`calculateAdaptiveParticleCount`).
   - Mobile and low-power tiers automatically reduce baseline particle count from 12,000–15,000 down to 3,000–4,000 particles, preserving visual depth while drastically cutting vertex transformation overhead.
2. **Quality Presets for Low-End Devices**:
   - `low`, `medium`, and `high` graphic presets via `getQualityPreset`.
   - On low/mobile presets, antialiasing is disabled or restricted to mediump shader precision, and expensive post-processing passes (DoF and Bloom) are bypassed.
   - Dynamic DPR clamping restricts device pixel ratio to `1.0–1.5` on mobile screens instead of rendering at native 3x retina resolutions.
3. **Settings Store Integration (`src/store/settingsStore.ts`)**:
   - Added user-facing graphics settings: `graphicsQuality`, `adaptivePerformance`, `targetFps` (45 FPS mobile / 60 FPS desktop), `particleCountMultiplier`, and `lowPowerMode`.
4. **Runtime Performance & FPS Monitoring**:
   - Real-time rolling FPS monitoring (`createPerformanceMonitor`) and UI counters (`showFps` / `fpsMonitoringEnabled`) detect sustained frame drops and degrade non-essential visual fidelity automatically to maintain >45 FPS.

## 3. Three.js Scene Memory Cleanup (#352)

### Background & Problem

Three.js objects, geometries, textures, and WebGL contexts do not automatically garbage-collect when React components unmount. Unreleased GPU memory buffers caused linear memory growth over extended navigation sessions and eventual WebGL context exhaustion crashes.

### Cleanup Implementation

1. **Comprehensive Disposal Utilities (`src/utils/three-cleanup.ts`)**:
   - `disposeGeometry`: Safely frees buffer geometry and vertex attribute arrays.
   - `disposeMaterial`: Releases shader programs, textures in standard slots (`map`, `normalMap`, `roughnessMap`, etc.), and textures referenced in custom uniforms.
   - `disposeTexture`: Invalidates and frees texture buffers from GPU memory.
   - `disposeHierarchy`: Recursively traverses an `Object3D` hierarchy to dispose all descendant meshes, materials, and geometries, and disconnects all children.
   - `disposeWebGLRenderer`: Clears render lists, triggers `gl.forceContextLoss()`, and frees canvas handles.
   - `cleanScene`: Complete one-stop scene purge for component unmount handlers.
2. **Component Lifecycle Disposals**:
   - `NebulaCanvas.tsx`: Upgraded `CanvasResourceCleanup` hook to invoke `cleanScene(scene, gl)` when unmounting.
   - `ProceduralNebulaField.tsx`: Added `useEffect` cleanup hook to dispose `bufferGeometry` and `shaderMaterial` upon unmount or recreation.
   - `useThreeScene.ts`: Reusable hook with built-in automatic resource tracking and teardown.
3. **Automated Memory Leak Testing (`test/performance/memory.test.ts`)**:
   - Automated unit tests verify all geometries, multi-material arrays, textures, object hierarchies, renderers, and hooks release resources without leaks.

## 4. Benchmark Results (#505)

Latest measurement (2026-11-21, commit `1ef8f53`). Details, history and how to rerun are in [BENCHMARKS.md](BENCHMARKS.md).

| Measure                      |     Result | Change since 2026-10-18 baseline |
| ---------------------------- | ---------: | -------------------------------: |
| Total JS (gzip)              | 1,101.9 KB |                            +5.6% |
| Total JS (brotli)            |   921.6 KB |                            +5.8% |
| CSS (gzip)                   |     8.9 KB |                            +0.8% |
| `feature-three` chunk (gzip) |   277.3 KB |                            +8.5% |

Every push to `main` records bundle sizes and Lighthouse results through `.github/workflows/benchmark.yml`. The history is kept in `dev/bench/data.js` on the `gh-pages` branch.

## 5. Mobile Nebula Rendering Optimization (#548)

### Problem & Mid-Range Mobile Bottlenecks

On mid-range mobile hardware (e.g., Pixel 4a, Samsung Galaxy A52 equipped with Qualcomm Snapdragon 720G/732G and Adreno 618 GPUs), the Three.js nebula rendering previously dropped from 60 FPS to 15–20 FPS. Root causes included:
- **Excessive Particle Volume:** Over ~10,000 individual particle points executing complex vertex animation shaders.
- **Expensive Shaders:** Full wave trigonometry and turbulence passes computed per-particle on mobile GPUs lacking desktop ALU throughput.
- **Draw Call Overhead:** Lack of batching causing excessive state changes.

### Solutions Implemented

1. **Particle Budget Reduction**:
   - `Low` quality mode caps particle count at **≤ 3,000 particles** (down from 10,000), drastically slashing vertex processing overhead.
   - `Medium` mode runs **6,000 particles** for modern mobile/tablet GPUs.
   - `High` mode maintains **10,000 particles** for desktop hardware.

2. **Hardware Tier Detection (`src/hooks/useDevicePerformance.ts`)**:
   - Queries `navigator.hardwareConcurrency` (≤4 cores classified as `low`, 6 cores as `medium`, ≥8 cores as `high`).
   - Inspects `WEBGL_debug_renderer_info` to identify budget mobile GPUs (e.g., Adreno 618, Adreno 610, Mali-G52/G57).
   - Reads `navigator.deviceMemory` (≤4 GB triggers low power tier).
   - Sets adaptive defaults automatically while allowing user override.

3. **`InstancedMesh` Batching (`src/components/NebulaParticles.tsx`)**:
   - Replaced individual particle meshes with `THREE.InstancedMesh`.
   - Collapses particle field rendering into a single batched draw call, achieving a **>90% reduction in WebGL draw calls**.

4. **Camera Distance Level-of-Detail (LOD)**:
   - Evaluates distance from camera to nebula center each frame.
   - Dynamically scales down active instance count (`mesh.count`) by 25% at medium distance and 50% at far distances (>70 units).

5. **Shader Simplification (`src/shaders/nebula.vert.glsl`)**:
   - On mobile GPUs, expensive wave sine functions and dynamic distortion are bypassed, utilizing linear projections with minimal register pressure.

6. **Real-Time FPS Auto-Throttling (`src/utils/performance-monitor.ts`)**:
   - Monitors average FPS across a 3-second sliding window.
   - If sustained frame rate drops below **30 FPS**, automatically down-throttles graphics quality (High → Medium → Low) to preserve interactive responsiveness.
   - UI provides manual override toggles (Low, Medium, High).

