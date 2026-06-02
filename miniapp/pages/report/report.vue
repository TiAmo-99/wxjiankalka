<template>
  <theme-page-meta />
  <view />
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { applyThemeUI } from '@/utils/theme.js'

/** 旧「学习上报」路由，跳转到学习记录列表 */
onShow(() => {
  applyThemeUI('学习记录')
  uni.redirectTo({
    url: '/pages/report-history/report-history',
    fail: () => uni.switchTab({ url: '/pages/home/home' })
  })
})
</script>
