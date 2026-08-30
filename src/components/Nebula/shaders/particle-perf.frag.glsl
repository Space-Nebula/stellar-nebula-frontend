precision highp float;

varying vec3 vColor;
varying float vOpacity;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv) * 2.0;
  float alpha = smoothstep(1.0, 0.0, dist) * vOpacity;

  if (alpha <= 0.005) {
    discard;
  }

  gl_FragColor = vec4(vColor, alpha);
}
