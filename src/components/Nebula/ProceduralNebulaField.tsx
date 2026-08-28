import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { NebulaGeometry } from '@/utils/procedural/nebula'

interface ProceduralNebulaFieldProps {
  geometry: NebulaGeometry
  performanceMode?: boolean
}

export function ProceduralNebulaField({
  geometry,
  performanceMode = false,
}: ProceduralNebulaFieldProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const timeRef = useRef(0)

  const bufferGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(geometry.positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(geometry.colors, 3))
    geom.setAttribute('size', new THREE.BufferAttribute(geometry.sizes, 1))
    geom.setAttribute('opacity', new THREE.BufferAttribute(geometry.opacities, 1))
    geom.computeBoundingSphere()
    return geom
  }, [geometry])

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute float opacity;
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
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.material = shaderMaterial
    }
  }, [shaderMaterial])

  useFrame((_, delta) => {
    timeRef.current += delta
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial
      if (mat.uniforms?.uTime) {
        mat.uniforms.uTime.value = timeRef.current
      }
      if (!performanceMode) {
        pointsRef.current.rotation.y += delta * 0.02
      }
    }
  })

  return <points ref={pointsRef} geometry={bufferGeometry} />
}
