import { useCallback, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Spherical, Vector3 } from 'three'
import type { Camera } from 'three'
import { useTouchGestures } from '@/hooks/useTouchGestures'
import { useNebulaZoom } from '@/hooks/useNebulaZoom'
import { useGraphicsStore } from '@/store/graphicsStore'

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_DISTANCE = 2
const MAX_DISTANCE = 25
const DAMPING_FACTOR = 0.08
const AUTO_ROTATE_SPEED = 0.3
const KEYBOARD_ORBIT_SPEED = 2.2
const KEYBOARD_ZOOM_SPEED = 0.8
const PRECISION_MODIFIER = 0.3
const TOUCH_ROTATE_SENSITIVITY = 0.003
const TOUCH_ZOOM_SENSITIVITY = 0.8

function rotateCameraOrbit(
  controls: OrbitControlsImpl,
  camera: Camera,
  thetaDelta: number,
  phiDelta: number
) {
  const offset = new Vector3().subVectors(camera.position, controls.target)
  const spherical = new Spherical().setFromVector3(offset)

  spherical.theta += thetaDelta
  spherical.phi = Math.min(Math.PI - 0.05, Math.max(0.05, spherical.phi + phiDelta))
  spherical.makeSafe()

  offset.setFromSpherical(spherical)
  camera.position.copy(controls.target.clone().add(offset))
  controls.update()
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CameraControlsProps {
  isMobile?: boolean
  performanceMode?: boolean
  onTapToScan?: (x: number, y: number) => void
}

export function CameraControls({
  isMobile = false,
  performanceMode = false,
  onTapToScan,
}: CameraControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera, gl } = useThree()
  const keysDown = useRef(new Set<string>())
  const canvasRef = useRef<HTMLElement>(gl.domElement)

  const { jumpToLevel } = useNebulaZoom(controlsRef)
  const autoRotateEnabled = useGraphicsStore((state) => state.autoRotateEnabled)
  const setAutoRotateEnabled = useGraphicsStore((state) => state.setAutoRotateEnabled)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysDown.current.add(key)

      if (key === 'r' && !e.ctrlKey && !e.metaKey) {
        controlsRef.current?.reset()
      }
      if (key === ' ' && gl.domElement === e.target) {
        e.preventDefault()
        setAutoRotateEnabled(!autoRotateEnabled)
      }

      // Zoom level keyboard shortcuts
      if (key === '1') jumpToLevel('overview')
      if (key === '2') jumpToLevel('exploration')
      if (key === '3') jumpToLevel('detail')
    },
    [gl, jumpToLevel, autoRotateEnabled, setAutoRotateEnabled]
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysDown.current.delete(e.key.toLowerCase())
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    canvasRef.current = canvas
    canvas.setAttribute('tabindex', '0')
    canvas.style.touchAction = 'none'
    canvas.addEventListener('keydown', handleKeyDown)
    canvas.addEventListener('keyup', handleKeyUp)
    return () => {
      canvas.removeEventListener('keydown', handleKeyDown)
      canvas.removeEventListener('keyup', handleKeyUp)
    }
  }, [gl, handleKeyDown, handleKeyUp])

  useTouchGestures(canvasRef as React.RefObject<HTMLElement>, {
    onPinchZoom: (scaleDelta) => {
      const controls = controlsRef.current
      if (!controls) return
      const target = controls.target
      const offset = new Vector3().subVectors(camera.position, target)
      const currentDist = offset.length()
      const newDist = Math.min(
        MAX_DISTANCE,
        Math.max(
          MIN_DISTANCE,
          currentDist / (scaleDelta * TOUCH_ZOOM_SENSITIVITY + (1 - TOUCH_ZOOM_SENSITIVITY))
        )
      )
      offset.normalize().multiplyScalar(newDist)
      camera.position.copy(target.clone().add(offset))
      controls.update()
    },
    onSwipeRotate: (dx, dy) => {
      const controls = controlsRef.current
      if (!controls) return
      rotateCameraOrbit(
        controls,
        camera,
        dx * TOUCH_ROTATE_SENSITIVITY,
        dy * TOUCH_ROTATE_SENSITIVITY
      )
    },
    onTwoFingerPan: (dx, dy) => {
      const controls = controlsRef.current
      if (!controls) return
      const panSpeed = 0.01
      const right = new Vector3()
      const up = new Vector3()
      camera.matrix.extractBasis(right, up, new Vector3())
      const panOffset = right.multiplyScalar(-dx * panSpeed).add(up.multiplyScalar(dy * panSpeed))
      camera.position.add(panOffset)
      controls.target.add(panOffset)
      controls.update()
    },
    onTap: (x, y) => {
      onTapToScan?.(x, y)
      const canvas = gl.domElement
      canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }))
    },
  })

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    const keys = keysDown.current
    if (keys.size === 0) return

    const shift = keys.has('shift')
    const orbitSpeed = KEYBOARD_ORBIT_SPEED * delta * (shift ? PRECISION_MODIFIER : 1)

    if (keys.has('a') || keys.has('arrowleft')) {
      rotateCameraOrbit(controls, camera, -orbitSpeed, 0)
    }
    if (keys.has('d') || keys.has('arrowright')) {
      rotateCameraOrbit(controls, camera, orbitSpeed, 0)
    }
    if (keys.has('w') || keys.has('arrowup')) {
      rotateCameraOrbit(controls, camera, 0, -orbitSpeed)
    }
    if (keys.has('s') || keys.has('arrowdown')) {
      rotateCameraOrbit(controls, camera, 0, orbitSpeed)
    }

    const zoomSpeed = KEYBOARD_ZOOM_SPEED * delta * (shift ? PRECISION_MODIFIER : 1)
    const target = controls.target
    const offset = new Vector3().subVectors(camera.position, target)
    const currentDist = offset.length()

    if (keys.has('q')) {
      const newDist = Math.max(MIN_DISTANCE, currentDist * (1 - zoomSpeed))
      offset.normalize().multiplyScalar(newDist)
      camera.position.copy(target.clone().add(offset))
      controls.update()
    }
    if (keys.has('e')) {
      const newDist = Math.min(MAX_DISTANCE, currentDist * (1 + zoomSpeed))
      offset.normalize().multiplyScalar(newDist)
      camera.position.copy(target.clone().add(offset))
      controls.update()
    }
  })

  const effectiveDamping = performanceMode ? DAMPING_FACTOR * 1.5 : DAMPING_FACTOR

  return (
    <OrbitControls
      ref={controlsRef}
      domElement={gl.domElement}
      enableDamping
      dampingFactor={effectiveDamping}
      enableZoom
      enableRotate
      enablePan={isMobile}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI - 0.05}
      autoRotate={autoRotateEnabled}
      autoRotateSpeed={AUTO_ROTATE_SPEED}
      zoomSpeed={isMobile ? 0.6 : 1}
      rotateSpeed={isMobile ? 0.4 : 0.6}
      panSpeed={isMobile ? 0.5 : 0.8}
    />
  )
}
