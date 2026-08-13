import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const native = Capacitor.isNativePlatform()

export const authStorage = {
  async getItem(key) {
    if (!native) return localStorage.getItem(key)

    const { value } = await Preferences.get({ key })
    if (value !== null) return value

    // One-time migration for sessions created by older APKs.
    const legacyValue = localStorage.getItem(key)
    if (legacyValue !== null) {
      await Preferences.set({ key, value: legacyValue })
      localStorage.removeItem(key)
    }
    return legacyValue
  },

  async setItem(key, value) {
    if (!native) {
      localStorage.setItem(key, value)
      return
    }
    await Preferences.set({ key, value })
  },

  async removeItem(key) {
    if (!native) {
      localStorage.removeItem(key)
      return
    }
    await Preferences.remove({ key })
    localStorage.removeItem(key)
  },
}
