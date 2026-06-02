const KEY_LOGIN_ID = 'ops_platform_login_id'
const KEY_PASSWORD = 'ops_platform_password'

export function loadOpsAccount() {
  try {
    return {
      loginId: uni.getStorageSync(KEY_LOGIN_ID) || '',
      password: uni.getStorageSync(KEY_PASSWORD) || ''
    }
  } catch (_) {
    return { loginId: '', password: '' }
  }
}

export function saveOpsAccount({ loginId, password }) {
  try {
    if (loginId !== undefined) {
      uni.setStorageSync(KEY_LOGIN_ID, String(loginId || '').trim())
    }
    if (password !== undefined) {
      uni.setStorageSync(KEY_PASSWORD, String(password ?? ''))
    }
  } catch (e) {
    console.warn('[ops-account] save failed', e)
  }
}
