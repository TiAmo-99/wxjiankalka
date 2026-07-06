<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <view class="card">
      <text class="icon">🚧</text>
      <text class="title">{{ pageTitle }}</text>
      <text class="desc">该功能正在规划中，后续版本开放。请先使用「蓝牙连接与收发」与「充电桩信息」。</text>
      <button class="btn" @tap="goHub">返回功能首页</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const STUB_TITLES = {
  params: '参数配置',
  history: '历史记录',
  firmware: '固件升级'
}

const pageKey = ref('params')
const pageTitle = computed(() => STUB_TITLES[pageKey.value] || '功能预留')

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

onLoad((query) => {
  if (query?.key) pageKey.value = query.key
})

function goHub() {
  uni.navigateTo({ url: '/pages/toolbox/charger-menu/charger-menu' })
}

onShow(() => {
  applyThemeUI(pageTitle.value)
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 48rpx 32rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 100%;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 48rpx 36rpx;
  text-align: center;
  border: 1rpx solid var(--theme-border-soft);
}

.icon {
  display: block;
  font-size: 64rpx;
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
  margin-top: 20rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.6;
}

.btn {
  margin-top: 40rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 16rpx;
  border: none;
  &::after {
    border: none;
  }
}
</style>
