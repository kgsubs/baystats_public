import { useSession } from '../../hooks/useSession'

export function SessionBadge() {
  const { tier, sessionActive, timeRemaining, unlimited, loading, startSession } = useSession()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-gray-600">Loading...</span>
      </div>
    )
  }

  // Pro user
  if (tier === 'pro' || unlimited) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-medium">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Pro
      </div>
    )
  }

  // Free user with active session
  if (sessionActive && timeRemaining !== null) {
    const hours = Math.floor(timeRemaining / 60)
    const minutes = timeRemaining % 60
    const isEndingSoon = timeRemaining < 60 // Less than 1 hour

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
        isEndingSoon 
          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' 
          : 'bg-green-100 text-green-700 border border-green-300'
      }`}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`} remaining
      </div>
    )
  }

  // Free user without active session
  return (
    <button
      onClick={startSession}
      className="flex items-center gap-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Start Session
    </button>
  )
}
