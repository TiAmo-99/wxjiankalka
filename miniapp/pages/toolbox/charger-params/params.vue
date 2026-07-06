<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view v-if="!isConnected" class="banner">
      <text>未连接蓝牙，请先连接设备后再查询参数。</text>
      <button class="btn-banner" size="mini" @tap="goConnect">去连接</button>
    </view>

    <view class="card">
      <text class="section-label">参数类型</text>
      <view class="type-picker" @tap="showTypeSheet = true">
        <view class="type-picker-left">
          <text class="type-picker-icon">{{ typeOptions[typeIndex].icon }}</text>
          <view class="type-picker-text">
            <text class="type-picker-title">{{ typeOptions[typeIndex].label }}</text>
            <text class="type-picker-sub">{{ typeOptions[typeIndex].key }}</text>
          </view>
        </view>
        <text class="type-picker-chevron">›</text>
      </view>

      <view class="query-actions">
        <button
          class="btn-query"
          :loading="paramState.loading"
          :disabled="!isConnected"
          @tap="onQuery"
        >
          查询参数
        </button>
        <button
          class="btn-save"
          :loading="modifying"
          :disabled="!isConnected || !hasEdits"
          @tap="onModify"
        >
          保存修改{{ hasEdits ? ` (${getModifiedParams().length})` : '' }}
        </button>
        <button class="btn-more" :disabled="!isConnected" @tap="showOpsSheet = true">其他操作</button>
      </view>

      <view v-if="modifyHint" class="modify-hint">{{ modifyHint }}</view>
    </view>

    <!-- 参数类型选择 -->
    <view v-if="showTypeSheet" class="sheet-mask" @tap="showTypeSheet = false">
      <view class="sheet-panel" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">选择参数类型</text>
          <text class="sheet-close" @tap="showTypeSheet = false">✕</text>
        </view>
        <scroll-view class="sheet-scroll" scroll-y>
          <view
            v-for="(opt, idx) in typeOptions"
            :key="opt.key"
            class="sheet-item"
            :class="{ active: idx === typeIndex }"
            @tap="selectType(idx)"
          >
            <text class="sheet-item-icon">{{ opt.icon }}</text>
            <view class="sheet-item-body">
              <text class="sheet-item-title">{{ opt.label }}</text>
              <text class="sheet-item-sub">{{ opt.key }}</text>
            </view>
            <text v-if="idx === typeIndex" class="sheet-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 其他操作 -->
    <view v-if="showOpsSheet" class="sheet-mask" @tap="showOpsSheet = false">
      <view class="sheet-panel ops" @tap.stop>
        <view class="sheet-head">
          <text class="sheet-title">其他操作</text>
          <text class="sheet-close" @tap="showOpsSheet = false">✕</text>
        </view>
        <text class="ops-warn">以下操作影响较大，请谨慎执行</text>
        <view class="ops-item" @tap="onOpsParamInit">
          <text class="ops-icon init">↺</text>
          <view class="ops-body">
            <text class="ops-title">参数初始化</text>
            <text class="ops-desc">恢复出厂默认参数，不可撤销</text>
          </view>
        </view>
        <view class="ops-item danger" @tap="onOpsReboot">
          <text class="ops-icon reboot">⏻</text>
          <view class="ops-body">
            <text class="ops-title">系统重启</text>
            <text class="ops-desc">重启设备，蓝牙将断开</text>
          </view>
        </view>
        <button class="ops-cancel" @tap="showOpsSheet = false">取消</button>
      </view>
    </view>

    <view v-if="!paramState.params.length && !paramState.loading" class="empty">
      <text>选择参数类型后点击「查询参数」</text>
    </view>

    <view v-if="paramState.loading && !paramState.params.length" class="empty">
      <text>正在查询，等待设备分包上送…</text>
    </view>

    <view v-if="paramState.params.length" class="list-card">
      <view class="list-head">
        <text class="summary">{{ listSummary }}</text>
        <text v-if="paramState.loading" class="loading-tag">接收中</text>
      </view>

      <view class="list-header">
        <text class="h-seq">序号</text>
        <text class="h-meta">参数名称 / 类型</text>
        <text class="h-value">数据</text>
      </view>

      <view
        v-for="(p, idx) in paramState.params"
        :key="p.name"
        class="param-row"
        :class="{ dirty: p.editValue !== p.value }"
      >
        <text class="cell-seq">{{ p.seq ?? idx + 1 }}</text>

        <view class="cell-meta">
          <view class="meta-line">
            <text class="meta-name">{{ p.name }}</text>
            <text class="meta-type">{{ p.type }}</text>
          </view>
          <text v-if="p.desc" class="meta-desc">{{ p.desc }}</text>
        </view>

        <view class="cell-value">
          <input
            class="value-input"
            :class="{ readonly: isReadonly }"
            :disabled="isReadonly"
            :value="p.editValue"
            @input="onEdit(idx, $event)"
          />
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { connection, paramState, beginParamQuery, finishParamQueryLoading, getModifiedParams } from '@/services/charger/charger-store.js'
import { sendProtocolJson, startHeartbeat } from '@/services/charger/charger-session.js'
import {
  PARAM_TYPES,
  createParamQuery,
  createParamModify,
  createParamInit,
  createReboot
} from '@/services/charger/protocol.js'
import { PARAM_TYPE_LABELS, PARAM_TYPE_ICONS } from '@/services/charger/charger-labels.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const typeIndex = ref(0)
const modifying = ref(false)
const showTypeSheet = ref(false)
const showOpsSheet = ref(false)
let requeryTimer = null
let queryWaitTimer = null

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isConnected = computed(() => connection.state === 'connected')

const typeOptions = PARAM_TYPES.map((key) => ({
  key,
  label: PARAM_TYPE_LABELS[key] || key,
  icon: PARAM_TYPE_ICONS[key] || '⚙️'
}))

const hasEdits = computed(() => getModifiedParams().length > 0)
const isReadonly = computed(() => paramState.queryType === 'FeeParameters')

const listSummary = computed(() => {
  const n = paramState.totalCount
  const pkt = paramState.packetsReceived
  if (!n) return '暂无数据'
  const parts = [`共 ${n} 项`]
  if (pkt > 1) parts.push(`${pkt} 包`)
  if (paramState.expectedTotal > n) parts.push(`预计 ${paramState.expectedTotal} 项`)
  return parts.join(' · ')
})

const modifyHint = computed(() => {
  const m = paramState.lastModify
  if (!m?.type) return ''
  return `修改结果：成功 ${m.success} / 失败 ${m.failed}（接收 ${m.received}）`
})

watch(
  () => paramState.packetsReceived,
  () => {
    if (!paramState.loading) return
    scheduleQueryDone()
  }
)

watch(
  () => paramState.lastModify,
  (m) => {
    if (!m || m.success <= 0) return
    if (requeryTimer) clearTimeout(requeryTimer)
    requeryTimer = setTimeout(() => onQuery(), 1000)
  }
)

function currentType() {
  return PARAM_TYPES[typeIndex.value] || PARAM_TYPES[0]
}

function selectType(idx) {
  typeIndex.value = idx
  showTypeSheet.value = false
}

function onOpsParamInit() {
  showOpsSheet.value = false
  onParamInit()
}

function onOpsReboot() {
  showOpsSheet.value = false
  onReboot()
}

function onEdit(idx, e) {
  if (isReadonly.value) return
  const p = paramState.params[idx]
  if (!p) return
  paramState.params[idx] = { ...p, editValue: e.detail.value }
}

function goConnect() {
  uni.navigateTo({ url: '/pages/toolbox/charger-bluetooth/charger-bluetooth' })
}

function clearQueryWaitTimer() {
  if (queryWaitTimer) {
    clearTimeout(queryWaitTimer)
    queryWaitTimer = null
  }
}

function scheduleQueryDone() {
  clearQueryWaitTimer()
  queryWaitTimer = setTimeout(() => {
    finishParamQueryLoading()
    if (paramState.packetsReceived === 0) {
      uni.showToast({ title: '未收到参数应答', icon: 'none' })
    }
    queryWaitTimer = null
  }, 4500)
}

async function onQuery() {
  if (!isConnected.value) {
    uni.showToast({ title: '请先连接蓝牙', icon: 'none' })
    return
  }
  const type = currentType()
  beginParamQuery(type)
  scheduleQueryDone()

  try {
    await sendProtocolJson(createParamQuery(type))
  } catch (e) {
    finishParamQueryLoading()
    clearQueryWaitTimer()
    uni.showToast({ title: e.message || '查询失败', icon: 'none' })
  }
}

async function onModify() {
  const changed = getModifiedParams()
  if (!changed.length) return
  const type = paramState.queryType || currentType()
  modifying.value = true
  try {
    await sendProtocolJson(
      createParamModify(
        type,
        changed.map((p) => ({ name: p.name, type: p.type, value: p.editValue }))
      )
    )
    uni.showToast({ title: '已发送修改', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: e.message || '修改失败', icon: 'none' })
  } finally {
    modifying.value = false
  }
}

function onReboot() {
  uni.showModal({
    title: '确认系统重启',
    content: '设备将立即重启，蓝牙连接会断开。确定继续？',
    confirmText: '确认重启',
    confirmColor: '#dc2626',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await sendProtocolJson(createReboot())
        uni.showToast({ title: '已发送重启', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '发送失败', icon: 'none' })
      }
    }
  })
}

function onParamInit() {
  uni.showModal({
    title: '确认参数初始化',
    content: '将恢复为出厂默认参数，所有自定义配置丢失，不可撤销。确定继续？',
    confirmText: '确认初始化',
    confirmColor: '#dc2626',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await sendProtocolJson(createParamInit())
        uni.showToast({ title: '已发送初始化', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: e.message || '发送失败', icon: 'none' })
      }
    }
  })
}

onShow(() => {
  applyThemeUI('参数配置')
  if (isConnected.value) startHeartbeat()
})

onUnload(() => {
  clearQueryWaitTimer()
  if (requeryTimer) clearTimeout(requeryTimer)
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
  background: rgba(239, 68, 68, 0.08);
  border: 1rpx solid rgba(239, 68, 68, 0.2);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: #dc2626;
  line-height: 1.5;
}

.btn-banner {
  margin-top: 12rpx;
  background: #ef4444;
  color: #fff;
  border: none;
  &::after {
    border: none;
  }
}

.card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.section-label {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  margin-bottom: 12rpx;
}

.type-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, var(--theme-input-bg) 0%, var(--theme-card-bg) 100%);
  border: 2rpx solid var(--theme-border-soft);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.type-picker-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
  min-width: 0;
}

.type-picker-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 36rpx;
  background: var(--theme-card-bg);
  border-radius: 18rpx;
  flex-shrink: 0;
}

.type-picker-text {
  flex: 1;
  min-width: 0;
}

.type-picker-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.type-picker-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.type-picker-chevron {
  font-size: 40rpx;
  color: #c4c9d4;
  flex-shrink: 0;
  margin-left: 12rpx;
}

.query-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 28rpx;
}

.btn-query,
.btn-save {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 18rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  &::after {
    border: none;
  }
}

.btn-query {
  background: var(--theme-primary);
  color: #fff;
}

.btn-save {
  background: #f59e0b;
  color: #fff;

  &[disabled] {
    background: var(--theme-input-bg);
    color: var(--theme-text-sub);
  }
}

.btn-more {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 18rpx;
  font-size: 28rpx;
  color: var(--theme-text-sub);
  background: var(--theme-input-bg);
  border: none;
  &::after {
    border: none;
  }
  &[disabled] {
    opacity: 0.45;
  }
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
  max-height: 75vh;
  background: var(--theme-card-bg);
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 0 env(safe-area-inset-bottom);
  box-sizing: border-box;

  &.ops {
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  }
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx 16rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.sheet-close {
  font-size: 36rpx;
  color: var(--theme-text-sub);
  padding: 8rpx 16rpx;
}

.sheet-scroll {
  max-height: 60vh;
}

.sheet-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.active {
    background: rgba(59, 130, 246, 0.06);
  }
}

.sheet-item-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 36rpx;
  background: var(--theme-input-bg);
  border-radius: 18rpx;
  flex-shrink: 0;
}

.sheet-item-body {
  flex: 1;
  min-width: 0;
}

.sheet-item-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.sheet-item-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.sheet-check {
  font-size: 32rpx;
  color: var(--theme-primary);
  font-weight: 700;
}

.ops-warn {
  display: block;
  padding: 16rpx 32rpx;
  font-size: 24rpx;
  color: #d97706;
  background: rgba(245, 158, 11, 0.08);
}

.ops-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin: 16rpx 28rpx 0;
  padding: 28rpx 24rpx;
  border-radius: 18rpx;
  background: var(--theme-input-bg);

  &.danger {
    background: rgba(239, 68, 68, 0.06);
    border: 1rpx solid rgba(239, 68, 68, 0.15);
  }
}

.ops-icon {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 32rpx;
  border-radius: 16rpx;
  flex-shrink: 0;

  &.init {
    background: rgba(245, 158, 11, 0.15);
    color: #d97706;
  }
  &.reboot {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }
}

.ops-body {
  flex: 1;
}

.ops-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.ops-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.ops-cancel {
  margin: 24rpx 28rpx 0;
  height: 88rpx;
  line-height: 88rpx;
  background: var(--theme-input-bg);
  color: var(--theme-text-main);
  border-radius: 18rpx;
  font-size: 30rpx;
  border: none;
  &::after {
    border: none;
  }
}

.modify-hint {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #16a34a;
}

.empty {
  text-align: center;
  padding: 80rpx 24rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.list-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
  overflow: hidden;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.summary {
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.loading-tag {
  font-size: 22rpx;
  color: var(--theme-primary);
}

.list-header {
  display: flex;
  align-items: center;
  padding: 14rpx 20rpx;
  background: var(--theme-input-bg);
  font-size: 22rpx;
  font-weight: 600;
  color: var(--theme-text-sub);
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.h-seq {
  width: 64rpx;
  flex-shrink: 0;
  text-align: center;
}

.h-meta {
  flex: 1;
  min-width: 0;
  padding-right: 16rpx;
}

.h-value {
  width: 240rpx;
  flex-shrink: 0;
  text-align: center;
}

.param-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 18rpx 20rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
  box-sizing: border-box;

  &.dirty {
    background: rgba(245, 158, 11, 0.06);
  }

  &:last-child {
    border-bottom: none;
  }
}

.cell-seq {
  width: 64rpx;
  flex-shrink: 0;
  text-align: center;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-sub);
}

.cell-meta {
  flex: 1;
  min-width: 0;
  padding-right: 16rpx;
}

.meta-line {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.meta-name {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  word-break: break-all;
}

.meta-type {
  font-size: 20rpx;
  color: var(--theme-text-sub);
  background: var(--theme-input-bg);
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.meta-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  line-height: 1.45;
  word-break: break-all;
}

.cell-value {
  width: 240rpx;
  flex-shrink: 0;
}

.value-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 72rpx;
  padding: 14rpx 16rpx;
  background: var(--theme-input-bg);
  border-radius: 10rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
  text-align: left;

  &.readonly {
    opacity: 0.65;
  }
}
</style>
