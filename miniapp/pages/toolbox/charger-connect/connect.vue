<template>
  <view class="redirect-hint">正在进入蓝牙调试…</view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'

onShow(() => {
  uni.redirectTo({ url: '/pages/toolbox/charger-menu/charger-menu' })
})
</script>

<style scoped>
.redirect-hint {
  padding: 80rpx;
  text-align: center;
  color: #6b7280;
  font-size: 28rpx;
}
</style>
