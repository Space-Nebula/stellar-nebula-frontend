precision highp float;

attribute float size;
attribute float opacity;
attribute vec3 color;

varying vec3 vColor;
varying float vOpacity;
uniform float uTime;
uniform bool uIsMobile;

void main() {
  vColor = color;
  vOpacity = opacity;

  vec3 pos = position;

  // On mobile GPUs, bypass expensive wave calculations to save frame budget
  if (!uIsMobile) {
    float wave = sin(uTime * 0.3 + position.x * 0.05) * 0.5;
    pos.y += wave;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  if (uIsMobile) {
    gl_PointSize = size * (120.0 / -mvPosition.z);
  } else {
    gl_PointSize = size * (200.0 / -mvPosition.z);
  }

  gl_Position = projectionMatrix * mvPosition;
}
