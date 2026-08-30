precision highp float;

attribute float size;
attribute float opacity;
attribute vec3 color;

varying vec3 vColor;
varying float vOpacity;
uniform float uTime;

void main() {
  vColor = color;
  vOpacity = opacity;

  vec3 pos = position;
  float wave = sin(uTime * 0.3 + position.x * 0.05) * 0.5;
  pos.y += wave;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = size * (200.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
