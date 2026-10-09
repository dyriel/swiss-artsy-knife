// Where the login token lives between visits. Wrapped in try/catch because
// storage can be blocked (private mode, strict browser settings).
const KEY = 'swiss-artsy-knife.token'

export function getToken() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    // Without storage the login simply lasts until the page is reloaded.
  }
}
