import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { sessionActive, loading } = useSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (!sessionActive) {
    if (fallback) {
      return <>{fallback}</>
    }
    return <Navigate to="/rainmaker00" replace />
  }

  return <>{children}</>
}

// Component for home route - redirects to dashboard if logged in, login if not
export function HomeRedirect() {
  const { sessionActive, loading } = useSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  if (sessionActive) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/rainmaker00" replace />
}
