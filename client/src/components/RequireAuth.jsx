import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/Auth.jsx'

// Wrap a screen that is for registered users only. While the saved login is
// being checked it shows a short message; with no login it sends the visitor to
// the log-in screen and brings them back afterwards.
export default function RequireAuth({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <main className="mx-auto max-w-[900px] p-4">
        <p className="text-body" role="status">Checking your login…</p>
      </main>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}
