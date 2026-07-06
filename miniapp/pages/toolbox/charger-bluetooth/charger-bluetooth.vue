<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <!-- 连接区 -->
    <view class="ble-hero" :class="connClass">
      <view class="ble-hero-top">
        <view class="ble-status-dot" :class="connClass" />
        <view class="ble-hero-text">
          <text class="ble-status-label">{{ connLabel }}</text>
          <text v-if="connection.deviceName" class="ble-device">{{ connection.deviceName }}</text>
        </view>
      </view>

      <view v-if="isConnected && connection.serviceId" class="uuid-row">
        <text>{{ shortUuid(connection.serviceId) }}</text>
        <text class="uuid-sep">·</text>
        <text>W{{ shortUuid(connection.writeId) }}</text>
        <text class="uuid-sep">·</text>
        <text>N{{ shortUuid(connection.notifyId) || '—' }}</text>
      </view>

      <view class="ble-btns">
        <!-- #ifdef MP-WEIXIN -->
        <button
          id="ble-scan-privacy-btn"
          class="ble-btn primary"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onScanPrivacyAgree"
          @tap="onScanTap"
        >
          {{ isConnected ? '更换设备' : '扫描并连接' }}
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="ble-btn primary" @tap="openScanPicker">
          {{ isConnected ? '更换设备' : '扫描并连接' }}
        </button>
        <!-- #endif -->
        <button v-if="isConnected" class="ble-btn outline danger" @tap="onDisconnect">断开</button>
        <button class="ble-btn outline" @tap="showConfig = !showConfig">{{ showConfig ? '收起' : 'UUID' }}</button>
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
    </view>

    <!-- 发送区 -->
    <view class="send-card">
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
      <view class="send-foot">
        <button class="send-btn" :loading="sending" @tap="onSend">发送</button>
        <view class="send-tools">
          <text class="tool-link" @tap="clearCommLogs">清空</text>
          <text v-if="isConnected" class="tool-link" @tap="goInfo">监控</text>
          <text class="tool-link" @tap="goHub">首页</text>
        </view>
      </view>
    </view>

    <view class="log-head-bar">
      <text class="log-title">通信日志</text>
      <text class="log-count">{{ commLogs.length }} 条</text>
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
  createClientHeartbeat,
  createParamQuery,
  createFaultInfoQuery,
  createReboot
} from '@/services/charger/protocol.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { getBleScanEnvHint } from '@/utils/ble-scan-env.js'
import { queryWxPrivacyStatus, confirmWxPrivacyAfterButton } from '@/utils/wx-privacy.js'
import BleDevicePicker from './ble-picker.vue'

const cfg = ref(loadBleConfig())
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
  { name: '心跳', build: () => createClientHeartbeat(1) },
  { name: '网络参数', build: () => createParamQuery('NetworkParameters') },
  { name: '二维码', build: () => createParamQuery('QRCodeParameters') },
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
  const scanBlock = getBleScanEnvHint()
  if (scanBlock) {
    uni.showModal({ title: '无法扫描', content: scanBlock, showCancel: false })
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
  const scanBlock = getBleScanEnvHint()
  if (scanBlock) {
    uni.showModal({ title: '无法扫描', content: scanBlock, showCancel: false })
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
      await sendProtocolJson(obj)
    }
    uni.showToast({ title: '已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

function goInfo() {
  uni.navigateTo({ url: '/pages/toolbox/charger-monitor/monitor' })
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

.ble-hero {
  flex-shrink: 0;
  margin: 16rpx 24rpx 0;
  padding: 28rpx 24rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);

  &.ok {
    border-color: rgba(34, 197, 94, 0.25);
  }
}

.ble-hero-top {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.ble-status-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #94a3b8;
  flex-shrink: 0;
  &.ok { background: #22c55e; box-shadow: 0 0 12rpx rgba(34,197,94,.5); }
  &.pending { background: #3b82f6; animation: pulse 1.2s infinite; }
  &.err { background: #ef4444; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.ble-hero-text {
  flex: 1;
  min-width: 0;
}

.ble-status-label {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.ble-device {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.uuid-row {
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: var(--theme-input-bg);
  border-radius: 10rpx;
  font-size: 20rpx;
  font-family: monospace;
  color: var(--theme-text-sub);
}

.uuid-sep {
  margin: 0 8rpx;
  opacity: 0.4;
}

.ble-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 20rpx;
}

.ble-btn {
  flex: 1;
  min-width: 140rpx;
  height: 76rpx;
  line-height: 76rpx;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
  &::after { border: none; }
  &.primary {
    background: var(--theme-primary);
    color: #fff;
    flex: 2;
  }
  &.outline {
    background: transparent;
    color: var(--theme-text-sub);
    border: 2rpx solid var(--theme-border-soft);
    flex: 0 0 auto;
    padding: 0 28rpx;
    &.danger { color: #ef4444; border-color: rgba(239,68,68,.3); }
  }
}

.send-card {
  flex-shrink: 0;
  margin: 12rpx 24rpx 0;
  padding: 20rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
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

.send-foot {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}

.send-btn {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  &::after { border: none; }
}

.send-tools {
  display: flex;
  gap: 20rpx;
}

.tool-link {
  font-size: 24rpx;
  color: var(--theme-primary);
}

.log-head-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 16rpx 24rpx 8rpx;
  padding: 0 4rpx;
}

.log-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.log-count {
  font-size: 22rpx;
  color: var(--theme-text-sub);
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

.log-scroll {
  flex: 1;
  height: 0;
  margin: 0 24rpx 16rpx;
  padding: 12rpx 16rpx;
  background: #1e293b;
  border-radius: 16rpx;
  box-sizing: border-box;
}

.log-item {
  margin-bottom: 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.06);
  border-left: 4rpx solid #64748b;
  &.tx { border-left-color: #60a5fa; }
  &.rx { border-left-color: #4ade80; }
  &.warn { border-left-color: #fbbf24; }
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
  color: #e2e8f0;
}

.log-mode {
  font-size: 18rpx;
  color: #94a3b8;
}

.log-time {
  margin-left: auto;
  font-size: 18rpx;
  color: #64748b;
}

.log-text {
  font-size: 20rpx;
  word-break: break-all;
  font-family: monospace;
  line-height: 1.45;
  color: #cbd5e1;
}

.log-bottom {
  height: 16rpx;
}
</style>
