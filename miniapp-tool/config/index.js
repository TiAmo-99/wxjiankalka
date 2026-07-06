/**
 * 简卡拉卡Tool — 运行环境配置（与考研版共用 API）
 *
 * 仅演示数据（Mock）需在控制台执行：
 *   uni.setStorageSync('api_env_override', 'dev')
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
