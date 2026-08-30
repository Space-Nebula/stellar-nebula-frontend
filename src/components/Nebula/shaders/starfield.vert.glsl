precision highp float;

attribute float aSize;
attribute float aPhase;
attribute float aTwinkleSpeed;
attribute float aOpacity;
attribute float aParallax;
attribute vec3 aColor;

uniform float uTime;
uniform float uParallaxStrength;
uniform vec3 uCameraPosition;

varying vec3 vColor;
varying float vTwinkle;
varying float vOpacity;

void main() {
  vec3 parallaxOffset = uCameraPosition * aParallax * uParallaxStrength;
  vec3 transformedPosition = position + parallaxOffset;
  vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);

  float twinkle = 0.72 + (sin(uTime * aTwinkleSpeed + aPhase) * 0.28);
  float perspectiveScale = 180.0 / max(0.5, -mvPosition.z);

  vColor = aColor;
  vTwinkle = twinkle;
  vOpacity = aOpacity;
  gl_PointSize = clamp(aSize * perspectiveScale, 0.5, 3.2);
  gl_Position = projectionMatrix * mvPosition;
}
