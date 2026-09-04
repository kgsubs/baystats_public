import { useState, useEffect } from 'react'

const FONT_FAMILY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

const footnoteStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#555555',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  lineHeight: '1.6',
  margin: 0,
}

interface ComingSoonModalProps {
  locationName: string
  locationSlug: string
  onClose: () => void
}

export function ComingSoonModal({ locationName, locationSlug, onClose }: ComingSoonModalProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, location: locationSlug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not save your email. Please try again.')
        return
      }
      setSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        zIndex: 1000,
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '640px',
          width: '100%',
          maxHeight: '100%',
          overflowY: 'auto',
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          borderRadius: '3px',
          padding: '40px 32px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
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
              {locationName} is coming soon
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
              We are still gathering data for this marina.<br />Leave your email and we will tell you the day it goes live.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
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
                {loading ? 'Saving…' : 'Notify me →'}
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
              You are on the list
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
              We will email {email}<br />when {locationName} goes live.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#555555',
                  textDecoration: 'underline dotted',
                  textDecorationColor: '#aaaaaa',
                  textUnderlineOffset: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Use a different email
              </button>
            </div>
          </>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e0e0e0', marginBottom: '20px' }} />

        {/* Footer promise */}
        <p style={footnoteStyle}>
          Every marina, every detail, free at launch.
        </p>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #e0e0e0',
              borderRadius: '3px',
              padding: '10px 16px',
              fontFamily: 'inherit',
              fontSize: '12px',
              fontWeight: 600,
              color: '#555555',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#000000' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555555' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
