<template>
  <view />
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'

onShow(() => {
  uni.redirectTo({ url: '/pages/toolbox/charger-monitor/monitor' })
})
</script>
