import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from './Button.jsx'
import ScreenTitle from './ScreenTitle.jsx'
import { useAuth } from '../lib/Auth.jsx'
import { ALERT_BOX, CHECK, CHECKBOX, FIELD, LABEL, PANEL, TEXT_INPUT } from '../lib/Ui.js'

// One form for both screens: mode is "login" or "signup".
export default function AuthForm({ mode }) {
  const isSignup = mode === 'signup'
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('') // email (sign up) or email / username (log in)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (isSignup && password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (isSignup) await signup(identifier, username, password)
      else await login(identifier, password)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <main className="mx-auto max-w-[480px] p-4">
      <ScreenTitle title={isSignup ? 'Sign up' : 'Log in'} />

      <form className={`${PANEL} flex flex-col gap-4`} onSubmit={handleSubmit}>
        <p className="text-body">
          {isSignup
            ? 'Make an account to save palettes. They stay on your account after you log off, on any device.'
            : 'Log in to see your saved palettes and your profile.'}
        </p>

        {error && <p className={ALERT_BOX} role="alert">{error}</p>}

        <div className={FIELD}>
          <label className={LABEL} htmlFor="identifier">
            {isSignup ? 'Email' : 'Email or username'}
          </label>
          <input
            id="identifier"
            type={isSignup ? 'email' : 'text'}
            className={TEXT_INPUT}
            value={identifier}
            maxLength={254}
            required
            autoComplete={isSignup ? 'email' : 'username'}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        {isSignup && (
          <div className={FIELD}>
            <label className={LABEL} htmlFor="username">Username (3 to 24 letters, numbers or _)</label>
            <input
              id="username"
              type="text"
              className={TEXT_INPUT}
              value={username}
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]{3,24}"
              title="3 to 24 letters, numbers or underscores"
              required
              autoComplete="nickname"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        <div className={FIELD}>
          <label className={LABEL} htmlFor="password">
            Password{isSignup && ' (at least 8 characters)'}
          </label>
          <input
            id="password"
            type={type}
            className={TEXT_INPUT}
            value={password}
            minLength={isSignup ? 8 : undefined}
            maxLength={72}
            required
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {isSignup && (
          <div className={FIELD}>
            <label className={LABEL} htmlFor="confirm">Repeat password</label>
            <input
              id="confirm"
              type={type}
              className={TEXT_INPUT}
              value={confirm}
              maxLength={72}
              required
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        )}

        <label className={CHECK}>
          <input
            type="checkbox"
            className={CHECKBOX}
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Show password
        </label>

        <Button type="submit" variant="success" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </Button>

        <p className="text-small">
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link
            to={isSignup ? '/login' : '/signup'}
            state={location.state}
            className="font-semibold underline"
          >
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </form>
    </main>
  )
}
