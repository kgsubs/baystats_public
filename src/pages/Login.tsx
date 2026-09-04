import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

const footerLinkStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#555555',
  textDecoration: 'underline dotted',
  textDecorationColor: '#aaaaaa',
  textUnderlineOffset: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { sessionActive, loading: sessionLoading } = useSession()

  const locationParam = searchParams.get('location') || ''
  const destination = locationParam ? `/?location=${locationParam}` : '/'

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionLoading && sessionActive) {
      navigate(destination, { replace: true })
    }
  }, [sessionLoading, sessionActive, navigate, destination])

  if (sessionLoading || sessionActive) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    try {
      await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, location: locationParam }),
      })
      setSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#e8e8e8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: FONT_FAMILY,
    }}>
      {/* Empty header — matches dashboard header height */}
      <div style={{ width: '100%', backgroundColor: '#e8e8e8', padding: '11px 16px', boxSizing: 'border-box' }}>
        <span style={{ display: 'inline-block', height: '1.1em' }} />
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px' }}>
      <div style={{
        maxWidth: '640px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '3px',
        padding: '40px 32px',
        textAlign: 'center',
      }}>

        {/* Icon */}
        <div style={{ marginBottom: '24px' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" style={{ display: 'inline-block' }}>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        {!sent ? (
          <>
            {/* Heading */}
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#000000',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Sign In
            </h2>

            {/* Subheading */}
            <p style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#555555',
              marginBottom: '32px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.6',
            }}>
              Access your BayStats account
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {error && (
                <p style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cc0000',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: 0,
                }}>
                  {error}
                </p>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="captain@boat.com"
                disabled={loading}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  color: '#000000',
                  background: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#000000' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0' }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#666666' : '#000000',
                  color: '#ffffff',
                  border: `1px solid ${loading ? '#666666' : '#000000'}`,
                  borderRadius: '3px',
                  padding: '14px 24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#333333'; e.currentTarget.style.borderColor = '#333333'; } }}
                onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = '#000000'; e.currentTarget.style.borderColor = '#000000'; } }}
              >
                {loading ? 'Sending\u2026' : 'Send sign-in link \u2192'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Heading */}
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#000000',
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Check your inbox
            </h2>

            {/* Subheading */}
            <p style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#555555',
              marginBottom: '32px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.6',
            }}>
              Link sent to {email}.<br />Click it to sign in.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{ background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', ...footerLinkStyle }}
              >
                Try a different email
              </button>
            </div>
          </>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e0e0e0', marginBottom: '20px' }} />

        {/* Footer link */}
        <Link
          to={locationParam ? `/?location=${locationParam}` : '/'}
          style={footerLinkStyle}
        >
          Back to BayStats &rarr;
        </Link>
      </div>

      <div style={{
        width: '100%',
        backgroundColor: '#e8e8e8',
        padding: '11px 16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '24px',
        boxSizing: 'border-box',
      }}>
        <a href="/" style={{ color: '#000000', fontWeight: 400, textDecoration: 'none', textTransform: 'uppercase' }}>
          &larr; Back to BayStats
        </a>
      </div>
      </div>
    </div>
  )
}
