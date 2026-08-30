precision highp float;

attribute float aSize;
attribute vec3 aColor;
attribute float aOpacity;

uniform float uTime;
uniform float uRotationSpeed;

varying vec3 vColor;
varying float vOpacity;
varying float vDistToCenter;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float perspectiveScale = 180.0 / max(1.0, -mvPosition.z);

  vColor = aColor;
  vOpacity = aOpacity;
  vDistToCenter = length(position) / 85.0;

  gl_PointSize = clamp(aSize * perspectiveScale, 0.8, 14.0);
  gl_Position = projectionMatrix * mvPosition;
}
