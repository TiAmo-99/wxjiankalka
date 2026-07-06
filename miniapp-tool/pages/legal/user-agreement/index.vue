<template>
  <view class="legal-page" :style="themeVars">
    <view class="doc">
      <text class="title">用户服务协议</text>
      <text class="meta">更新日期：2026年6月2日 · 生效日期：2026年6月2日</text>

      <text class="p">欢迎使用「考研学习记录」小程序及相关服务。请您在注册、登录或使用前仔细阅读本协议。点击同意或完成注册，即表示您已阅读并同意受本协议约束。</text>

      <text class="h2">一、服务说明</text>
      <text class="p">本小程序向考研学员提供学习计划查看、学习任务管理、学习记录上报、学习统计、备忘录、工具箱（如计算器、二维码等，部分功能需权限等级）及账号相关服务。服务内容由运营方根据实际情况提供或调整。</text>

      <text class="h2">二、账号注册与使用</text>
      <text class="p">1. 您应提供真实、准确的注册信息（如手机号、昵称等），并妥善保管账号与密码（App 端）。</text>
      <text class="p">2. 微信小程序用户可通过微信授权登录；您理解并同意我们为完成登录需使用微信提供的必要标识信息。</text>
      <text class="p">3. 账号仅限您本人使用，不得转让、出借或用于违法违规活动。</text>

      <text class="h2">三、用户行为规范</text>
      <text class="p">您不得利用本服务从事违反法律法规、侵犯他人权益、干扰系统正常运行等行为。我们有权对违规账号采取限制功能、暂停或终止服务等措施。</text>

      <text class="h2">四、知识产权</text>
      <text class="p">本小程序的界面、文案、代码等知识产权归运营方或权利人所有。您上传的学习内容等合法权利仍归您所有，但您授权我们在提供服务所必需的范围内存储、展示与处理。</text>

      <text class="h2">五、隐私保护</text>
      <text class="p">我们如何处理个人信息，详见《隐私政策》。注册或使用服务前，请您务必阅读并同意《隐私政策》。</text>

      <text class="h2">六、免责声明</text>
      <text class="p">因网络、设备、不可抗力或第三方原因导致的服务中断、数据延迟等，我们将尽力修复但不承担超出法律规定的责任。学习数据仅供参考，不构成任何录取或成绩承诺。</text>

      <text class="h2">七、协议变更与终止</text>
      <text class="p">我们可能修订本协议，并通过小程序内公示。您可停止使用并申请注销；我们也可在法律法规允许范围内终止或限制服务。</text>

      <text class="h2">八、联系我们</text>
      <text class="p">运营方：考研学习记录系统</text>
      <text class="p">联系邮箱：jiankalka@qq.com</text>
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
  applyThemeUI('用户服务协议')
})
</script>

<style lang="scss" scoped>
.legal-page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
}

.doc {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--theme-text-main);
  margin-bottom: 12rpx;
}

.meta {
  display: block;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  margin-bottom: 28rpx;
}

.h2 {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  margin: 28rpx 0 12rpx;
}

.p {
  display: block;
  font-size: 26rpx;
  line-height: 1.65;
  color: var(--theme-text-sub);
  margin-bottom: 12rpx;
}
</style>
