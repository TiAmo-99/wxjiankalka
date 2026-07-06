<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view v-if="!isConnected" class="banner">
      <text>未连接蓝牙，请先连接设备后再升级固件。</text>
      <button class="btn-banner" size="mini" @tap="goConnect">去连接</button>
    </view>

    <view class="card">
      <text class="section-label">固件文件</text>
      <view v-if="firmwareState.fileName" class="file-info">
        <text class="file-name">{{ firmwareState.fileName }}</text>
        <view class="file-meta">
          <text>{{ formatFirmwareSize(firmwareState.fileSize) }}</text>
          <text class="meta-dot">·</text>
          <text>{{ firmwareState.totalPackets }} 包</text>
          <text class="meta-dot">·</text>
          <text>版本 {{ firmwareState.firmwareVersion }}</text>
        </view>
      </view>
      <text v-else class="file-empty">尚未选择固件（.bin）</text>

      <view class="pick-btns">
        <!-- #ifdef MP-WEIXIN -->
        <button
          id="fw-pick-local-btn"
          class="btn-pick outline"
          :disabled="upgrading"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onPickLocalPrivacy"
          @tap="onPickLocalTap"
        >
          从本机选择
        </button>
        <button
          id="fw-pick-chat-btn"
          class="btn-pick"
          :disabled="upgrading"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onPickChatPrivacy"
          @tap="onPickChatTap"
        >
          从聊天记录选择
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <button class="btn-pick outline" :disabled="upgrading" @tap="onPickLocal">从本机选择</button>
        <button class="btn-pick" :disabled="upgrading" @tap="onPickChat">从聊天记录选择</button>
        <!-- #endif -->
      </view>
      <text class="pick-hint">本机：直接浏览手机存储中的 .bin 文件；聊天：可先发至「文件传输助手」再选取</text>

      <view class="progress-block">
        <view class="progress-head">
          <text class="status-text">{{ firmwareState.statusText }}</text>
          <text class="progress-pct">{{ firmwareState.progress }}%</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: firmwareState.progress + '%' }" />
        </view>
        <text v-if="firmwareState.phase === 'transferring'" class="progress-sub">
          已确认 {{ firmwareState.ackedCount }} / {{ firmwareState.totalPackets }} 包
        </text>
      </view>

      <view class="action-btns">
        <button
          class="btn-start"
          :loading="starting"
          :disabled="!canStart"
          @tap="onStart"
        >
          开始升级
        </button>
        <button
          class="btn-stop"
          :disabled="!upgrading"
          @tap="onStop"
        >
          停止
        </button>
      </view>

      <view v-if="firmwareState.error" class="error-box">{{ firmwareState.error }}</view>
    </view>

    <view class="card log-card">
      <text class="section-label">升级日志</text>
      <view v-if="!firmwareState.logs.length" class="log-empty">操作记录将显示在这里</view>
      <view v-for="(line, i) in firmwareState.logs" :key="i" class="log-line">{{ line }}</view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { connection } from '@/services/charger/charger-store.js'
import { sendProtocolJson } from '@/services/charger/charger-session.js'
import {
  firmwareState,
  setFirmwareFile,
  startFirmwareUpgrade,
  stopFirmwareUpgrade
} from '@/services/charger/firmware-upgrade.js'
import {
  pickFirmwareFromChat,
  pickFirmwareFromLocal,
  formatFirmwareSize
} from '@/utils/firmware-file.js'
import { queryWxPrivacyStatus, confirmWxPrivacyAfterButton } from '@/utils/wx-privacy.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isConnected = computed(() => connection.state === 'connected')
const starting = ref(false)

const upgrading = computed(() =>
  ['starting', 'transferring', 'ending'].includes(firmwareState.phase)
)

const canStart = computed(
  () =>
    isConnected.value &&
    firmwareState.fileName &&
    !upgrading.value &&
    firmwareState.phase !== 'done'
)

function goConnect() {
  uni.navigateTo({ url: '/pages/toolbox/charger-bluetooth/charger-bluetooth' })
}

async function applyPickedFile(picker) {
  try {
    const meta = await picker()
    setFirmwareFile(meta, meta.buffer)
    uni.showToast({ title: '已选择', icon: 'success' })
  } catch (e) {
    const msg = e.message || '选择失败'
    if (!msg.includes('取消')) {
      uni.showToast({ title: msg, icon: 'none', duration: 3500 })
    }
  }
}

async function onPickLocal() {
  await applyPickedFile(pickFirmwareFromLocal)
}

async function onPickLocalTap() {
  const { needAuthorization } = await queryWxPrivacyStatus()
  if (!needAuthorization) {
    await onPickLocal()
  }
}

async function onPickLocalPrivacy(e) {
  const auth = await confirmWxPrivacyAfterButton(e, 'fw-pick-local-btn')
  if (!auth.ok) {
    uni.showToast({ title: auth.reason, icon: 'none', duration: 3500 })
    return
  }
  await onPickLocal()
}

async function onPickChat() {
  await applyPickedFile(pickFirmwareFromChat)
}

async function onPickChatTap() {
  const { needAuthorization } = await queryWxPrivacyStatus()
  if (!needAuthorization) {
    await onPickChat()
  }
}

async function onPickChatPrivacy(e) {
  const auth = await confirmWxPrivacyAfterButton(e, 'fw-pick-chat-btn')
  if (!auth.ok) {
    uni.showToast({ title: auth.reason, icon: 'none', duration: 3500 })
    return
  }
  await onPickChat()
}

async function onStart() {
  uni.showModal({
    title: '确认升级',
    content: `文件：${firmwareState.fileName}\n大小：${formatFirmwareSize(firmwareState.fileSize)}\n分包：${firmwareState.totalPackets} 包\n\n升级过程中请保持蓝牙连接，勿关闭页面。`,
    success: async (res) => {
      if (!res.confirm) return
      starting.value = true
      try {
        await startFirmwareUpgrade(sendProtocolJson)
      } catch (e) {
        uni.showToast({ title: e.message || '启动失败', icon: 'none' })
      } finally {
        starting.value = false
      }
    }
  })
}

function onStop() {
  uni.showModal({
    title: '停止升级',
    content: '确定要停止当前固件升级吗？',
    success: (res) => {
      if (res.confirm) stopFirmwareUpgrade()
    }
  })
}

onShow(() => {
  applyThemeUI('固件升级')
})

onUnload(() => {
  if (upgrading.value) stopFirmwareUpgrade(true)
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 20rpx 24rpx 48rpx;
  box-sizing: border-box;
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
  background: #fef3c7;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #92400e;
}

.btn-banner {
  background: #fff;
  color: #92400e;
  border: none;
  &::after { border: none; }
}

.card {
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.section-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-sub);
  margin-bottom: 16rpx;
}

.file-info {
  margin-bottom: 16rpx;
}

.file-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  word-break: break-all;
}

.file-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.meta-dot { opacity: 0.4; }

.file-empty {
  font-size: 26rpx;
  color: var(--theme-text-sub);
  margin-bottom: 16rpx;
}

.pick-btns {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.btn-pick {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 14rpx;
  font-size: 26rpx;
  font-weight: 600;
  background: var(--theme-primary);
  color: #fff;
  border: none;
  padding: 0 8rpx;
  &::after { border: none; }
  &[disabled] { opacity: 0.45; }
  &.outline {
    background: transparent;
    color: var(--theme-primary);
    border: 2rpx solid var(--theme-primary);
  }
}

.pick-hint {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  margin-bottom: 20rpx;
  line-height: 1.5;
}

.progress-block {
  margin: 20rpx 0;
  padding: 20rpx;
  background: var(--theme-input-bg);
  border-radius: 14rpx;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.status-text {
  font-size: 26rpx;
  color: var(--theme-text-main);
  flex: 1;
  margin-right: 12rpx;
}

.progress-pct {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--theme-primary);
}

.progress-bar {
  height: 12rpx;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--theme-primary), #60a5fa);
  border-radius: 6rpx;
  transition: width 0.25s;
}

.progress-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.action-btns {
  display: flex;
  gap: 16rpx;
}

.btn-start,
.btn-stop {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  &::after { border: none; }
}

.btn-start {
  background: #22c55e;
  color: #fff;
  &[disabled] { opacity: 0.45; }
}

.btn-stop {
  background: #f87171;
  color: #fff;
  &[disabled] { opacity: 0.45; }
}

.error-box {
  margin-top: 16rpx;
  padding: 16rpx;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #dc2626;
}

.log-card {
  padding-bottom: 16rpx;
}

.log-empty {
  font-size: 24rpx;
  color: var(--theme-text-sub);
  padding: 16rpx 0;
}

.log-line {
  font-size: 22rpx;
  font-family: monospace;
  color: var(--theme-text-sub);
  padding: 8rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);
  word-break: break-all;
}
</style>
