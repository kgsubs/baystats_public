import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export function MagicLink() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const locationParam = searchParams.get('location') || 'rodney-bay'

  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid sign-in link.')
      return
    }
    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
        })
        if (res.ok) {
          window.location.href = `/?location=${locationParam}`
        } else {
          const data = await res.json()
          setError(data.error || 'Invalid or expired sign-in link.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    }
    verify()
  }, [token, locationParam])

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) return
    setSending(true)
    await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, location: locationParam }),
    })
    setSending(false)
    setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f7f7f7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
      fontFamily: FONT_FAMILY,
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '3px',
        padding: '48px 32px',
        textAlign: 'center',
      }}>
        {!error ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#aaaaaa" strokeWidth="2.5" strokeLinecap="round"
                style={{ display: 'inline-block', animation: 'spin 0.9s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <p style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#888888',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Signing you in&hellip;
            </p>
          </>
        ) : sent ? (
          <>
            <div style={{ marginBottom: '16px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ display: 'inline-block' }}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <h1 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '12px',
            }}>
              Check your inbox
            </h1>
            <p style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              lineHeight: '1.6',
            }}>
              New link sent to {email}
            </p>
          </>
        ) : (
          <>
            <h1 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#000000',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '8px',
            }}>
              Link expired
            </h1>
            <p style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#888888',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}>
              Enter your email to get a new one.
            </p>
            <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="captain@boat.com"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '3px',
                  fontSize: '13px',
                  fontFamily: FONT_FAMILY,
                  color: '#000000',
                  background: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#000000' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0' }}
              />
              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%',
                  background: sending ? '#666666' : '#000000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '12px 24px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontFamily: FONT_FAMILY,
                }}
              >
                {sending ? 'Sending\u2026' : 'Send new link \u2192'}
              </button>
            </form>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
