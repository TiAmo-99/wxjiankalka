<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <view class="empty-card">
      <text class="icon">⚡</text>
      <text class="title">充电桩蓝牙调试</text>
      <text class="desc">功能开发中，敬请期待</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

onShow(() => {
  applyThemeUI('充电桩蓝牙调试')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 48rpx 28rpx;
  box-sizing: border-box;
}

.empty-card {
  background: var(--theme-card-bg);
  border-radius: 28rpx;
  padding: 80rpx 40rpx;
  text-align: center;
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.05);
}

.icon {
  display: block;
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}
</style>
