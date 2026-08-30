precision highp float;

varying vec3 vColor;
varying float vOpacity;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);

  float core = smoothstep(0.5, 0.0, dist);
  float halo = smoothstep(0.5, 0.15, dist);
  float alpha = (core * 0.85 + halo * 0.3) * vOpacity;

  if (alpha <= 0.003) {
    discard;
  }

  gl_FragColor = vec4(vColor, alpha);
}
