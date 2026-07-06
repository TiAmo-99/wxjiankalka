/** 小程序路由：减少 switchTab / navigateBack 竞态导致的 routeDone webview 告警 */

const TAB_PATHS = new Set(['/pages/home/home', '/pages/plan/plan', '/pages/mine/mine'])

function normalizePath(url) {
  const path = String(url || '').split('?')[0]
  return path.startsWith('/') ? path : `/${path}`
}

function routeOf(page) {
  return String(page?.route || '').replace(/^\//, '')
}

/**
 * 跳转 Tab 页：若从该 Tab 进入的子页返回，优先 navigateBack；否则 switchTab
 */
export function goTabBar(url) {
  const path = normalizePath(url)
  if (!TAB_PATHS.has(path)) {
    uni.navigateTo({ url: path })
    return
  }

  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (!pages.length) {
    uni.switchTab({ url: path })
    return
  }

  const targetRoute = path.slice(1)
  const curRoute = routeOf(pages[pages.length - 1])
  if (curRoute === targetRoute) return

  if (pages.length >= 2) {
    const prevRoute = routeOf(pages[pages.length - 2])
    if (prevRoute === targetRoute) {
      uni.navigateBack({ delta: 1 })
      return
    }
  }

  uni.switchTab({
    url: path,
    fail: () => {
      uni.reLaunch({ url: path })
    }
  })
}

/** 登录/注册成功后回到「我的」 */
export function goAfterAuthSuccess() {
  goTabBar('/pages/mine/mine')
}
