import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../api/index.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  // 'loading' only while a saved token is being checked on first load.
  const [status, setStatus] = useState(api.getToken() ? 'loading' : 'ready')

  useEffect(() => {
    if (status !== 'loading') return undefined
    let cancelled = false
    api
      .fetchMe()
      .then(({ user: me }) => !cancelled && setUser(me))
      .catch((error) => {
        // Only a rejected token ends the session. A network error keeps it,
        // so a bad connection does not log anyone out.
        if (error.status === 401) api.setToken(null)
      })
      .finally(() => !cancelled && setStatus('ready'))
    return () => {
      cancelled = true
    }
  }, [status])

  const start = useCallback(({ token, user: me }) => {
    api.setToken(token)
    setUser(me)
    return me
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready: status === 'ready',
      signup: async (email, username, password) => start(await api.signup(email, username, password)),
      login: async (identifier, password) => start(await api.login(identifier, password)),
      logout() {
        api.setToken(null)
        // Go Home and clear the user in ONE update. Done separately, a protected
        // screen such as /profile would see "no user" first and redirect to
        // /login before the move to Home finished.
        startTransition(() => {
          navigate('/')
          setUser(null)
        })
      },
      async updateUsername(username) {
        const { user: me } = await api.updateUsername(username)
        setUser(me)
        return me
      },
      changePassword: (currentPassword, newPassword) => api.changePassword(currentPassword, newPassword),
    }),
    [user, status, start, navigate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
