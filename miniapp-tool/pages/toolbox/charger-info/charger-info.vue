<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view v-if="!isConnected" class="banner warn">
      <text>未连接蓝牙，请先连接设备。以下数据为上次连接时缓存（如有）。</text>
      <button class="btn-banner" size="mini" @tap="goConnect">去连接</button>
    </view>

    <view class="card">
      <view class="card-head">
        <text class="card-title">设备概况</text>
        <text class="updated">{{ updatedText }}</text>
      </view>
      <view v-if="connection.deviceName" class="device-line">
        <text class="label">蓝牙名称</text>
        <text class="value">{{ connection.deviceName }}</text>
      </view>
    </view>

    <view class="card">
      <text class="card-title">充电桩信息</text>
      <text class="card-sub">数据来自蓝牙 SystemInfo 报文</text>

      <view class="info-grid">
        <view v-for="row in infoRows" :key="row.key" class="info-cell">
          <text class="k">{{ row.label }}</text>
          <text class="v" :class="row.class">{{ row.value }}</text>
        </view>
      </view>

      <view v-if="!hasData" class="empty">
        <text>等待设备上报 SystemInfo…</text>
        <text class="empty-sub">连接后可点「刷新」发送心跳与基础参数查询</text>
      </view>

      <view class="actions">
        <button class="btn-primary" :loading="refreshing" :disabled="!isConnected" @tap="onRefresh">
          刷新
        </button>
        <button class="btn-ghost" @tap="goHub">功能首页</button>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { connection, systemInfo } from '@/services/charger/charger-store.js'
import { sendProtocolJson, startHeartbeat } from '@/services/charger/charger-session.js'
import {
  createHeartbeat,
  createParamQuery
} from '@/services/charger/protocol.js'
import {
  networkStatusLabel,
  formatPowerKw,
  formatUpdatedAt
} from '@/services/charger/charger-labels.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const refreshing = ref(false)
let heartbeatSeq = 0

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isConnected = computed(() => connection.state === 'connected')

const hasData = computed(() => !!systemInfo.updatedAt)

const updatedText = computed(() => formatUpdatedAt(systemInfo.updatedAt))

const infoRows = computed(() => [
  { key: 'model', label: '充电桩型号', value: systemInfo.systemModel || '—' },
  { key: 'hw', label: '硬件版本号', value: systemInfo.hardwareVersion || '—' },
  {
    key: 'sw',
    label: '软件版本号',
    value: systemInfo.softwareVersion || systemInfo.version || '—'
  },
  { key: 'guns', label: '充电枪数量', value: String(systemInfo.gunCount ?? 0) },
  { key: 'power', label: '额定功率', value: formatPowerKw(systemInfo.devicePower) },
  {
    key: 'net',
    label: '联网状态',
    value: networkStatusLabel(systemInfo.networkStatus),
    class: systemInfo.networkStatus === 1 ? 'ok' : systemInfo.networkStatus === 0 ? 'warn' : ''
  },
  {
    key: 'fault',
    label: '当前故障数',
    value: String(systemInfo.faultCount ?? 0),
    class: systemInfo.faultCount > 0 ? 'warn' : ''
  }
])

function goConnect() {
  uni.navigateTo({ url: '/pages/toolbox/charger-bluetooth/charger-bluetooth' })
}

function goHub() {
  uni.navigateTo({ url: '/pages/toolbox/charger-menu/charger-menu' })
}

async function onRefresh() {
  if (!isConnected.value) {
    uni.showToast({ title: '请先连接蓝牙', icon: 'none' })
    return
  }
  refreshing.value = true
  try {
    heartbeatSeq += 1
    await sendProtocolJson(createHeartbeat(heartbeatSeq))
    await sendProtocolJson(createParamQuery('BasicParameters'))
    startHeartbeat()
    uni.showToast({ title: '已请求刷新', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  } finally {
    refreshing.value = false
  }
}

onShow(() => {
  applyThemeUI('充电桩信息')
  if (isConnected.value) {
    startHeartbeat()
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
}

.banner {
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  line-height: 1.5;

  &.warn {
    background: #fef3c7;
    color: #92400e;
  }
}

.btn-banner {
  margin-top: 12rpx;
  background: #fff;
  color: #92400e;
  border: none;
  &::after {
    border: none;
  }
}

.card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.card-sub {
  display: block;
  margin-top: 4rpx;
  margin-bottom: 20rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.updated {
  font-size: 20rpx;
  color: var(--theme-text-sub);
  flex-shrink: 0;
}

.device-line {
  padding-top: 8rpx;
  border-top: 1rpx solid var(--theme-border-soft);
}

.label {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.value {
  display: block;
  margin-top: 4rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.info-cell {
  width: calc(50% - 8rpx);
  padding: 20rpx 16rpx;
  background: var(--theme-input-bg);
  border-radius: 14rpx;
  box-sizing: border-box;
}

.k {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.v {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  word-break: break-all;

  &.ok {
    color: #16a34a;
  }
  &.warn {
    color: #dc2626;
  }
}

.empty {
  margin-top: 24rpx;
  padding: 32rpx 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.empty-sub {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  opacity: 0.85;
}

.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 28rpx;
}

.btn-primary {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
  &::after {
    border: none;
  }
}

.btn-ghost {
  flex: 0 0 180rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--theme-input-bg);
  color: var(--theme-text-sub);
  border-radius: 16rpx;
  font-size: 26rpx;
  border: none;
  &::after {
    border: none;
  }
}
</style>
