/**
 * 充电桩子页面路径（字面量常量，供微信「代码依赖分析」静态收录）
 * 跳转请使用 openChargerPage，勿仅用 menus[].path 动态 navigateTo
 */

export const CHARGER_ROUTES = {
  connect: '/pages/toolbox/charger-bluetooth/charger-bluetooth',
  monitor: '/pages/toolbox/charger-monitor/monitor',
  params: '/pages/toolbox/charger-params/params',
  history: '/pages/toolbox/charger-stub/charger-stub?key=history',
  firmware: '/pages/toolbox/charger-firmware/firmware',
  menu: '/pages/toolbox/charger-menu/charger-menu'
}

/** @param {'connect'|'monitor'|'params'|'history'|'firmware'|'menu'} id */
export function openChargerPage(id) {
  switch (id) {
    case 'connect':
      uni.navigateTo({ url: '/pages/toolbox/charger-bluetooth/charger-bluetooth' })
      break
    case 'monitor':
      uni.navigateTo({ url: '/pages/toolbox/charger-monitor/monitor' })
      break
    case 'params':
      uni.navigateTo({ url: '/pages/toolbox/charger-params/params' })
      break
    case 'history':
      uni.navigateTo({ url: '/pages/toolbox/charger-stub/charger-stub?key=history' })
      break
    case 'firmware':
      uni.navigateTo({ url: '/pages/toolbox/charger-firmware/firmware' })
      break
    case 'menu':
      uni.navigateTo({ url: '/pages/toolbox/charger-menu/charger-menu' })
      break
    default:
      break
  }
}
