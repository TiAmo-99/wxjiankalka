const STORAGE_KEY = 'charger_ble_config'
const CONFIG_VERSION = 5

/** CCU621 FC41D GATT（见 CCU621_M_蓝牙调试通信方案.md） */
export const CCU621_BLE = {
  advName: 'CCU621_Debug',
  serviceId: '0000FFF1-0000-1000-8000-00805F9B34FB',
  writeCharacteristicId: '0000FFF2-0000-1000-8000-00805F9B34FB',
  notifyCharacteristicId: '0000FFF3-0000-1000-8000-00805F9B34FB'
}

const DEFAULTS = {
  configVersion: CONFIG_VERSION,
  serviceId: CCU621_BLE.serviceId,
  writeCharacteristicId: CCU621_BLE.writeCharacteristicId,
  notifyCharacteristicId: CCU621_BLE.notifyCharacteristicId,
  appendCrlf: false,
  writeChunkSize: 20
}

function migrateConfig(saved) {
  const merged = { ...DEFAULTS, ...saved }
  if (!saved?.serviceId) {
    merged.serviceId = CCU621_BLE.serviceId
    merged.writeCharacteristicId = CCU621_BLE.writeCharacteristicId
    merged.notifyCharacteristicId = CCU621_BLE.notifyCharacteristicId
  }
  if (!saved?.configVersion || saved.configVersion < CONFIG_VERSION) {
    merged.configVersion = CONFIG_VERSION
  }
  return merged
}

export function loadBleConfig() {
  try {
    const saved = uni.getStorageSync(STORAGE_KEY)
    if (saved && typeof saved === 'object') {
      const merged = migrateConfig(saved)
      if (merged.configVersion !== saved.configVersion || merged.serviceId !== saved.serviceId) {
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
  const next = { ...loadBleConfig(), ...config, configVersion: CONFIG_VERSION }
  uni.setStorageSync(STORAGE_KEY, next)
  return next
}

export function resetBleConfig() {
  uni.removeStorageSync(STORAGE_KEY)
  return { ...DEFAULTS }
}

export { DEFAULTS }
