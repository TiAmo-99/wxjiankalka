/**
 * 运行环境配置
 *
 * 默认 prod：连接线上 API（与历史行为一致，登录为真实微信账号）
 *
 * 仅演示数据（Mock、昵称「演示学员」）需在控制台执行一次：
 *   uni.setStorageSync('api_env_override', 'dev')
 * 恢复线上：
 *   uni.removeStorageSync('api_env_override')
 * 或在「我的」退出登录后重新编译（勿留 dev-mock-token）
 */
function resolveEnv() {
  try {
    const override = uni.getStorageSync('api_env_override')
    if (override === 'dev' || override === 'prod') return override
  } catch (_) {
    /* 非小程序环境 */
  }
  return 'prod'
}

const ENV = resolveEnv()

const envConfig = {
  dev: {
    baseUrl: 'http://localhost:3000/api/v1',
    useMock: true
  },
  prod: {
    baseUrl: 'https://server.jiankalka.cn/api/v1',
    useMock: false
  }
}

export default {
  env: ENV,
  ...envConfig[ENV]
}
