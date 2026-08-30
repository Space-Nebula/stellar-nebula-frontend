precision highp float;

varying vec3 vColor;
varying float vOpacity;
varying float vDistToCenter;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv) * 2.0;

  float core = smoothstep(0.7, 0.0, dist);
  float halo = smoothstep(1.0, 0.3, dist);
  float alpha = (core * 0.82 + halo * 0.28) * vOpacity;

  vec3 color = vColor * (1.0 - vDistToCenter * 0.15);

  if (alpha <= 0.003) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
