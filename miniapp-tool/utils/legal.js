/** 隐私与协议同意版本（更新协议内容时请递增版本号） */
export const LEGAL_VERSION = '1.0.0'

export const LEGAL_STORAGE_KEY = 'legal_user_agreed_version'

export function hasLegalConsent() {
  try {
    return uni.getStorageSync(LEGAL_STORAGE_KEY) === LEGAL_VERSION
  } catch (_) {
    return false
  }
}

export function setLegalConsent() {
  uni.setStorageSync(LEGAL_STORAGE_KEY, LEGAL_VERSION)
}

export function clearLegalConsent() {
  uni.removeStorageSync(LEGAL_STORAGE_KEY)
}

export function openPrivacyPolicy() {
  uni.navigateTo({ url: '/pages/legal/privacy/index' })
}

export function openUserAgreement() {
  uni.navigateTo({ url: '/pages/legal/user-agreement/index' })
}
