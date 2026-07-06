/** 微信小程序隐私协议（公众平台「用户隐私保护指引」） */

const RESOLVE_KEY = '__wxPrivacyResolve'

/** 公众平台未在《用户隐私保护指引》中声明蓝牙等接口（errno 112） */
export function isPrivacyNotDeclaredError(err) {
  const msg = String(err?.errMsg || err?.message || err || '')
  const errno = err?.errno ?? err?.errCode
  return (
    errno === 112 ||
    msg.includes('privacy agreement') ||
    msg.includes('api scope is not declared')
  )
}

export function showPrivacyNotDeclaredGuide() {
  uni.showModal({
    title: '权限未就绪',
    content:
      '请确认已同意微信隐私弹窗。若仍失败，请在公众平台《用户隐私保护指引》中勾选「蓝牙」「位置信息」「选中的文件」等能力并审核通过后重试。',
    showCancel: false,
    confirmText: '知道了'
  })
}

export function setupWxPrivacyListener() {
  // #ifdef MP-WEIXIN
  if (typeof wx === 'undefined' || !wx.onNeedPrivacyAuthorization) return
  wx.onNeedPrivacyAuthorization((resolve) => {
    const app = getApp({ allowDefault: true })
    if (!app.globalData) app.globalData = {}
    app.globalData[RESOLVE_KEY] = resolve
    uni.showToast({
      title: '请再次点击操作按钮并同意隐私协议',
      icon: 'none',
      duration: 3000
    })
  })
  // #endif
}

export function resolveWxPrivacyAuthorization(buttonId) {
  // #ifdef MP-WEIXIN
  if (!buttonId) return
  const app = getApp({ allowDefault: true })
  const resolve = app?.globalData?.[RESOLVE_KEY]
  if (typeof resolve === 'function') {
    resolve({ buttonId, event: 'agree' })
    app.globalData[RESOLVE_KEY] = null
  }
  // #endif
}

export function getWxPrivacySetting() {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (typeof wx === 'undefined' || !wx.getPrivacySetting) {
      resolve({ needAuthorization: false, privacyContractName: '' })
      return
    }
    wx.getPrivacySetting({
      success: resolve,
      fail: () => resolve({ needAuthorization: false, privacyContractName: '' })
    })
    // #endif
    // #ifndef MP-WEIXIN
    resolve({ needAuthorization: false, privacyContractName: '' })
    // #endif
  })
}

export function openWxPrivacyContract() {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.openPrivacyContract) {
      wx.openPrivacyContract({ success: resolve, fail: reject })
      return
    }
    // #endif
    if (typeof uni !== 'undefined' && uni.openPrivacyContract) {
      uni.openPrivacyContract({ success: resolve, fail: reject })
      return
    }
    reject(new Error('当前环境不支持打开微信隐私指引'))
  })
}

export async function queryWxPrivacyStatus() {
  const setting = await getWxPrivacySetting()
  return { needAuthorization: !!setting.needAuthorization }
}

/**
 * 仅查询状态。微信要求通过 open-type=agreePrivacyAuthorization 的按钮授权，
 * 不可在普通 @tap 里直接调用 requirePrivacyAuthorize。
 */
export async function ensureWxPrivacyAuthorized() {
  const setting = await getWxPrivacySetting()
  if (!setting.needAuthorization) {
    return { ok: true, needAuthorization: false }
  }
  return {
    ok: false,
    needButton: true,
    needAuthorization: true,
    reason: '请点击带隐私授权的按钮并同意协议'
  }
}

/** agreePrivacyAuthorization 事件成功后调用；buttonId 须与页面按钮 id 一致 */
export async function confirmWxPrivacyAfterButton(e, buttonId) {
  const errMsg = String(e?.detail?.errMsg || '')
  if (errMsg && !errMsg.includes('ok')) {
    return { ok: false, reason: '需同意微信隐私协议后才能继续' }
  }
  resolveWxPrivacyAuthorization(buttonId)
  const after = await getWxPrivacySetting()
  if (after.needAuthorization) {
    return { ok: false, reason: '隐私授权未完成，请重试' }
  }
  return { ok: true, needAuthorization: false }
}
