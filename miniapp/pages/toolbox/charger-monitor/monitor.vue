<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view v-if="!isConnected" class="banner">
      <text>未连接蓝牙，以下为缓存数据</text>
      <button class="btn-link" size="mini" @tap="goConnect">去连接</button>
    </view>

    <!-- 充电系统信息 -->
    <view class="sys-card">
      <view class="sys-head">
        <text class="sys-model">{{ systemInfo.systemModel || '充电桩' }}</text>
        <text class="sys-time">{{ updatedText }}</text>
      </view>

      <view class="sys-highlight">
        <view class="sys-block" :class="systemInfo.networkStatus === 1 ? 'online' : 'offline'">
          <text class="sys-block-val">{{ networkStatusLabel(systemInfo.networkStatus) }}</text>
          <text class="sys-block-k">网络状态</text>
        </view>
        <view class="sys-block version">
          <text class="sys-block-val">{{ displayVer(systemInfo.softwareVersion || systemInfo.version) }}</text>
          <text class="sys-block-k">软件版本</text>
        </view>
      </view>

      <view class="sys-grid">
        <view class="sys-cell">
          <text class="sys-cell-k">额定功率</text>
          <text class="sys-cell-v">{{ formatPowerKw(systemInfo.devicePower) }}</text>
        </view>
        <view class="sys-cell">
          <text class="sys-cell-k">充电枪数</text>
          <text class="sys-cell-v">{{ systemInfo.gunCount || 0 }} 枪</text>
        </view>
        <view v-if="connection.deviceName" class="sys-cell wide">
          <text class="sys-cell-k">蓝牙设备</text>
          <text class="sys-cell-v">{{ connection.deviceName }}</text>
        </view>
      </view>

      <view v-if="hasFaults" class="fault-tip" @tap="showFaultDetails">
        <text class="fault-tip-badge">!</text>
        <view class="fault-tip-text">
          <text class="fault-tip-title">当前存在 {{ faultCount }} 个故障</text>
          <text class="fault-tip-sub">点击查看详细故障信息</text>
        </view>
        <text class="fault-tip-arrow">›</text>
      </view>
    </view>

    <view v-if="!gunRows.length" class="empty">等待 GunInfo 上报…</view>

    <view v-for="g in gunRows" :key="g.gunNumber" class="gun-card">
      <view class="gun-bar">
        <text class="gun-label">枪 {{ g.gunNumber }}</text>
        <view class="gun-bar-right">
          <text class="pill" :class="statusClass(g.chargingStatus)">{{ statusLabel(g.chargingStatus) }}</text>
          <text class="pill muted">{{ gunPlugLabel(g.gunConnectionStatus) }}</text>
        </view>
      </view>

      <!-- 核心指标：电压 / 电流 / SOC -->
      <view class="core-row">
        <view class="core-item">
          <text class="core-val">{{ fmtNum(g.actualVoltage) }}</text>
          <text class="core-unit">V</text>
          <text class="core-k">输出电压</text>
        </view>
        <view class="core-div" />
        <view class="core-item">
          <text class="core-val">{{ fmtNum(g.actualCurrent) }}</text>
          <text class="core-unit">A</text>
          <text class="core-k">输出电流</text>
        </view>
        <view class="core-div" />
        <view class="core-item">
          <text class="core-val">{{ fmtNum(g.batterySOC) }}</text>
          <text class="core-unit">%</text>
          <text class="core-k">SOC</text>
        </view>
      </view>

      <view class="soc-bar">
        <view class="soc-fill" :style="{ width: socWidth(g.batterySOC) }" />
      </view>

      <!-- 次要信息 -->
      <view class="sub-grid">
        <view class="sub-cell">
          <text class="sub-k">需求</text>
          <text class="sub-v">{{ fmtNum(g.demandVoltage) }}V / {{ fmtNum(g.demandCurrent) }}A</text>
        </view>
        <view class="sub-cell">
          <text class="sub-k">电量</text>
          <text class="sub-v">{{ fmtNum(g.energy) }} kWh</text>
        </view>
        <view class="sub-cell">
          <text class="sub-k">费用</text>
          <text class="sub-v">{{ fmtNum(g.cost) }} 元</text>
        </view>
        <view class="sub-cell">
          <text class="sub-k">时长</text>
          <text class="sub-v">{{ formatChargingMinutes(g.chargingTime) }}</text>
        </view>
        <view class="sub-cell wide">
          <text class="sub-k">用户</text>
          <text class="sub-v">{{ displayText(g.userId) }}</text>
        </view>
        <view class="sub-cell wide">
          <text class="sub-k">订单</text>
          <text class="sub-v">{{ displayText(g.orderNumber) }}</text>
        </view>
      </view>

      <view class="gun-actions">
        <button class="act start" @tap="startCharge(g.gunNumber)">启动</button>
        <button class="act stop" @tap="stopCharge(g.gunNumber)">停止</button>
      </view>
    </view>
  </scroll-view>

  <!-- 故障详情 -->
  <view v-if="faultSheetVisible" class="sheet-mask" @tap="closeFaultSheet">
    <view class="sheet-panel" @tap.stop>
      <view class="sheet-head">
        <view class="sheet-head-left">
          <text class="sheet-title">故障信息</text>
          <text class="sheet-badge">{{ faultRows.length || faultCount }} 条</text>
        </view>
        <text class="sheet-close" @tap="closeFaultSheet">✕</text>
      </view>

      <scroll-view class="sheet-scroll" scroll-y>
        <view v-if="faultLoading" class="sheet-state">正在查询故障详情…</view>
        <view v-else-if="!faultRows.length" class="sheet-state">
          <text class="sheet-state-text">暂未收到故障详情</text>
          <button v-if="isConnected" class="sheet-retry" size="mini" @tap="refreshFaults">重新查询</button>
        </view>

        <view v-for="(f, i) in faultRows" :key="i" class="fault-card">
          <view class="fault-card-head">
            <view class="fault-card-title">
              <text class="fault-no">#{{ i + 1 }}</text>
              <text class="fault-code">{{ f.code }}</text>
            </view>
            <text v-if="f.level" class="fault-level" :class="faultLevelClass(f.level)">{{ f.level }}</text>
          </view>

          <view v-if="f.location || f.time" class="fault-row">
            <text v-if="f.location" class="fault-label">位置</text>
            <text v-if="f.location" class="fault-value">{{ f.location }}</text>
            <text v-if="f.time" class="fault-label time">时间</text>
            <text v-if="f.time" class="fault-value time">{{ f.time }}</text>
          </view>

          <view class="fault-row desc">
            <text class="fault-label">说明</text>
            <text class="fault-value desc">{{ f.description }}</text>
          </view>

          <view v-if="f.status || f.action" class="fault-row foot">
            <text v-if="f.status" class="fault-tag status">{{ f.status }}</text>
            <text v-if="f.action" class="fault-tag action">{{ f.action }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="sheet-foot">
        <button class="sheet-btn" @tap="closeFaultSheet">关闭</button>
        <button
          v-if="isConnected"
          class="sheet-btn primary"
          :loading="faultLoading"
          @tap="refreshFaults"
        >
          刷新
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { connection, systemInfo, faults, gunList } from '@/services/charger/charger-store.js'
import { sendProtocolJson, startHeartbeat } from '@/services/charger/charger-session.js'
import {
  CHARGE_ACTION,
  CHARGING_STATUS_LABEL,
  GUN_CONNECTION_LABEL,
  createChargeControl,
  createFaultInfoQuery
} from '@/services/charger/protocol.js'
import {
  formatPowerKw,
  formatChargingMinutes,
  formatUpdatedAt,
  networkStatusLabel,
  normalizeFaultList,
  faultLevelClass
} from '@/services/charger/charger-labels.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isConnected = computed(() => connection.state === 'connected')
const updatedText = computed(() => formatUpdatedAt(systemInfo.updatedAt))
const gunRows = computed(() => gunList())
const faultCount = computed(() => Math.max(Number(systemInfo.faultCount) || 0, faults.value.length))
const hasFaults = computed(() => faultCount.value > 0)
const faultRows = computed(() => normalizeFaultList(faults.value))

const faultSheetVisible = ref(false)
const faultLoading = ref(false)

function displayVer(v) {
  const s = String(v || '—').trim()
  return s || '—'
}

function fmtNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function socWidth(soc) {
  const n = Math.min(100, Math.max(0, Number(soc) || 0))
  return `${n}%`
}

function statusLabel(s) {
  return CHARGING_STATUS_LABEL[Number(s)] || `状态${s}`
}

function statusClass(s) {
  const n = Number(s)
  if (n === 3) return 'charging'
  if (n === 4) return 'done'
  return 'idle'
}

function gunPlugLabel(s) {
  return GUN_CONNECTION_LABEL[Number(s)] || ''
}

function displayText(v) {
  const s = String(v ?? '').trim()
  return s || '—'
}

function goConnect() {
  uni.navigateTo({ url: '/pages/toolbox/charger-bluetooth/charger-bluetooth' })
}

async function startCharge(gunNumber) {
  uni.showModal({
    title: '启动充电',
    content: `确认启动 ${gunNumber} 号枪？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await sendProtocolJson(createChargeControl(gunNumber, CHARGE_ACTION.START))
        uni.showToast({ title: '已发送', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    }
  })
}

async function stopCharge(gunNumber) {
  uni.showModal({
    title: '停止充电',
    content: `确认停止 ${gunNumber} 号枪？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await sendProtocolJson(createChargeControl(gunNumber, CHARGE_ACTION.STOP))
        uni.showToast({ title: '已发送', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '失败', icon: 'none' })
      }
    }
  })
}

async function queryFaults() {
  try {
    await sendProtocolJson(createFaultInfoQuery())
  } catch (e) {
    uni.showToast({ title: e.message || '查询失败', icon: 'none' })
    return false
  }
  return true
}

async function refreshFaults() {
  if (!isConnected.value) return
  faultLoading.value = true
  await queryFaults()
  await new Promise((r) => setTimeout(r, 450))
  faultLoading.value = false
}

function closeFaultSheet() {
  faultSheetVisible.value = false
  faultLoading.value = false
}

async function showFaultDetails() {
  faultSheetVisible.value = true
  if (isConnected.value) {
    await refreshFaults()
  }
}

onShow(() => {
  applyThemeUI('充电监控')
  if (isConnected.value) startHeartbeat()
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

.btn-link {
  background: #fff;
  color: #92400e;
  border: none;
  &::after { border: none; }
}

.sys-card {
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.sys-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.sys-model {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--theme-text-main);
  flex: 1;
}

.sys-time {
  font-size: 20rpx;
  color: var(--theme-text-sub);
  flex-shrink: 0;
}

.sys-highlight {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.sys-block {
  flex: 1;
  padding: 24rpx 20rpx;
  border-radius: 16rpx;
  text-align: center;
  &.online {
    background: rgba(34, 197, 94, 0.12);
    .sys-block-val { color: #16a34a; }
  }
  &.offline {
    background: rgba(107, 114, 128, 0.1);
    .sys-block-val { color: #6b7280; }
  }
  &.version {
    background: rgba(59, 130, 246, 0.1);
    .sys-block-val { color: var(--theme-primary); }
  }
}

.sys-block-val {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-all;
}

.sys-block-k {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.sys-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.sys-cell {
  width: calc(50% - 6rpx);
  padding: 16rpx 18rpx;
  background: var(--theme-input-bg);
  border-radius: 12rpx;
  box-sizing: border-box;
  &.wide { width: 100%; }
}

.sys-cell-k {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.sys-cell-v {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  word-break: break-all;
}

.fault-tip {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding: 20rpx 22rpx;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 14rpx;
  border: 1rpx solid rgba(239, 68, 68, 0.2);
}

.fault-tip-badge {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.fault-tip-text {
  flex: 1;
  min-width: 0;
}

.fault-tip-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #dc2626;
}

.fault-tip-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.fault-tip-arrow {
  font-size: 36rpx;
  color: #dc2626;
  flex-shrink: 0;
}

.empty {
  text-align: center;
  padding: 60rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.gun-card {
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.gun-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.gun-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.gun-bar-right {
  display: flex;
  gap: 10rpx;
}

.pill {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: rgba(59,130,246,.1);
  color: var(--theme-primary);
  &.charging { background: rgba(34,197,94,.12); color: #16a34a; }
  &.done { background: var(--theme-input-bg); color: var(--theme-text-sub); }
  &.idle { background: var(--theme-input-bg); color: var(--theme-text-sub); }
  &.muted { background: var(--theme-input-bg); color: var(--theme-text-sub); font-weight: 400; }
}

.core-row {
  display: flex;
  align-items: stretch;
  padding: 20rpx 0;
}

.core-item {
  flex: 1;
  text-align: center;
}

.core-val {
  font-size: 48rpx;
  font-weight: 800;
  color: var(--theme-text-main);
  line-height: 1.1;
}

.core-unit {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--theme-text-sub);
  margin-left: 4rpx;
}

.core-k {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.core-div {
  width: 1rpx;
  background: var(--theme-border-soft);
  margin: 8rpx 0;
}

.soc-bar {
  height: 8rpx;
  background: var(--theme-input-bg);
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.soc-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  border-radius: 4rpx;
  transition: width 0.3s;
}

.sub-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.sub-cell {
  width: calc(50% - 6rpx);
  padding: 12rpx 14rpx;
  background: var(--theme-input-bg);
  border-radius: 10rpx;
  box-sizing: border-box;
  &.wide { width: 100%; }
}

.sub-k {
  display: block;
  font-size: 20rpx;
  color: var(--theme-text-sub);
}

.sub-v {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: var(--theme-text-main);
  word-break: break-all;
}

.gun-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.act {
  flex: 1;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  &::after { border: none; }
  &.start { background: #22c55e; color: #fff; }
  &.stop { background: #f87171; color: #fff; }
}

.sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.sheet-panel {
  width: 100%;
  max-height: 78vh;
  background: var(--theme-card-bg);
  border-radius: 32rpx 32rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 20rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.sheet-head-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.sheet-badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 600;
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

.sheet-close {
  font-size: 36rpx;
  color: var(--theme-text-sub);
  padding: 8rpx 16rpx;
}

.sheet-scroll {
  max-height: 58vh;
  padding: 16rpx 24rpx 8rpx;
  box-sizing: border-box;
}

.sheet-state {
  padding: 48rpx 24rpx;
  text-align: center;
}

.sheet-state-text {
  display: block;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.sheet-retry {
  margin-top: 20rpx;
  background: var(--theme-primary);
  color: #fff;
  border: none;
  &::after { border: none; }
}

.sheet-foot {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 24rpx 24rpx;
  border-top: 1rpx solid var(--theme-border-soft);
}

.sheet-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  background: var(--theme-input-bg);
  color: var(--theme-text-main);
  border: none;
  &::after { border: none; }
  &.primary {
    background: var(--theme-primary);
    color: #fff;
  }
}

.fault-card {
  padding: 20rpx 22rpx;
  margin-bottom: 16rpx;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  border-left: 6rpx solid #ef4444;
}

.fault-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.fault-card-title {
  display: flex;
  align-items: baseline;
  gap: 10rpx;
  min-width: 0;
  flex: 1;
}

.fault-no {
  font-size: 22rpx;
  color: var(--theme-text-sub);
  flex-shrink: 0;
}

.fault-code {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--theme-text-main);
  word-break: break-all;
}

.fault-level {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
  &.critical { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
  &.warn { background: rgba(245, 158, 11, 0.15); color: #d97706; }
  &.info { background: rgba(59, 130, 246, 0.12); color: var(--theme-primary); }
  &.default { background: rgba(107, 114, 128, 0.12); color: #6b7280; }
}

.fault-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8rpx 12rpx;
  margin-bottom: 10rpx;
  &.desc { margin-bottom: 12rpx; }
  &.foot {
    margin-bottom: 0;
    gap: 10rpx;
  }
}

.fault-label {
  font-size: 22rpx;
  color: var(--theme-text-sub);
  flex-shrink: 0;
  &.time { margin-left: 8rpx; }
}

.fault-value {
  font-size: 24rpx;
  color: var(--theme-text-main);
  flex: 1;
  min-width: 0;
  word-break: break-all;
  &.time { flex: unset; }
  &.desc {
    flex: 1 1 100%;
    line-height: 1.5;
  }
}

.fault-tag {
  padding: 6rpx 14rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  line-height: 1.4;
  &.status {
    background: rgba(107, 114, 128, 0.12);
    color: var(--theme-text-sub);
  }
  &.action {
    background: rgba(59, 130, 246, 0.1);
    color: var(--theme-primary);
    flex: 1;
  }
}
</style>
