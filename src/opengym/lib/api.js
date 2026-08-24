// Adapted for Callejón Diagon: Supabase session via Next API routes under /api/opengym.
export const IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
export const IS_ANDROID = /Android/.test(navigator.userAgent)
export const BIO = IS_APPLE ? 'Face ID / Touch ID' : IS_ANDROID ? 'fingerprint or face unlock' : 'your fingerprint, face or PIN'
export const VAULT = IS_APPLE ? 'iCloud Keychain' : IS_ANDROID ? 'Google Password Manager' : 'your password manager'
export const webauthnOK = () => false

function toOpengymPath(path) {
  if (path.startsWith('/api/opengym')) return path
  if (path.startsWith('/api/')) return '/api/opengym' + path.slice(4)
  return path
}

export async function api(path, opts) {
  const r = await fetch(toOpengymPath(path), Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts))
  const data = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(data.error || ('HTTP ' + r.status)); e.status = r.status; throw e }
  return data
}

export async function passkeyRegister() {
  throw new Error('Passkeys are handled by Callejón Diagon login')
}
export async function passkeyLogin() {
  throw new Error('Passkeys are handled by Callejón Diagon login')
}
