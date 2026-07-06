<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { applyThemeForCurrentPage } from '@/utils/theme.js'
import { hasLegalConsent, openPrivacyPolicy, openUserAgreement } from '@/utils/legal.js'
import { setupWxPrivacyListener } from '@/utils/wx-privacy.js'

function showFirstLaunchLegalTip() {
  // #ifdef MP-WEIXIN
  if (hasLegalConsent()) return
  uni.showModal({
    title: '隐私保护提示',
    content:
      '欢迎使用考研学习记录。我们将按照《隐私政策》收集和使用您的信息（如手机号、昵称等）以提供学习服务。注册前请阅读并同意《用户服务协议》和《隐私政策》。',
    confirmText: '查看隐私政策',
    cancelText: '查看用户协议',
    success(res) {
      if (res.confirm) openPrivacyPolicy()
      else if (res.cancel) openUserAgreement()
    }
  })
  // #endif
}

onLaunch(() => {
  console.log('App Launch')
  setupWxPrivacyListener()
  applyThemeForCurrentPage()
  showFirstLaunchLegalTip()
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
