import { useWebGlSupport } from './webgl-support'

interface WebGlFallbackProps {
  alternatives?: string[]
  onRetry?: () => void
}

export function WebGlFallback({ alternatives, onRetry }: WebGlFallbackProps) {
  const isWebGlSupported = useWebGlSupport()

  if (isWebGlSupported === undefined || isWebGlSupported === null) {
    return null
  }

  if (!isWebGlSupported) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: '#07111f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          color: '#cbd5e1',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            background: '#1e293b',
            padding: '2rem 3rem',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '90%',
            border: '1px solid #334155',
          }}
        >
          <h2 style={{ color: '#38bdf8', marginBottom: '1rem' }}>WebGL Not Supported</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Your browser or device does not support WebGL. This experience requires WebGL to render
            the 3D nebula environment.
          </p>
          <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <strong>Alternatives:</strong> {alternatives?.join('. ')}.
          </p>
          <button
            onClick={onRetry}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Retry Detection
          </button>
        </div>
      </div>
    )
  }

  return null
}
