<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <text class="title">考研学习记录</text>
    <text class="tip">请使用底部 Tab：计划 · 今日 · 我的</text>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { applyThemeUI } from '@/utils/theme.js'
import { computed } from 'vue'
import { getThemeCssVars, themeSignal } from '@/utils/theme.js'

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

onShow(() => {
  applyThemeUI('首页')
  uni.switchTab({ url: '/pages/home/home' })
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background: var(--theme-page-bg);
}

.title {
  font-size: 40rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
  color: var(--theme-text-main);
}

.tip {
  font-size: 28rpx;
  color: var(--theme-text-sub);
}
</style>
