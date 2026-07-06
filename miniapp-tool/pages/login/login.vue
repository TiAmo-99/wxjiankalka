<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <view class="hero">
      <text class="hero-title">登录</text>
      <text class="hero-desc">使用手机号与密码登录；微信小程序用户也可选择微信登录</text>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="label">手机号</text>
        <input
          v-model="form.phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="11 位手机号"
        />
      </view>

      <view class="field pwd-field">
        <text class="label">密码</text>
        <input
          v-model="form.password"
          class="input input-pwd"
          :password="!showPwd"
          maxlength="64"
          placeholder="请输入密码"
        />
        <text class="toggle-pwd" @tap="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
      </view>

      <legal-agree-bar :model-value="agreedLegal" @update:model-value="setAgreedLegal" @change="setAgreedLegal" />

      <!-- #ifdef MP-WEIXIN -->
      <button
        id="login-phone-privacy-btn"
        class="btn-submit"
        :class="{ disabled: submitting || !agreedLegal }"
        :loading="submitting"
        open-type="agreePrivacyAuthorization"
        @agreeprivacyauthorization="onSubmitPrivacy"
        @tap="onSubmitTap"
      >
        登录
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button
        class="btn-submit"
        :class="{ disabled: submitting || !agreedLegal }"
        :loading="submitting"
        @tap="onSubmit"
      >
        登录
      </button>
      <!-- #endif -->

      <view class="foot-link" @tap="goRegister">
        <text>没有账号？去注册</text>
      </view>
      <view class="foot-link secondary" @tap="goSetPassword">
        <text>{{ setPasswordHint }}</text>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <button
        id="login-wx-privacy-btn"
        class="btn-wx"
        open-type="agreePrivacyAuthorization"
        :class="{ disabled: wxLoading || submitting || !agreedLegal }"
        :loading="wxLoading"
        @agreeprivacyauthorization="onWxLogin"
        @tap="onWxLoginTap"
      >
        微信一键登录
      </button>
      <!-- #endif -->
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { phoneLogin, wxLogin } from '@/utils/auth.js'
import { usePhoneAuth } from '@/utils/platform.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { setLegalConsent } from '@/utils/legal.js'
import { goAfterAuthSuccess } from '@/utils/nav.js'
import { queryWxPrivacyStatus, confirmWxPrivacyAfterButton } from '@/utils/wx-privacy.js'
import LegalAgreeBar from '@/components/LegalAgreeBar.vue'

const submitting = ref(false)
const wxLoading = ref(false)
const showPwd = ref(false)
const agreedLegal = ref(false)
const phoneAuth = usePhoneAuth()
const form = ref({
  phone: '',
  password: ''
})

const setPasswordHint = computed(() =>
  phoneAuth ? '忘记密码？联系管理员重置' : '微信注册账号？先设置密码再登录'
)

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

function goRegister() {
  uni.redirectTo({ url: '/pages/register/register' })
}

function goSetPassword() {
  const phone = String(form.value.phone).trim()
  const q = phone ? `?phone=${encodeURIComponent(phone)}` : ''
  uni.navigateTo({ url: `/pages/set-password/set-password${q}` })
}

function setAgreedLegal(v) {
  agreedLegal.value = !!v
}

function ensureLegalAgreed() {
  if (agreedLegal.value) return true
  uni.showToast({ title: '请先阅读并同意用户协议与隐私政策', icon: 'none' })
  return false
}

function onWxLoginTap() {
  if (!ensureLegalAgreed()) return
}

/** 微信官方隐私授权（open-type=agreePrivacyAuthorization）成功后执行登录 */
async function onWxLogin(e) {
  if (wxLoading.value) return
  if (!ensureLegalAgreed()) return

  const errMsg = String(e?.detail?.errMsg || '')
  if (errMsg && !errMsg.includes('ok')) {
    uni.showToast({ title: '需同意微信隐私协议后才能登录', icon: 'none' })
    return
  }

  const privacy = await confirmWxPrivacyAfterButton(e, 'login-wx-privacy-btn')
  if (!privacy.ok) {
    uni.showToast({ title: privacy.reason || '需同意微信隐私协议', icon: 'none' })
    return
  }

  wxLoading.value = true
  try {
    await wxLogin()
    setLegalConsent()
    uni.showToast({ title: '登录成功', icon: 'success' })
    goAfterAuthSuccess()
  } catch (err) {
    if (err?.code === 30001) {
      uni.showModal({
        title: '尚未注册',
        content: '该微信还未注册，请先完成注册',
        confirmText: '去注册',
        success: (res) => {
          if (res.confirm) goRegister()
        }
      })
      return
    }
    uni.showToast({ title: err?.message || '登录失败', icon: 'none' })
  } finally {
    wxLoading.value = false
  }
}

async function onSubmitTap() {
  if (submitting.value) return
  if (!ensureLegalAgreed()) return
  const { needAuthorization } = await queryWxPrivacyStatus()
  if (!needAuthorization) {
    onSubmit()
  }
}

async function onSubmitPrivacy(e) {
  const privacy = await confirmWxPrivacyAfterButton(e, 'login-phone-privacy-btn')
  if (!privacy.ok) {
    uni.showToast({ title: privacy.reason || '需同意微信隐私协议', icon: 'none' })
    return
  }
  onSubmit()
}

async function onSubmit() {
  if (submitting.value) return
  if (!ensureLegalAgreed()) return
  const phone = String(form.value.phone).trim()
  const password = form.value.password

  if (!/^1\d{10}$/.test(phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }
  if (!password || password.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await phoneLogin({ phone, password })
    setLegalConsent()
    uni.showToast({ title: '登录成功', icon: 'success' })
    goAfterAuthSuccess()
  } catch (e) {
    if (e?.code === 30009) {
      uni.showModal({
        title: '尚未设置密码',
        content: '该账号在微信小程序注册，需先设置密码后再使用密码登录',
        confirmText: '去设置',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({
              url: `/pages/set-password/set-password?phone=${encodeURIComponent(phone)}`
            })
          }
        }
      })
      return
    }
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  applyThemeUI('登录')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 32rpx;
  box-sizing: border-box;
}

.hero {
  padding: 24rpx 8rpx 32rpx;
}

.hero-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.hero-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
}

.form-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 32rpx 28rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(79, 110, 247, 0.08);
}

.field {
  margin-bottom: 28rpx;
  position: relative;
}

.label {
  display: block;
  font-size: 26rpx;
  color: var(--theme-text-main);
  margin-bottom: 12rpx;
}

.input {
  height: 88rpx;
  padding: 0 24rpx;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  font-size: 28rpx;
  border: 2rpx solid var(--theme-border-soft);
  box-sizing: border-box;
}

.input-pwd {
  padding-right: 100rpx;
}

.toggle-pwd {
  position: absolute;
  right: 24rpx;
  bottom: 28rpx;
  font-size: 24rpx;
  color: var(--theme-primary);
}

@import '@/styles/buttons.scss';

.btn-submit {
  margin-top: 16rpx;
}

.foot-link {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--theme-primary);
}

.foot-link.secondary {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.btn-wx {
  margin-top: 28rpx;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 16rpx;
  font-size: 28rpx;
  height: 88rpx;
  line-height: 88rpx;

  &::after {
    border: none;
  }

  &.disabled {
    opacity: 0.72;
  }
}
</style>
