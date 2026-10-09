// The only file the rest of the app imports from.
//
//   VITE_USE_MOCK_API=false  -> the Express API at VITE_API_BASE_URL
//   anything else, INCLUDING UNSET -> the browser-only demo backend
//
// Demo mode is the default so a fresh build works before anything is
// configured. DemoNotice shows a banner while it is on.
import * as httpApi from './httpApi.js'
import * as mockApi from './mockApi.js'

export const USING_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

const implementation = USING_MOCK_API ? mockApi : httpApi

export const {
  signup,
  login,
  fetchMe,
  updateUsername,
  changePassword,
  listPalettes,
  createPalette,
  updatePalette,
  deletePalette,
} = implementation

export { getToken, setToken } from './token.js'
