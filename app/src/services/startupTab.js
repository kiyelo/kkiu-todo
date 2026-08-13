import { hasSupabaseConfig, supabase } from './supabaseClient.js'

const VALID_TABS = new Set(['home', 'circle', 'more'])
const UI_KEY = 'kkiu-ui-v1'

const readSavedTab = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || '{}')
    return VALID_TABS.has(saved.tab) ? saved.tab : 'home'
  } catch {
    return 'home'
  }
}

// Existing sessions restore the saved tab; a fresh sign-in remains on home.
export function restoreStartupTabForExistingSession() {
  const savedTab = readSavedTab()
  if (savedTab === 'home' || !hasSupabaseConfig || !supabase) return

  const startupSession = supabase.auth.getSession()
  void startupSession.then(({ data }) => {
    if (!data.session) return

    let frames = 0
    const restore = () => {
      const button = document.querySelector(`#nav [data-tab="${savedTab}"]`)
      if (button) {
        button.click()
        return
      }
      frames += 1
      if (frames < 120) requestAnimationFrame(restore)
    }
    restore()
  }).catch(() => undefined)
}
