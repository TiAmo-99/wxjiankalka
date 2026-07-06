/** 扫描环境检测（微信开发者工具无法扫描蓝牙） */

export function getBleScanEnv() {
  let platform = ''
  let system = ''
  let bluetoothEnabled = true
  let locationEnabled = true
  try {
    const sys = uni.getSystemInfoSync()
    platform = sys.platform || ''
    system = sys.system || ''
    if (typeof sys.bluetoothEnabled === 'boolean') {
      bluetoothEnabled = sys.bluetoothEnabled
    }
    if (typeof sys.locationEnabled === 'boolean') {
      locationEnabled = sys.locationEnabled
    }
  } catch (_) {
    /* ignore */
  }

  const isDevtools =
    platform === 'devtools' ||
    platform === 'windows' ||
    platform === 'mac' ||
    /windows|mac/i.test(system)

  const isAndroid = platform === 'android' || /android/i.test(system)
  const isIOS = platform === 'ios' || /ios/i.test(system)

  return {
    platform,
    system,
    bluetoothEnabled,
    locationEnabled,
    isDevtools,
    isAndroid,
    isIOS,
    canScan: !isDevtools && bluetoothEnabled
  }
}

export function getBleScanEnvHint(env = getBleScanEnv()) {
  if (env.isDevtools) {
    return '当前为开发者工具/电脑环境，无法扫描蓝牙。请用「真机调试」或手机预览。'
  }
  if (!env.bluetoothEnabled) {
    return '系统蓝牙未开启，请在手机设置中打开蓝牙后再扫描。'
  }
  if (env.isAndroid && !env.locationEnabled) {
    return 'Android 需同时开启「定位/GPS」才能扫描蓝牙，请在系统设置中打开。'
  }
  return ''
}

/** 经典蓝牙 SPP 模块说明（系统蓝牙可见，但微信小程序扫不到） */
export function getClassicBtModuleHint() {
  // #ifdef MP-WEIXIN
  return (
    '提示：手机「系统蓝牙」里看到的艾尔赛 USB 转蓝牙（如 Niren）属于经典蓝牙 SPP，' +
    '微信小程序只能扫描 BLE（低功耗蓝牙），无法发现或连接该类模块。' +
    '请连接充电桩本机的 BLE；USB 转蓝牙模块请用电脑 Qt 上位机通过串口调试。'
  )
  // #endif
  return ''
}
