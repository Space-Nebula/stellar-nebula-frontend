precision highp float;

attribute float size;
attribute float opacity;
attribute vec3 color;

varying vec3 vColor;
varying float vOpacity;

uniform float uTime;
uniform bool uIsMobile; // Flag for mobile GPU simplification

void main() {
  vColor = color;
  vOpacity = opacity;

  vec3 pos = position;

  // On mobile GPUs (e.g. Adreno 618, Mali-G52), bypass expensive trigonometry
  // and turbulence calculations to maintain >= 30 FPS.
  if (!uIsMobile) {
    float wave = sin(uTime * 0.3 + position.x * 0.05) * 0.5;
    pos.y += wave;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  if (uIsMobile) {
    // Simplified point size calculation for mobile GPUs
    gl_PointSize = size * (120.0 / -mvPosition.z);
  } else {
    gl_PointSize = size * (200.0 / -mvPosition.z);
  }

  gl_Position = projectionMatrix * mvPosition;
}
