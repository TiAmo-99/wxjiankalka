const STORAGE_KEY = 'charger_ble_config'
const CONFIG_VERSION = 4

const DEFAULTS = {
  configVersion: CONFIG_VERSION,
  serviceId: '',
  writeCharacteristicId: '',
  notifyCharacteristicId: '',
  appendCrlf: false,
  writeChunkSize: 20
}

export function loadBleConfig() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY)
    if (saved && typeof saved === 'object') {
      const merged = { ...DEFAULTS, ...saved }
      if (!saved.configVersion || saved.configVersion < CONFIG_VERSION) {
        merged.configVersion = CONFIG_VERSION
        uni.setStorageSync(STORAGE_KEY, merged)
      }
      return merged
    }
  } catch (_) {
    /* ignore */
  }
  return { ...DEFAULTS }
}

export function saveBleConfig(config) {
  const next = { ...loadBleConfig(), ...config }
  uni.setStorageSync(STORAGE_KEY, next)
  return next
}

export function resetBleConfig() {
  uni.removeStorageSync(STORAGE_KEY)
  return { ...DEFAULTS }
}

export { DEFAULTS }
