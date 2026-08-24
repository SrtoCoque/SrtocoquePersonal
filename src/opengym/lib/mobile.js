// Capacitor / native shell is disabled in the Next.js embed.
import { t } from './i18n-core.js'

export const MOBILE = false

export async function nativeLoad() {
  return null
}

export async function nativeSave() {}

export async function syncReminder() {
  return true
}

export async function shareExport(json, filename) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  void t
}
