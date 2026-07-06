/**
 * 微信小程序：微信 code 登录/注册
 * App / H5 等：手机号 + 密码
 */
export function usePhoneAuth() {
  // #ifdef MP-WEIXIN
  return false
  // #endif
  return true
}
