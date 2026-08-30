import { Suspense, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei'
import type * as THREE from 'three'

interface ShipPreviewProps {
  shipModel?: string
  upgradeLevel?: number
  showComparison?: boolean
  onClose?: () => void
}

// Simple ship mesh component (placeholder until GLTF models are added)
function ShipMesh({ color = '#32d6a5', scale = 1 }: { color?: string; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3
    }
  })

  return (
    <mesh ref={meshRef} scale={scale}>
      {/* Main body */}
      <group>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 0.5, 3]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Wings */}
        <mesh position={[-1.5, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[1, 0.1, 2]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <boxGeometry args={[1, 0.1, 2]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Cockpit */}
        <mesh position={[0, 0.3, 0.8]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color="#60a5fa"
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.8}
          />
        </mesh>
        {/* Engines */}
        <mesh position={[-0.5, 0, -1.5]}>
          <cylinderGeometry args={[0.2, 0.3, 0.8, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.5, 0, -1.5]}>
          <cylinderGeometry args={[0.2, 0.3, 0.8, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </mesh>
  )
}

export function ShipPreview({
  upgradeLevel = 1,
  showComparison = false,
  onClose,
}: ShipPreviewProps) {
  const [activeView, setActiveView] = useState<'before' | 'after'>('after')

  const baseColor = '#32d6a5'
  const upgradedColor = '#9d4edd'
  const baseScale = 1
  const upgradedScale = 1 + upgradeLevel * 0.1

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Ship Preview</h2>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Close preview">
            ✕
          </button>
        </div>

        <div style={canvasContainerStyle}>
          {showComparison && (
            <div style={comparisonToggleStyle} role="group" aria-label="Ship preview comparison">
              <button
                type="button"
                aria-label="Show ship before upgrade"
                aria-pressed={activeView === 'before'}
                onClick={() => setActiveView('before')}
                style={{
                  ...toggleButtonStyle,
                  ...(activeView === 'before' ? activeToggleStyle : {}),
                }}
              >
                Before
              </button>
              <button
                type="button"
                aria-label="Show ship after upgrade"
                aria-pressed={activeView === 'after'}
                onClick={() => setActiveView('after')}
                style={{
                  ...toggleButtonStyle,
                  ...(activeView === 'after' ? activeToggleStyle : {}),
                }}
              >
                After Upgrade
              </button>
            </div>
          )}

          <Canvas style={canvasStyle}>
            <PerspectiveCamera makeDefault position={[0, 2, 8]} />
            <OrbitControls
              enablePan={false}
              minDistance={5}
              maxDistance={15}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.5}
            />

            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#9d4edd" />

            <Suspense fallback={null}>
              <ShipMesh
                color={showComparison && activeView === 'before' ? baseColor : upgradedColor}
                scale={showComparison && activeView === 'before' ? baseScale : upgradedScale}
              />
              <Environment preset="night" />
            </Suspense>

            {/* Grid helper */}
            <gridHelper args={[20, 20, '#32d6a5', '#1a1a2e']} position={[0, -2, 0]} />
          </Canvas>

          <div style={controlsHintStyle}>
            <p>🖱️ Drag to rotate • Scroll to zoom</p>
            <p>📱 Touch: Swipe to rotate • Pinch to zoom</p>
          </div>
        </div>

        <div style={statsContainerStyle}>
          <div style={statCardStyle}>
            <span style={statLabelStyle}>Speed</span>
            <span style={statValueStyle}>
              {showComparison && activeView === 'before' ? '100' : `${100 + upgradeLevel * 20}`}
            </span>
          </div>
          <div style={statCardStyle}>
            <span style={statLabelStyle}>Cargo</span>
            <span style={statValueStyle}>
              {showComparison && activeView === 'before' ? '50' : `${50 + upgradeLevel * 10}`}
            </span>
          </div>
          <div style={statCardStyle}>
            <span style={statLabelStyle}>Scanner</span>
            <span style={statValueStyle}>
              {showComparison && activeView === 'before' ? 'Lvl 1' : `Lvl ${upgradeLevel + 1}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(7, 17, 31, 0.9)',
  backdropFilter: 'blur(8px)',
  padding: '1rem',
}

const modalStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '900px',
  backgroundColor: 'rgba(10, 16, 32, 0.98)',
  border: '1px solid rgba(210, 222, 255, 0.16)',
  borderRadius: '1.5rem',
  padding: '1.5rem',
  boxShadow: '0 24px 80px rgba(0, 0, 0, 0.5)',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#f8fbff',
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(210, 222, 255, 0.2)',
  borderRadius: '50%',
  width: '2rem',
  height: '2rem',
  color: '#b9c6dd',
  cursor: 'pointer',
  fontSize: '1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const canvasContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '500px',
  borderRadius: '1rem',
  overflow: 'hidden',
  backgroundColor: 'rgba(7, 17, 31, 0.8)',
  border: '1px solid rgba(210, 222, 255, 0.1)',
}

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
}

const comparisonToggleStyle: React.CSSProperties = {
  position: 'absolute',
  top: '1rem',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  gap: '0.5rem',
  backgroundColor: 'rgba(10, 16, 32, 0.9)',
  padding: '0.25rem',
  borderRadius: '999px',
  border: '1px solid rgba(210, 222, 255, 0.2)',
}

const toggleButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '999px',
  border: 'none',
  backgroundColor: 'transparent',
  color: '#b9c6dd',
  cursor: 'pointer',
  fontSize: '0.875rem',
  fontWeight: 600,
  transition: 'all 0.2s',
}

const activeToggleStyle: React.CSSProperties = {
  backgroundColor: 'rgba(50, 214, 165, 0.2)',
  color: '#32d6a5',
}

const controlsHintStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '1rem',
  left: '50%',
  transform: 'translateX(-50%)',
  textAlign: 'center',
  color: '#aabbd3',
  fontSize: '0.75rem',
  backgroundColor: 'rgba(10, 16, 32, 0.8)',
  padding: '0.5rem 1rem',
  borderRadius: '0.5rem',
  border: '1px solid rgba(210, 222, 255, 0.1)',
}

const statsContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1rem',
  marginTop: '1.5rem',
}

const statCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '1rem',
  backgroundColor: 'rgba(7, 17, 31, 0.8)',
  border: '1px solid rgba(210, 222, 255, 0.1)',
  borderRadius: '1rem',
}

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#aabbd3',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const statValueStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#32d6a5',
}
