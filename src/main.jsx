import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class ApplicationErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Silent Fleet] Application render failed:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error)
      return (
        <main style={{
          minHeight: '100vh',
          padding: 'clamp(24px, 6vw, 72px)',
          display: 'grid',
          placeItems: 'center',
          background: '#07070c',
          color: '#e8eef5',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}>
          <section style={{ width: 'min(720px, 100%)', border: '1px solid rgba(142,200,255,.28)', background: '#0c0c14', padding: 'clamp(22px, 4vw, 40px)' }}>
            <p style={{ color: '#ff7a45', letterSpacing: '.18em', fontSize: 11 }}>SILENT FLEET · RECOVERY MODE</p>
            <h1 style={{ fontFamily: 'Arial, sans-serif', fontSize: 'clamp(28px, 5vw, 44px)', margin: '18px 0 12px' }}>The experience encountered an error.</h1>
            <p style={{ color: '#aeb8c8', lineHeight: 1.65 }}>The page stopped while rendering. The details below can identify the failing component. Reload after checking the error; if it repeats, share this message with the project developer.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 22, padding: 16, color: '#ffd2bf', background: '#160f12', border: '1px solid rgba(255,122,69,.25)', fontSize: 12, lineHeight: 1.6 }}>{message}</pre>
            <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 24, padding: '12px 18px', background: '#d96d43', color: '#09090d', fontWeight: 700, cursor: 'pointer' }}>RELOAD EXPERIENCE</button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApplicationErrorBoundary>
      <App />
    </ApplicationErrorBoundary>
  </StrictMode>,
)
