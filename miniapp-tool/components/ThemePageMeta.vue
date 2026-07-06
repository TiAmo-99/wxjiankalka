<template>
  <page-meta
    :navigation-bar-background-color="meta.navBg"
    :navigation-bar-text-style="meta.navTextStyle"
    :background-color="meta.pageBg"
    :background-color-top="meta.pageBg"
    :background-color-bottom="meta.pageBg"
  />
</template>

<script setup>
import { computed } from 'vue'
import { getTheme, themeSignal } from '@/utils/theme.js'

const meta = computed(() => {
  themeSignal.value
  const t = getTheme()
  const c = t.colors
  return {
    navBg: c.navBg,
    navTextStyle: c.navFrontColor === '#ffffff' ? 'white' : 'black',
    pageBg: c.pageBg
  }
})
</script>
