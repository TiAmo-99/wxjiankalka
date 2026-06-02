const config = require('../config')

async function code2Session(code) {
  if (!config.wxAppId || !config.wxSecret) {
    if (config.nodeEnv === 'production') {
      throw new Error('未配置 WX_APPID / WX_SECRET')
    }
    return { openid: config.devOpenid, session_key: 'dev' }
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session')
  url.searchParams.set('appid', config.wxAppId)
  url.searchParams.set('secret', config.wxSecret)
  url.searchParams.set('js_code', code)
  url.searchParams.set('grant_type', 'authorization_code')

  const res = await fetch(url)
  const data = await res.json()
  if (data.errcode) {
    const hint =
      data.errcode === 40013
        ? 'AppID 无效，请检查服务器 WX_APPID 是否与小程序一致'
        : data.errcode === 40125
          ? 'AppSecret 无效，请检查服务器 WX_SECRET'
          : data.errcode === 40029
            ? '微信授权已过期，请关闭页面后重新点注册'
            : data.errcode === 45011
              ? '操作太频繁，请稍后再试'
              : data.errcode === 40163
                ? '微信 code 已被使用，请重新打开注册页再试'
                : `微信接口错误(${data.errcode})：${data.errmsg || '请重试'}`
    const err = new Error(hint)
    err.code = 30008
    throw err
  }
  if (!data.openid) {
    const err = new Error('微信未返回用户标识，请重试')
    err.code = 30008
    throw err
  }
  return data
}

module.exports = { code2Session }
