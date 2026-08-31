precision highp float;

varying vec3 vColor;
varying float vTwinkle;
varying float vOpacity;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  float core = smoothstep(0.24, 0.0, dist);
  float halo = smoothstep(0.5, 0.12, dist);
  float alpha = (core * 0.9 + halo * 0.35) * vOpacity * 0.8;

  if (alpha <= 0.001) {
    discard;
  }

  vec3 color = vColor * (0.7 + vTwinkle * 0.3);
  gl_FragColor = vec4(color, alpha);
}
