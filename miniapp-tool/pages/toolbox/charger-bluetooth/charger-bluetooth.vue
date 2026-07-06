<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <view class="panel conn-panel">
      <view v-if="envHint" class="env-banner">
        <text>{{ envHint }}</text>
      </view>

      <view v-if="classicBtHint" class="classic-banner">
        <text>{{ classicBtHint }}</text>
      </view>

      <view class="status-row">
        <view class="status-chip" :class="connClass">
          <text>{{ connLabel }}</text>
        </view>
        <text v-if="connection.deviceName" class="device-name">{{ connection.deviceName }}</text>
      </view>

      <view v-if="isConnected && connection.serviceId" class="uuid-brief">
        <text class="uuid-line">Svc {{ shortUuid(connection.serviceId) }}</text>
        <text class="uuid-line">W {{ shortUuid(connection.writeId) }} · N {{ shortUuid(connection.notifyId) || '—' }}</text>
      </view>

      <view class="action-row">
        <!-- #ifdef MP-WEIXIN -->
        <button
          id="ble-scan-privacy-btn"
          class="btn-action"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onScanPrivacyAgree"
          @tap="onScanTap"
        >
          {{ isConnected ? '更换设备' : '扫描并连接' }}
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="btn-action" @tap="openScanPicker">
          {{ isConnected ? '更换设备' : '扫描并连接' }}
        </button>
        <!-- #endif -->
        <button v-if="isConnected" class="btn-action danger" @tap="onDisconnect">断开</button>
        <button class="btn-action ghost" @tap="showConfig = !showConfig">
          {{ showConfig ? '收起' : 'UUID' }}
        </button>
      </view>

      <view v-if="showConfig" class="config-box">
        <view class="field">
          <text class="label">Service UUID</text>
          <input v-model="cfg.serviceId" class="input" placeholder="留空自动发现" />
        </view>
        <view class="field">
          <text class="label">Write UUID</text>
          <input v-model="cfg.writeCharacteristicId" class="input" placeholder="留空自动发现" />
        </view>
        <view class="field">
          <text class="label">Notify UUID</text>
          <input v-model="cfg.notifyCharacteristicId" class="input" placeholder="留空自动发现" />
        </view>
        <view class="switch-row">
          <text>JSON 追加 CRLF</text>
          <switch :checked="cfg.appendCrlf" color="var(--theme-primary)" @change="onCrlfChange" />
        </view>
        <view class="config-btns">
          <button class="btn-mini" size="mini" @tap="saveConfig">保存</button>
          <button class="btn-mini ghost" size="mini" @tap="resetConfig">默认</button>
        </view>
      </view>

      <text v-if="!isConnected" class="conn-tip">点击「扫描并连接」选择设备；下方仅显示收发数据与异常</text>
    </view>

    <view class="panel send-panel">
      <view class="mode-tabs">
        <view
          v-for="m in modes"
          :key="m.id"
          class="mode-tab"
          :class="{ active: sendMode === m.id }"
          @tap="sendMode = m.id"
        >
          {{ m.label }}
        </view>
      </view>
      <textarea
        v-model="sendText"
        class="textarea"
        :placeholder="sendPlaceholder"
        maxlength="-1"
        :show-confirm-bar="false"
      />
      <scroll-view scroll-x class="preset-scroll">
        <view class="preset-list">
          <view v-for="p in presets" :key="p.name" class="preset-chip" @tap="applyPreset(p)">
            {{ p.name }}
          </view>
        </view>
      </scroll-view>
      <view class="send-row">
        <button class="btn-send" :loading="sending" @tap="onSend">发送</button>
        <button class="btn-mini ghost" size="mini" @tap="clearCommLogs">清空日志</button>
        <button v-if="isConnected" class="btn-mini ghost" size="mini" @tap="goInfo">设备信息</button>
        <button class="btn-mini ghost" size="mini" @tap="goHub">首页</button>
      </view>
    </view>

    <scroll-view class="log-scroll" scroll-y :scroll-into-view="scrollInto">
      <view
        v-for="item in commLogs"
        :id="'log-' + item.id"
        :key="item.id"
        class="log-item"
        :class="logClass(item)"
      >
        <view class="log-head">
          <text class="log-dir">{{ item.dir }}</text>
          <text class="log-mode">{{ item.mode }}</text>
          <text class="log-time">{{ item.time }}</text>
        </view>
        <text class="log-text" selectable>{{ item.text }}</text>
      </view>
      <view v-if="!commLogs.length" class="log-empty">连接后的收发记录将显示在这里</view>
      <view id="log-bottom" class="log-bottom" />
    </scroll-view>

    <ble-device-picker
      :visible="pickerVisible"
      :scanning="scanning"
      :devices="pickerDevices"
      :summary="pickerSummary"
      @close="closeScanPicker"
      @pick="onPickDevice"
      @rescan="startBleScan"
    />
  </view>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { loadBleConfig, saveBleConfig, resetBleConfig } from '@/services/charger/ble-config.js'
import { displayBleDevices, formatScanSummary } from '@/services/charger/ble-scan-filter.js'
import { connection, commLogs, clearCommLogs, appendCommLog } from '@/services/charger/charger-store.js'
import {
  startScan,
  stopScan,
  connectDevice,
  disconnectDevice,
  getScannedDevices,
  syncDiscoveredDevices,
  onDeviceFound,
  ensureBleReady,
  sendProtocolJson,
  sendRawText,
  sendRawHex,
  sendRawJsonString
} from '@/services/charger/charger-session.js'
import {
  createHeartbeat,
  createParamQuery,
  createFaultInfoQuery,
  createReboot
} from '@/services/charger/protocol.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { getBleScanEnvHint, getClassicBtModuleHint } from '@/utils/ble-scan-env.js'
import { queryWxPrivacyStatus, confirmWxPrivacyAfterButton } from '@/utils/wx-privacy.js'
import BleDevicePicker from './ble-picker.vue'

const cfg = ref(loadBleConfig())
const envHint = ref(getBleScanEnvHint())
const classicBtHint = ref(getClassicBtModuleHint())
const pickerVisible = ref(false)
const pickerDevices = ref([])
const pickerSummary = ref('')
const scanning = ref(false)
const showConfig = ref(false)
const sendMode = ref('json')
const sendText = ref('')
const sending = ref(false)
const scrollInto = ref('')

let offFound = null
let pollTimer = null
let refreshDebounceTimer = null

const PICKER_POLL_MS = 2500
const PICKER_DEBOUNCE_MS = 600

const modes = [
  { id: 'json', label: 'JSON' },
  { id: 'text', label: '文本' },
  { id: 'hex', label: 'Hex' }
]

const presets = [
  { name: '心跳', build: () => createHeartbeat(1) },
  { name: '系统信息', build: () => createParamQuery('BasicParameters') },
  { name: '故障', build: () => createFaultInfoQuery() },
  { name: '重启', build: () => createReboot() }
]

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isConnected = computed(() => connection.state === 'connected')

const connLabel = computed(() => {
  const map = {
    idle: '未连接',
    scanning: '扫描中',
    connecting: '连接中',
    connected: '已连接',
    error: '连接失败'
  }
  return map[connection.state] || connection.state
})

const connClass = computed(() => {
  if (connection.state === 'connected') return 'ok'
  if (connection.state === 'scanning' || connection.state === 'connecting') return 'pending'
  if (connection.state === 'error') return 'err'
  return ''
})

const sendPlaceholder = computed(() => {
  if (sendMode.value === 'hex') return '十六进制'
  if (sendMode.value === 'text') return 'UTF-8 文本'
  return 'JSON 报文'
})

function shortUuid(u) {
  if (!u) return '—'
  const s = String(u)
  return s.length > 12 ? '…' + s.slice(-8) : s
}

function logClass(item) {
  if (item.mode === 'warn') return 'warn'
  if (item.mode === 'info') return 'info'
  return item.dir === 'TX' ? 'tx' : 'rx'
}

function applyPickerList(list) {
  const prev = pickerDevices.value
  if (
    prev.length === list.length &&
    prev.every((p, i) => p.deviceId === list[i].deviceId && p.name === list[i].name)
  ) {
    let rssiChanged = false
    const next = prev.map((p, i) => {
      if (p.RSSI !== list[i].RSSI) {
        rssiChanged = true
        return { ...p, RSSI: list[i].RSSI }
      }
      return p
    })
    if (rssiChanged) pickerDevices.value = next
    return
  }
  pickerDevices.value = list
}

async function refreshPickerList() {
  await syncDiscoveredDevices('刷新列表')
  const { list, total, named, unnamed } = displayBleDevices(getScannedDevices())
  applyPickerList(list)
  pickerSummary.value = formatScanSummary(total, list.length, named, unnamed)
}

function scheduleRefreshPickerList() {
  if (refreshDebounceTimer) return
  refreshDebounceTimer = setTimeout(() => {
    refreshDebounceTimer = null
    refreshPickerList()
  }, PICKER_DEBOUNCE_MS)
}

async function stopBleScan() {
  if (refreshDebounceTimer) {
    clearTimeout(refreshDebounceTimer)
    refreshDebounceTimer = null
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (scanning.value) {
    await stopScan()
    scanning.value = false
  }
}

async function startBleScan(skipReady = false) {
  envHint.value = getBleScanEnvHint()
  if (envHint.value) {
    uni.showModal({ title: '无法扫描', content: envHint.value, showCancel: false })
    return
  }

  await stopBleScan()
  pickerDevices.value = []
  pickerSummary.value = '正在搜索…'

  try {
    scanning.value = true
    if (offFound) offFound()
    offFound = onDeviceFound(() => scheduleRefreshPickerList())
    await startScan({ skipReady })
    await refreshPickerList()
    pollTimer = setInterval(() => refreshPickerList(), PICKER_POLL_MS)
  } catch (e) {
    scanning.value = false
    const msg = e?.message || '扫描失败'
    appendCommLog({ dir: 'RX', mode: 'warn', text: `[扫描·页面] 失败: ${msg}` })
    uni.showToast({ title: msg, icon: 'none', duration: 3500 })
  }
}

async function onScanTap() {
  const { needAuthorization } = await queryWxPrivacyStatus()
  if (!needAuthorization) {
    openScanPicker()
  }
}

async function onScanPrivacyAgree(e) {
  const auth = await confirmWxPrivacyAfterButton(e, 'ble-scan-privacy-btn')
  if (!auth.ok) {
    appendCommLog({ dir: 'RX', mode: 'warn', text: `[扫描·隐私] ${auth.reason}` })
    uni.showToast({ title: auth.reason, icon: 'none', duration: 3500 })
    return
  }
  openScanPicker()
}

async function openScanPicker() {
  envHint.value = getBleScanEnvHint()
  if (envHint.value) {
    uni.showModal({ title: '无法扫描', content: envHint.value, showCancel: false })
    return
  }

  uni.showLoading({ title: '准备蓝牙…', mask: true })
  try {
    await ensureBleReady()
  } catch (e) {
    const msg = e?.message || '蓝牙初始化失败'
    appendCommLog({ dir: 'RX', mode: 'warn', text: `[扫描·页面] 初始化失败: ${msg}` })
    uni.showToast({ title: msg, icon: 'none', duration: 3500 })
    return
  } finally {
    uni.hideLoading()
  }

  pickerVisible.value = true
  startBleScan(true)
}

async function closeScanPicker() {
  pickerVisible.value = false
  await stopBleScan()
}

async function onPickDevice(d) {
  pickerVisible.value = false
  await stopBleScan()

  uni.showLoading({ title: '连接中', mask: true })
  try {
    saveBleConfig({ ...cfg.value })
    await connectDevice(d.deviceId, d.name || d.localName || '')
    uni.showToast({ title: '已连接', icon: 'success' })
    setTimeout(() => {
      uni.showModal({
        title: '连接成功',
        content: '是否查看充电桩信息？',
        confirmText: '查看',
        cancelText: '留在此页',
        success: (res) => {
          if (res.confirm) goInfo()
        }
      })
    }, 400)
  } catch (e) {
    uni.showToast({ title: e.message || '连接失败', icon: 'none', duration: 3000 })
  } finally {
    uni.hideLoading()
  }
}

function saveConfig() {
  saveBleConfig({ ...cfg.value })
  uni.showToast({ title: '已保存', icon: 'success' })
}

function resetConfig() {
  cfg.value = resetBleConfig()
  uni.showToast({ title: '已恢复默认', icon: 'none' })
}

function onCrlfChange(e) {
  cfg.value.appendCrlf = !!e.detail.value
}

async function onDisconnect() {
  await disconnectDevice()
  uni.showToast({ title: '已断开', icon: 'none' })
}

function applyPreset(p) {
  sendText.value = JSON.stringify(p.build(), null, 2)
  sendMode.value = 'json'
}

async function onSend() {
  const raw = sendText.value.trim()
  if (!raw) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  if (!isConnected.value) {
    uni.showToast({ title: '请先连接蓝牙', icon: 'none' })
    return
  }

  sending.value = true
  try {
    if (sendMode.value === 'hex') {
      await sendRawHex(raw)
    } else if (sendMode.value === 'text') {
      await sendRawText(raw)
    } else {
      let obj
      try {
        obj = JSON.parse(raw)
      } catch (e) {
        uni.showToast({ title: 'JSON 无效', icon: 'none' })
        return
      }
      if (obj.version && obj.command) {
        await sendProtocolJson(obj)
      } else if (obj.command) {
        await sendProtocolJson(obj)
      } else {
        await sendRawJsonString(raw)
      }
    }
    uni.showToast({ title: '已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function goInfo() {
  uni.navigateTo({ url: '/pages/toolbox/charger-info/charger-info' })
}

function goHub() {
  uni.navigateTo({ url: '/pages/toolbox/charger-menu/charger-menu' })
}

watch(
  () => commLogs.value.length,
  () => {
    scrollInto.value = ''
    setTimeout(() => {
      scrollInto.value = 'log-bottom'
    }, 50)
  }
)

onShow(() => {
  applyThemeUI('蓝牙连接与收发')
  cfg.value = loadBleConfig()
  envHint.value = getBleScanEnvHint()
  classicBtHint.value = getClassicBtModuleHint()
})

onUnmounted(async () => {
  if (offFound) offFound()
  await stopBleScan()
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--theme-page-bg);
  box-sizing: border-box;
}

.panel {
  flex-shrink: 0;
  margin: 16rpx 24rpx 0;
  padding: 20rpx 24rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.env-banner {
  margin-bottom: 16rpx;
  padding: 16rpx 20rpx;
  background: #fef3c7;
  border-radius: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: #92400e;
}

.classic-banner {
  margin-bottom: 16rpx;
  padding: 16rpx 20rpx;
  background: #eff6ff;
  border-radius: 12rpx;
  font-size: 22rpx;
  line-height: 1.55;
  color: #1e40af;
}

.status-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.status-chip {
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background: var(--theme-input-bg);
  color: var(--theme-text-sub);

  &.ok {
    background: rgba(34, 197, 94, 0.15);
    color: #16a34a;
  }
  &.pending {
    background: rgba(59, 130, 246, 0.12);
    color: var(--theme-primary);
  }
  &.err {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }
}

.device-name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.uuid-brief {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: var(--theme-input-bg);
  border-radius: 10rpx;
}

.uuid-line {
  display: block;
  font-size: 20rpx;
  color: var(--theme-text-sub);
  font-family: monospace;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.btn-action {
  flex: 1;
  min-width: 160rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 14rpx;
  border: none;
  &::after {
    border: none;
  }
  &.ghost {
    background: var(--theme-input-bg);
    color: var(--theme-primary);
    flex: 0 0 auto;
  }
  &.danger {
    background: #ef4444;
    flex: 0 0 auto;
  }
}

.conn-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.config-box {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--theme-border-soft);
}

.field {
  margin-bottom: 16rpx;
}

.label {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  margin-bottom: 6rpx;
}

.input {
  height: 72rpx;
  padding: 0 16rpx;
  background: var(--theme-input-bg);
  border-radius: 10rpx;
  font-size: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.config-btns {
  display: flex;
  gap: 12rpx;
}

.btn-mini {
  background: var(--theme-primary);
  color: #fff;
  border: none;
  &::after {
    border: none;
  }
  &.ghost {
    background: var(--theme-input-bg);
    color: var(--theme-text-sub);
  }
}

.send-panel {
  margin-top: 12rpx;
}

.mode-tabs {
  display: flex;
  gap: 10rpx;
  margin-bottom: 12rpx;
}

.mode-tab {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  background: var(--theme-input-bg);
  &.active {
    background: var(--theme-primary);
    color: #fff;
  }
}

.textarea {
  width: 100%;
  height: 140rpx;
  padding: 12rpx;
  box-sizing: border-box;
  background: var(--theme-input-bg);
  border-radius: 10rpx;
  font-size: 22rpx;
  font-family: monospace;
  border: 1rpx solid var(--theme-border-soft);
}

.preset-scroll {
  margin-top: 10rpx;
  white-space: nowrap;
}

.preset-list {
  display: inline-flex;
  gap: 10rpx;
}

.preset-chip {
  padding: 8rpx 18rpx;
  background: var(--theme-input-bg);
  border-radius: 999rpx;
  font-size: 22rpx;
  color: var(--theme-primary);
}

.send-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 12rpx;
}

.btn-send {
  flex: 1;
  height: 72rpx;
  line-height: 72rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 14rpx;
  border: none;
  font-size: 28rpx;
  &::after {
    border: none;
  }
}

.log-scroll {
  flex: 1;
  height: 0;
  margin: 12rpx 24rpx 16rpx;
  padding: 12rpx 16rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-sizing: border-box;
}

.log-item {
  margin-bottom: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 10rpx;
  background: var(--theme-input-bg);
  border-left: 5rpx solid #94a3b8;
  &.tx {
    border-left-color: var(--theme-primary);
  }
  &.rx {
    border-left-color: #22c55e;
  }
  &.warn {
    border-left-color: #f59e0b;
  }
  &.info {
    border-left-color: #6366f1;
  }
}

.log-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}

.log-dir {
  font-size: 20rpx;
  font-weight: 700;
}

.log-mode {
  font-size: 18rpx;
  color: var(--theme-text-sub);
}

.log-time {
  margin-left: auto;
  font-size: 18rpx;
  color: var(--theme-text-sub);
}

.log-text {
  font-size: 20rpx;
  word-break: break-all;
  font-family: monospace;
  line-height: 1.4;
}

.log-empty {
  text-align: center;
  padding: 48rpx 16rpx;
  color: var(--theme-text-sub);
  font-size: 24rpx;
}

.log-bottom {
  height: 16rpx;
}
</style>
