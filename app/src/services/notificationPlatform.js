import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { AndroidSettings, IOSSettings, Settings } from '@cap-kit/settings'

export async function checkNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    const result = await LocalNotifications.checkPermissions()
    return result.display || 'unknown'
  }
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function ensureNotificationChannel() {
  if (Capacitor.getPlatform() !== 'android') return
  await LocalNotifications.createChannel({
    id: 'kkiu-updates',
    name: 'Kkiu updates',
    description: 'To-do and service updates',
    importance: 3,
    visibility: 1,
    vibration: true,
  })
}

export async function openNotificationSettings() {
  if (Capacitor.isNativePlatform()) {
    await Settings.open({
      optionAndroid: AndroidSettings.AppNotification,
      optionIOS: IOSSettings.AppNotification,
    })
    return checkNotificationPermission()
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    return Notification.requestPermission()
  }
  return checkNotificationPermission()
}
