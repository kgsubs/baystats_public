import { useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export function Account() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const locationParam = searchParams.get('location') || 'rodney-bay'
  const { tier, loading, isAdmin } = useSession()

  // Auth guard
  useEffect(() => {
    if (loading) return
    if (tier === null) {
      navigate('/rainmaker00', { replace: true })
    }
  }, [tier, loading, navigate])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e8e8e8',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        <div style={{ color: '#000', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (tier === null) return null

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/'
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '3px',
    padding: '24px',
    marginBottom: '16px',
  }



  return (
    <div style={{
      minHeight: '100vh',
      background: '#e8e8e8',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      WebkitFontSmoothing: 'antialiased',
      padding: '40px 16px',
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Page heading */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: 0,
          }}>
            Account
          </h1>
        </div>

        {/* Access Card */}
        <div style={cardStyle}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: '0 0 12px 0',
          }}>
            Access
          </h2>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: '0 0 16px 0',
          }}>
            All marina locations are open to everyone
          </p>
          <Link
            to={`/?location=${locationParam}`}
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#000',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textDecoration: 'underline',
              textDecorationColor: '#6b6b6b',
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Admin Tools */}
        {isAdmin && (
          <div style={{ ...cardStyle, borderColor: '#000', marginBottom: '16px' }}>
            <h2 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#000',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 12px 0',
            }}>
              Admin
            </h2>
            <Link
              to="/admin"
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 16px',
                background: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textDecoration: 'none',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              Admin Tools →
            </Link>
          </div>
        )}

        {/* Sign Out */}
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'none',
              color: '#6b6b6b',
              border: '1px solid #e0e0e0',
              borderRadius: '3px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#000'
              e.currentTarget.style.borderColor = '#000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b6b6b'
              e.currentTarget.style.borderColor = '#e0e0e0'
            }}
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  )
}
