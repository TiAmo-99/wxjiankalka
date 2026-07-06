<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <text class="hero-title">简卡拉卡Tool</text>
      <text class="hero-desc">充电桩蓝牙运维与现场调试</text>
      <view class="perm-badge">
        <text>当前权限 L{{ permLevel }}</text>
      </view>
    </view>

    <text class="section-label">通用工具</text>
    <view class="tool-list">
      <view class="tool-card" @click="goCalculator">
        <view class="tool-icon calc">🔢</view>
        <view class="tool-body">
          <text class="tool-name">计算器</text>
          <text class="tool-desc">四则运算 · 全员可用</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="tool-card" @click="goQrcode">
        <view class="tool-icon qr">📷</view>
        <view class="tool-body">
          <text class="tool-name">二维码</text>
          <text class="tool-desc">扫码解码 · 文字生成二维码</text>
        </view>
        <view v-if="!qrcodeOk" class="lock-tag">L1+</view>
        <text v-else class="arrow">›</text>
      </view>
    </view>

    <text class="section-label">运维调试</text>
    <view class="tool-list">
      <view class="tool-card" @click="goCharger">
        <view class="tool-icon charger">⚡</view>
        <view class="tool-body">
          <text class="tool-name">充电桩蓝牙调试</text>
          <text class="tool-desc">蓝牙连接、设备信息与运维调试</text>
        </view>
        <view v-if="!toolboxOk" class="lock-tag">L3+</view>
        <text v-else class="arrow">›</text>
      </view>

      <view class="tool-card" @click="goOps">
        <view class="tool-icon ops">🛠</view>
        <view class="tool-body">
          <text class="tool-name">运维平台调试</text>
          <text class="tool-desc">充电站 / 充电桩信息查询</text>
        </view>
        <view v-if="!toolboxOk" class="lock-tag">L3+</view>
        <text v-else class="arrow">›</text>
      </view>
    </view>

    <view class="tip-card">
      <text>计算器：权限 L0 可用。二维码：L1 及以上。运维调试：L3 及以上。可在「我的 → 权限申请」开通。</text>
    </view>
  </scroll-view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import {
  canUseQrcode,
  canUseToolbox,
  requireQrcode,
  requireToolbox
} from '@/utils/permission.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const permLevel = ref(0)
const toolboxOk = ref(false)
const qrcodeOk = ref(false)
const themeVars = ref(getThemeCssVars())

async function loadPerm() {
  try {
    const me = await request({ url: '/auth/me', showError: false })
    permLevel.value = me?.permLevel ?? 0
  } catch (e) {
    permLevel.value = 0
  }
  toolboxOk.value = canUseToolbox(permLevel.value)
  qrcodeOk.value = canUseQrcode(permLevel.value)
}

function goCalculator() {
  uni.navigateTo({ url: '/pages/toolbox/calculator/calculator' })
}

function goQrcode() {
  if (!requireQrcode(permLevel.value)) return
  uni.navigateTo({ url: '/pages/toolbox/qrcode/qrcode' })
}

function goCharger() {
  if (!requireToolbox(permLevel.value)) return
  uni.navigateTo({ url: '/pages/toolbox/charger-menu/charger-menu' })
}

function goOps() {
  if (!requireToolbox(permLevel.value)) return
  uni.navigateTo({ url: '/pages/toolbox/ops-platform/ops-platform' })
}

onShow(loadPerm)
onShow(() => {
  themeSignal.value
  themeVars.value = getThemeCssVars()
  applyThemeUI('简卡拉卡Tool')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx;
  box-sizing: border-box;
}

.hero {
  background: var(--theme-hero-gradient);
  border-radius: 28rpx;
  padding: 40rpx 32rpx;
  color: #fff;
  margin-bottom: 24rpx;
  box-shadow: 0 12rpx 40rpx rgba(30, 41, 59, 0.35);
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

.perm-badge {
  display: inline-flex;
  margin-top: 20rpx;
  padding: 10rpx 20rpx;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999rpx;
  font-size: 22rpx;
}

.section-label {
  display: block;
  margin: 8rpx 0 12rpx 8rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.tool-card {
  display: flex;
  align-items: center;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(30, 40, 80, 0.06);
}

.tool-icon {
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 22rpx;
  font-size: 40rpx;
  margin-right: 24rpx;

  &.calc {
    background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  }

  &.qr {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  }

  &.charger {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
  }

  &.ops {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  }
}

.tool-body {
  flex: 1;
  min-width: 0;
}

.tool-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.tool-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.lock-tag {
  font-size: 22rpx;
  color: var(--theme-primary);
  background: var(--theme-input-bg);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

.arrow {
  color: #d1d5db;
  font-size: 36rpx;
  margin-left: 8rpx;
}

.tip-card {
  margin-top: 8rpx;
  padding: 24rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.6;
}
</style>
