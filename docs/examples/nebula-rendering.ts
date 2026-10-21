import * as THREE from 'three'

/**
 * Creates a procedural nebula particle system in Three.js.
 */
export function createNebulaParticles(count = 5000, radius = 50): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const baseColor = new THREE.Color(0x3a7bd5)
  const accentColor = new THREE.Color(0x00d2ff)

  for (let i = 0; i < count; i++) {
    // Generate spherical coordinates with variance
    const u = Math.random()
    const v = Math.random()
    const theta = u * 2.0 * Math.PI
    const phi = Math.acos(2.0 * v - 1.0)
    const r = Math.cbrt(Math.random()) * radius

    const sinPhi = Math.sin(phi)
    const x = r * sinPhi * Math.cos(theta)
    const y = r * sinPhi * Math.sin(theta)
    const z = r * Math.cos(phi)

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    // Blend between base and accent colors based on distance
    const mixRatio = r / radius
    const mixedColor = baseColor.clone().lerp(accentColor, mixRatio)

    colors[i * 3] = mixedColor.r
    colors[i * 3 + 1] = mixedColor.g
    colors[i * 3 + 2] = mixedColor.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  return new THREE.Points(geometry, material)
}
