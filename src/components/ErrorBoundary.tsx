import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

/**
 * Keeps one bad card from taking the whole page down.
 *
 * The dashboard reads numbers straight out of the API responses, so a feed that
 * answers with an unexpected shape used to throw during render and leave the
 * visitor with a blank screen. This catches that and offers a reload instead.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Dashboard render failed:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        background: '#e8e8e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: FONT_FAMILY,
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '3px',
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#000000',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            Conditions are unavailable
          </h1>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#555555',
            margin: '0 0 28px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.6,
          }}>
            A data feed returned something we could not read.<br />Reload to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              background: '#000000',
              color: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '3px',
              padding: '14px 24px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'inherit',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
