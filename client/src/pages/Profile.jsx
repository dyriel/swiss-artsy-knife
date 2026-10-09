import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import ScreenTitle from '../components/ScreenTitle.jsx'
import { useAuth } from '../lib/Auth.jsx'
import { ALERT_BOX, CHECK, CHECKBOX, FIELD, LABEL, PANEL, PANEL_HEADING, TEXT_INPUT } from '../lib/Ui.js'

function Message({ msg }) {
  if (!msg) return null
  return (
    <p className={ALERT_BOX} role={msg.ok ? 'status' : 'alert'}>
      {msg.text}
    </p>
  )
}

// Account screen: shows who is logged in and lets them change their username
// and password. Wrapped in <RequireAuth> in App.jsx, so `user` is always set.
export default function Profile() {
  const { user, updateUsername, changePassword } = useAuth()
  const { hash } = useLocation()

  // Username form
  const [name, setName] = useState(user.username)
  const [nameMsg, setNameMsg] = useState(null) // { ok, text }
  const [nameBusy, setNameBusy] = useState(false)

  // Password form
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [passMsg, setPassMsg] = useState(null)
  const [passBusy, setPassBusy] = useState(false)

  // "Edit username" / "Change password" in the menu link to #username / #password.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  async function saveName(event) {
    event.preventDefault()
    setNameBusy(true)
    setNameMsg(null)
    try {
      const me = await updateUsername(name)
      setName(me.username)
      setNameMsg({ ok: true, text: 'Username updated.' })
    } catch (e) {
      setNameMsg({ ok: false, text: e.message })
    } finally {
      setNameBusy(false)
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    setPassMsg(null)
    if (next !== repeat) {
      setPassMsg({ ok: false, text: 'The two new passwords do not match.' })
      return
    }
    setPassBusy(true)
    try {
      await changePassword(current, next)
      setCurrent('')
      setNext('')
      setRepeat('')
      setPassMsg({ ok: true, text: 'Password changed. Use it the next time you log in.' })
    } catch (e) {
      setPassMsg({ ok: false, text: e.message })
    } finally {
      setPassBusy(false)
    }
  }

  const type = show ? 'text' : 'password'
  return (
    <main className="mx-auto max-w-[600px] p-4">
      <ScreenTitle title="Profile" />

      <section className={`${PANEL} mb-6`} aria-labelledby="account-heading">
        <h2 id="account-heading" className={PANEL_HEADING}>Account</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
          <dt className="font-semibold">Username</dt>
          <dd className="min-w-0 break-words">{user.username}</dd>
          <dt className="font-semibold">Email</dt>
          <dd className="min-w-0 break-words">{user.email}</dd>
        </dl>
      </section>

      <form id="username" className={`${PANEL} mb-6 flex flex-col gap-4`} onSubmit={saveName}>
        <h2 className={PANEL_HEADING}>Edit username</h2>
        <Message msg={nameMsg} />
        <div className={FIELD}>
          <label className={LABEL} htmlFor="new-username">Username (3 to 24 letters, numbers or _)</label>
          <input
            id="new-username"
            type="text"
            className={TEXT_INPUT}
            value={name}
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_]{3,24}"
            title="3 to 24 letters, numbers or underscores"
            required
            autoComplete="nickname"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button type="submit" variant="success" disabled={nameBusy || name === user.username}>
          {nameBusy ? 'Saving…' : 'Save username'}
        </Button>
      </form>

      <form id="password" className={`${PANEL} flex flex-col gap-4`} onSubmit={savePassword}>
        <h2 className={PANEL_HEADING}>Change password</h2>
        <Message msg={passMsg} />
        <div className={FIELD}>
          <label className={LABEL} htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type={type}
            className={TEXT_INPUT}
            value={current}
            maxLength={72}
            required
            autoComplete="current-password"
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="new-password">New password (at least 8 characters)</label>
          <input
            id="new-password"
            type={type}
            className={TEXT_INPUT}
            value={next}
            minLength={8}
            maxLength={72}
            required
            autoComplete="new-password"
            onChange={(e) => setNext(e.target.value)}
          />
        </div>
        <div className={FIELD}>
          <label className={LABEL} htmlFor="repeat-password">Repeat new password</label>
          <input
            id="repeat-password"
            type={type}
            className={TEXT_INPUT}
            value={repeat}
            maxLength={72}
            required
            autoComplete="new-password"
            onChange={(e) => setRepeat(e.target.value)}
          />
        </div>
        <label className={CHECK}>
          <input
            type="checkbox"
            className={CHECKBOX}
            checked={show}
            onChange={(e) => setShow(e.target.checked)}
          />
          Show passwords
        </label>
        <Button type="submit" variant="success" disabled={passBusy}>
          {passBusy ? 'Saving…' : 'Change password'}
        </Button>
      </form>
    </main>
  )
}
