import { Link } from 'react-router-dom'
import { useAuth } from '../lib/Auth.jsx'

const ITEM =
  'block w-full cursor-pointer border-b border-border px-4 py-3 text-left font-body text-body font-semibold hover:bg-primary focus-visible:bg-primary focus-visible:outline-none'

// The profile button at the right of the top bar. The menu opens on hover and
// also when the button or anything in it has keyboard focus, so it works with a
// mouse, a keyboard and a touch screen (a tap focuses the button).
export default function ProfileMenu() {
  const { user, logout } = useAuth()

  return (
    <div className="group relative hidden md:block">
      <button
        type="button"
        aria-haspopup="menu"
        className="flex max-w-[16ch] cursor-pointer items-center gap-2 border-3 border-border bg-primary px-3.5 py-1.5 font-heading text-btn-sm font-medium shadow-hard focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-3"
      >
        <span aria-hidden="true">&#9679;</span>
        <span className="truncate">{user.username}</span>
        <span aria-hidden="true" className="text-[0.7em]">&#9660;</span>
      </button>

      {/* No gap between the button and the menu, so the pointer never leaves the hover area. */}
      <div className="invisible absolute right-0 top-full z-10 min-w-[220px] pt-1 opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div role="menu" className="border-3 border-border bg-bg shadow-hard">
          <p className="border-b border-border px-4 py-3 text-small">
            Signed in as
            <span className="block truncate font-semibold">{user.username}</span>
          </p>
          <Link role="menuitem" to="/profile" className={ITEM}>
            Profile
          </Link>
          <Link role="menuitem" to="/profile#username" className={ITEM}>
            Edit username
          </Link>
          <Link role="menuitem" to="/profile#password" className={ITEM}>
            Change password
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${ITEM} border-b-0`}
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}
