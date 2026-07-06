<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="card sys-card">
      <text class="card-title">系统信息</text>
      <view class="grid">
        <view class="cell">
          <text class="k">硬件版本</text>
          <text class="v">{{ systemInfo.hardwareVersion || '—' }}</text>
        </view>
        <view class="cell">
          <text class="k">软件版本</text>
          <text class="v">{{ systemInfo.softwareVersion || systemInfo.version || '—' }}</text>
        </view>
        <view class="cell">
          <text class="k">型号</text>
          <text class="v">{{ systemInfo.systemModel || '—' }}</text>
        </view>
        <view class="cell">
          <text class="k">枪数</text>
          <text class="v">{{ systemInfo.gunCount || 0 }}</text>
        </view>
        <view class="cell">
          <text class="k">功率(kW)</text>
          <text class="v">{{ systemInfo.devicePower || 0 }}</text>
        </view>
        <view class="cell">
          <text class="k">网络</text>
          <text class="v">{{ systemInfo.networkStatus === 1 ? '正常' : '异常' }}</text>
        </view>
        <view class="cell tap" @click="queryFaults">
          <text class="k">故障数</text>
          <text class="v warn">{{ systemInfo.faultCount }}</text>
        </view>
      </view>
      <button class="btn-ghost" size="mini" @click="sendHeartbeat">发送心跳</button>
    </view>

    <view v-if="!gunRows.length" class="empty">等待设备上报 GunInfo…</view>

    <view v-for="g in gunRows" :key="g.gunNumber" class="card gun-card">
      <view class="gun-head">
        <text class="gun-no">枪 {{ g.gunNumber }}</text>
        <text class="gun-status">{{ statusLabel(g.chargingStatus) }}</text>
      </view>
      <view class="metrics">
        <text>需求 {{ g.demandVoltage }}V / {{ g.demandCurrent }}A</text>
        <text>实际 {{ g.actualVoltage }}V / {{ g.actualCurrent }}A</text>
        <text>电量 {{ g.energy }} kWh · 费用 {{ g.cost }} 元</text>
        <text>SOC {{ g.batterySOC }}% · 时长 {{ formatTime(g.chargingTime) }}</text>
      </view>
      <view class="gun-actions">
        <button class="btn-start" size="mini" @click="startCharge(g.gunNumber)">启动</button>
        <button class="btn-stop" size="mini" @click="stopCharge(g.gunNumber)">停止</button>
      </view>
    </view>

    <view v-if="faults.length" class="card">
      <text class="card-title">故障列表</text>
      <view v-for="(f, i) in faults" :key="i" class="fault-line">
        <text>{{ f.code || f.faultCode }} · {{ f.description || f.message }}</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { connection, systemInfo, faults, gunList } from '@/services/charger/charger-store.js'
import { sendProtocolJson, startHeartbeat } from '@/services/charger/charger-session.js'
import {
  CHARGE_ACTION,
  CHARGING_STATUS_LABEL,
  createChargeControl,
  createFaultInfoQuery,
  createHeartbeat
} from '@/services/charger/protocol.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const gunRows = computed(() => gunList())

function statusLabel(s) {
  return CHARGING_STATUS_LABEL[Number(s)] || `状态${s}`
}

function formatTime(sec) {
  const n = Number(sec) || 0
  const m = Math.floor(n / 60)
  const s = n % 60
  return `${m}分${s}秒`
}

async function startCharge(gunNumber) {
  uni.showModal({
    title: '启动充电',
    content: `确认启动枪 ${gunNumber}？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await sendProtocolJson(createChargeControl(gunNumber, CHARGE_ACTION.START))
        uni.showToast({ title: '已发送启动', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '发送失败', icon: 'none' })
      }
    }
  })
}

async function stopCharge(gunNumber) {
  uni.showModal({
    title: '停止充电',
    content: `确认停止枪 ${gunNumber}？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await sendProtocolJson(createChargeControl(gunNumber, CHARGE_ACTION.STOP))
        uni.showToast({ title: '已发送停止', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '发送失败', icon: 'none' })
      }
    }
  })
}

async function queryFaults() {
  try {
    await sendProtocolJson(createFaultInfoQuery())
  } catch (e) {
    uni.showToast({ title: e.message || '查询失败', icon: 'none' })
  }
}

async function sendHeartbeat() {
  try {
    await sendProtocolJson(createHeartbeat(Date.now() % 100000))
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  }
}

onShow(() => {
  applyThemeUI('充电监控')
  if (connection.state !== 'connected') {
    uni.showToast({ title: '未连接蓝牙', icon: 'none' })
  } else {
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

.card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  margin-bottom: 16rpx;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.cell {
  width: calc(50% - 8rpx);
  padding: 16rpx;
  background: var(--theme-input-bg);
  border-radius: 12rpx;
  box-sizing: border-box;

  &.tap .v.warn {
    color: #ef4444;
  }
}

.k {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.v {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
}

.btn-ghost {
  margin-top: 16rpx;
  background: var(--theme-input-bg);
  color: var(--theme-primary);
  border: none;
  &::after {
    border: none;
  }
}

.empty {
  text-align: center;
  padding: 60rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.gun-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.gun-no {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.gun-status {
  font-size: 26rpx;
  color: var(--theme-primary);
}

.metrics text {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.6;
}

.gun-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.btn-start {
  flex: 1;
  background: #22c55e;
  color: #fff;
  border: none;
  &::after {
    border: none;
  }
}

.btn-stop {
  flex: 1;
  background: #ef4444;
  color: #fff;
  border: none;
  &::after {
    border: none;
  }
}

.fault-line {
  padding: 12rpx 0;
  border-top: 1rpx solid var(--theme-border-soft);
  font-size: 24rpx;
  color: var(--theme-text-main);
}
</style>
