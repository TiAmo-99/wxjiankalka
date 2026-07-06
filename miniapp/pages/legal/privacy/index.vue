<template>
  <view class="legal-page" :style="themeVars">
    <view class="doc">
      <text class="title">隐私政策</text>
      <text class="meta">更新日期：2026年6月2日 · 生效日期：2026年6月2日</text>

      <text class="p">「考研学习记录」（以下简称「本小程序」）由运营方提供，用于考研学员的学习计划管理、学习记录上报及相关工具服务。我们重视您的个人信息保护，并依据相关法律法规制定本政策。</text>

      <text class="h2">一、我们收集的信息</text>
      <text class="p">在您注册、登录及使用服务过程中，我们可能收集以下信息：</text>
      <text class="p">1. 账号信息：昵称、手机号码；选填的真实姓名、邮箱、学习目标、个性签名等您主动填写的内容。</text>
      <text class="p">2. 微信登录信息（仅微信小程序）：经您授权后，通过微信接口获取的 openid 等标识，用于识别账号、实现登录，不用于其他目的。</text>
      <text class="p">3. 学习业务数据：学习计划、学习任务、学习上报记录、统计数据、备忘录、权限等级等您使用功能产生的数据。</text>
      <text class="p">4. 设备与日志：为保障服务安全与稳定，服务器可能记录接口访问时间、错误日志等，一般不直接识别到具体个人身份。</text>
      <text class="p">5. 蓝牙与位置（仅在使用「充电桩蓝牙调试」工具时）：经您授权后，使用蓝牙扫描、连接附近充电桩设备；在 Android 设备上扫描蓝牙时，系统可能要求开启定位权限，我们仅用于发现蓝牙设备，不用于追踪您的地理位置。</text>

      <text class="h2">二、信息的使用目的与方式</text>
      <text class="p">我们收集上述信息用于：</text>
      <text class="p">· 创建和管理您的学员账号；</text>
      <text class="p">· 同步与展示学习计划、学习记录及统计；</text>
      <text class="p">· 在您开启时通过邮箱发送学习提醒；</text>
      <text class="p">· 处理权限申请、机构管理及相关客服；</text>
      <text class="p">· 改进产品体验、保障系统安全与合规运营。</text>
      <text class="p">我们不会将您的个人信息出售给第三方。未经您同意，不会用于与本政策无关的营销。</text>

      <text class="h2">三、信息的存储与保护</text>
      <text class="p">您的数据存储于中华人民共和国境内的服务器（如 server.jiankalka.cn），采取合理的技术与管理措施防止未经授权的访问、泄露或篡改。我们会在实现目的所必需的期限内保留信息；您注销或删除账号后，将按规则删除或匿名化处理。</text>

      <text class="h2">四、信息的共享与披露</text>
      <text class="p">除以下情形外，我们不会向第三方共享您的个人信息：</text>
      <text class="p">· 经您明确同意；</text>
      <text class="p">· 法律法规要求或行政、司法机关依法要求；</text>
      <text class="p">· 为完成微信登录等必要功能，与腾讯微信按平台规则处理的最小必要信息（如 openid）。</text>

      <text class="h2">五、您的权利</text>
      <text class="p">您有权查询、更正个人资料（「我的」-「个人资料」），有权退出登录、停止使用服务。如需删除账号或导出数据，可通过本政策所列联系方式与我们联系，我们将在合理期限内处理。</text>

      <text class="h2">六、未成年人保护</text>
      <text class="p">若您为未成年人，请在监护人指导下阅读本政策并使用服务。我们不会主动面向未满14周岁儿童收集个人信息。</text>

      <text class="h2">七、政策更新</text>
      <text class="p">我们可能适时修订本政策，修订后将通过小程序内页面公示。若涉及重大变更，将以适当方式提示您重新阅读并确认。</text>

      <text class="h2">八、联系我们</text>
      <text class="p">如对本政策有疑问、意见或投诉，请通过以下方式联系：</text>
      <text class="p">运营方：考研学习记录系统</text>
      <text class="p">联系邮箱：jiankalka@qq.com</text>
      <text class="p">我们将在15个工作日内予以回复。</text>
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
  applyThemeUI('隐私政策')
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
