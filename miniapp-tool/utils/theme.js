import { ref } from 'vue'

const THEME_KEY = 'ui_theme_name'
export const themeSignal = ref(0)

const THEMES = {
  classic: {
    name: 'classic',
    label: '经典蓝',
    desc: '沉稳清爽，学习场景默认主题',
    colors: {
      navBg: '#3f60ea',
      navFrontColor: '#ffffff',
      tabText: '#8a94a6',
      tabSelected: '#3f60ea',
      tabBg: '#ffffff',
      pageBg: '#f4f6ff',
      pageGradient: 'linear-gradient(180deg, #edf1ff 0%, #f4f6ff 120rpx, #f4f6ff 100%)',
      cardBg: '#ffffff',
      primary: '#3f60ea',
      heroGradient: 'linear-gradient(145deg, #5f78f1 0%, #6a63ea 52%, #7c5edf 100%)'
    }
  },
  goddess: {
    name: 'goddess',
    label: '女神粉',
    desc: '为女生设计：柔和、明亮、甜而不腻',
    colors: {
      navBg: '#ce4f8b',
      navFrontColor: '#ffffff',
      tabText: '#b78ea2',
      tabSelected: '#ce4f8b',
      tabBg: '#fff8fb',
      pageBg: '#fff7fb',
      pageGradient: 'linear-gradient(180deg, #ffedf5 0%, #fff7fb 140rpx, #fff7fb 100%)',
      cardBg: '#fffbfd',
      primary: '#ce4f8b',
      heroGradient: 'linear-gradient(145deg, #e575aa 0%, #da669d 48%, #c661aa 100%)'
    }
  },
  dark: {
    name: 'dark',
    label: '酷夜黑',
    desc: '深色护眼，夜间学习与调试更专注',
    colors: {
      navBg: '#27344a',
      navFrontColor: '#ffffff',
      tabText: '#8fa3bf',
      tabSelected: '#7cb3ff',
      tabBg: '#1b2638',
      pageBg: '#1b2536',
      pageGradient: 'linear-gradient(180deg, #243247 0%, #1b2536 130rpx, #1b2536 100%)',
      cardBg: '#243247',
      primary: '#7cb3ff',
      heroGradient: 'linear-gradient(145deg, #3a4e6d 0%, #314763 55%, #2a3f58 100%)'
    }
  }
}

/** 与 pages.json tabBar.list 的 pagePath 一致 */
const TAB_BAR_ROUTES = new Set([
  'pages/toolbox/charger-menu/charger-menu',
  'pages/toolbox/toolbox',
  'pages/mine/mine'
])

const PAGE_TITLES = {
  'pages/toolbox/charger-menu/charger-menu': '充电桩',
  'pages/toolbox/toolbox': '工具',
  'pages/mine/mine': '我的',
  'pages/register/register': '注册',
  'pages/legal/privacy/index': '隐私政策',
  'pages/legal/user-agreement/index': '用户服务协议',
  'pages/login/login': '登录',
  'pages/set-password/set-password': '设置密码',
  'pages/profile/profile': '个人资料',
  'pages/permission-apply/permission-apply': '权限申请',
  'pages/toolbox/charger-bluetooth/charger-bluetooth': '蓝牙连接与收发',
  'pages/toolbox/charger-info/charger-info': '充电桩信息',
  'pages/toolbox/charger-stub/charger-stub': '功能预留',
  'pages/toolbox/charger-connect/connect': '蓝牙连接',
  'pages/toolbox/charger-monitor/monitor': '充电监控',
  'pages/toolbox/charger-ble-debug/ble-debug': '蓝牙收发调试',
  'pages/toolbox/ops-platform/ops-platform': '运维平台调试',
  'pages/toolbox/calculator/calculator': '计算器',
  'pages/toolbox/qrcode/qrcode': '二维码'
}

export function listThemes() {
  return Object.values(THEMES)
}

export function getThemeName() {
  const saved = uni.getStorageSync(THEME_KEY)
  return THEMES[saved] ? saved : 'classic'
}

export function getTheme() {
  return THEMES[getThemeName()]
}

export function setTheme(name) {
  const safe = THEMES[name] ? name : 'classic'
  uni.setStorageSync(THEME_KEY, safe)
  themeSignal.value += 1
  return THEMES[safe]
}

export function getThemePageStyle() {
  const t = getTheme()
  return {
    background: t.colors.pageGradient,
    color: t.name === 'dark' ? '#f8fafc' : '#111827'
  }
}

export function getThemeCssVars() {
  const t = getTheme()
  const c = t.colors
  const isDark = t.name === 'dark'
  return {
    '--theme-page-bg': c.pageGradient,
    '--theme-card-bg': c.cardBg,
    '--theme-primary': c.primary,
    '--theme-hero-gradient': c.heroGradient,
    '--theme-text-main': isDark ? '#e5e7eb' : '#111827',
    '--theme-text-sub': isDark ? '#94a3b8' : '#6b7280',
    '--theme-border-soft': isDark ? '#1f2937' : '#e5e7eb',
    '--theme-input-bg': isDark ? '#0f172a' : '#f9fafb'
  }
}

export function getCurrentRoute() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages.length ? pages[pages.length - 1] : null
  return current?.route || ''
}

/** 仅 Tab 页可调用 setTabBarStyle / setBackgroundColor */
export function isTabBarPage(route) {
  const r = (route || getCurrentRoute()).replace(/^\//, '')
  return TAB_BAR_ROUTES.has(r)
}

export function applyTabBarTheme() {
  if (!isTabBarPage()) return
  const c = getTheme().colors
  try {
    uni.setTabBarStyle({
      color: c.tabText,
      selectedColor: c.tabSelected,
      backgroundColor: c.tabBg,
      borderStyle: 'white'
    })
  } catch (e) {}

  try {
    uni.setBackgroundColor({
      backgroundColor: c.pageBg,
      backgroundColorTop: c.pageBg,
      backgroundColorBottom: c.pageBg
    })
  } catch (e) {}
}

export function applyThemeUI(title = '') {
  const t = getTheme()
  const c = t.colors
  try {
    uni.setNavigationBarColor({
      frontColor: c.navFrontColor === '#ffffff' ? '#ffffff' : '#000000',
      backgroundColor: c.navBg,
      animation: { duration: 0, timingFunc: 'linear' }
    })
  } catch (e) {}

  applyTabBarTheme()

  if (title) {
    try {
      uni.setNavigationBarTitle({ title })
    } catch (e) {}
  }
}

export function applyThemeForCurrentPage() {
  const pages = getCurrentPages ? getCurrentPages() : []
  const current = pages && pages.length ? pages[pages.length - 1] : null
  const route = current?.route || ''
  const title = PAGE_TITLES[route] || ''
  applyThemeUI(title)
}

