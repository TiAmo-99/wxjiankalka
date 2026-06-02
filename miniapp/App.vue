<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { applyThemeForCurrentPage } from '@/utils/theme.js'

onLaunch(() => {
  console.log('App Launch')
  applyThemeForCurrentPage()
})

onShow(() => {
  console.log('App Show')
  applyThemeForCurrentPage()
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import '@/uni.scss';

page {
  background-color: $uni-bg-color;
  font-size: $uni-font-size-base;
  color: $uni-text-color;
  box-sizing: border-box;
}

view,
text {
  box-sizing: border-box;
}
</style>
