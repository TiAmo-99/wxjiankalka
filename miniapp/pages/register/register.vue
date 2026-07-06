<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <view class="hero">
      <text class="hero-title">注册账号</text>
      <text class="hero-desc">{{ heroDesc }}</text>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="label">昵称 <text class="req">*</text></text>
        <input
          v-model="form.nickname"
          class="input"
          type="nickname"
          maxlength="20"
          placeholder="2～20 个字符，将展示在「我的」"
        />
      </view>

      <view class="field">
        <text class="label">手机号 <text class="req">*</text></text>
        <input
          v-model="form.phone"
          class="input"
          type="number"
          maxlength="11"
          placeholder="11 位手机号"
        />
      </view>

      <view v-if="phoneAuth" class="field pwd-field">
        <text class="label">密码 <text class="req">*</text></text>
        <input
          v-model="form.password"
          class="input input-pwd"
          :password="!showPwd"
          maxlength="64"
          placeholder="6～64 位，请牢记"
        />
        <text class="toggle-pwd" @tap="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
      </view>

      <view v-if="phoneAuth" class="field pwd-field">
        <text class="label">确认密码 <text class="req">*</text></text>
        <input
          v-model="form.password2"
          class="input input-pwd"
          :password="!showPwd2"
          maxlength="64"
          placeholder="再次输入密码"
        />
        <text class="toggle-pwd" @tap="showPwd2 = !showPwd2">{{ showPwd2 ? '隐藏' : '显示' }}</text>
      </view>

      <view class="field">
        <text class="label">姓名（选填）</text>
        <input
          v-model="form.realName"
          class="input"
          maxlength="20"
          placeholder="真实姓名，便于机构识别"
        />
      </view>

      <legal-agree-bar :model-value="agreedLegal" @update:model-value="setAgreedLegal" @change="setAgreedLegal" />

      <!-- #ifdef MP-WEIXIN -->
      <button
        id="register-privacy-btn"
        class="btn-submit"
        :class="{ disabled: submitting || !agreedLegal }"
        :loading="submitting"
        open-type="agreePrivacyAuthorization"
        @agreeprivacyauthorization="onSubmitPrivacy"
        @tap="onSubmitTap"
      >
        注册并登录
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button
        class="btn-submit"
        :class="{ disabled: submitting || !agreedLegal }"
        :loading="submitting"
        @tap="onSubmit"
      >
        注册并登录
      </button>
      <!-- #endif -->

      <view class="foot-link" @tap="goLogin">
        <text>{{ phoneAuth ? '已有账号？去登录' : '已有账号？返回登录' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { wxRegister, wxLogin, phoneRegister } from '@/utils/auth.js'
import { usePhoneAuth } from '@/utils/platform.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { setLegalConsent } from '@/utils/legal.js'
import { goAfterAuthSuccess, goTabBar } from '@/utils/nav.js'
import { queryWxPrivacyStatus, confirmWxPrivacyAfterButton } from '@/utils/wx-privacy.js'
import LegalAgreeBar from '@/components/LegalAgreeBar.vue'

const phoneAuth = usePhoneAuth()
const agreedLegal = ref(false)
const submitting = ref(false)
const showPwd = ref(false)
const showPwd2 = ref(false)

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const heroDesc = computed(() =>
  phoneAuth
    ? '使用手机号与密码注册，适用于 App 端'
    : '绑定微信并填写信息，用于同步学习计划与学习记录'
)

const form = ref({
  nickname: '',
  phone: '',
  password: '',
  password2: '',
  realName: ''
})

function setAgreedLegal(v) {
  agreedLegal.value = !!v
}

function goLogin() {
  if (phoneAuth) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateBack({
    fail: () => goTabBar('/pages/mine/mine')
  })
}

async function onSubmitTap() {
  if (submitting.value) return
  if (!agreedLegal.value) {
    uni.showToast({ title: '请先阅读并同意用户协议与隐私政策', icon: 'none' })
    return
  }
  const { needAuthorization } = await queryWxPrivacyStatus()
  if (!needAuthorization) {
    onSubmit()
  }
}

async function onSubmitPrivacy(e) {
  const privacy = await confirmWxPrivacyAfterButton(e, 'register-privacy-btn')
  if (!privacy.ok) {
    uni.showToast({ title: privacy.reason || '需同意微信隐私协议', icon: 'none' })
    return
  }
  onSubmit()
}

async function onSubmit() {
  if (submitting.value) return
  if (!agreedLegal.value) {
    uni.showToast({ title: '请先阅读并同意用户协议与隐私政策', icon: 'none' })
    return
  }
  const nickname = form.value.nickname.trim()
  const phone = String(form.value.phone).trim()

  if (nickname.length < 2) {
    uni.showToast({ title: '请填写昵称（至少2字）', icon: 'none' })
    return
  }
  if (!/^1\d{10}$/.test(phone)) {
    uni.showToast({ title: '请输入正确手机号', icon: 'none' })
    return
  }

  if (phoneAuth) {
    const pwd = form.value.password
    if (!pwd || pwd.length < 6) {
      uni.showToast({ title: '密码至少 6 位', icon: 'none' })
      return
    }
    if (pwd !== form.value.password2) {
      uni.showToast({ title: '两次密码不一致', icon: 'none' })
      return
    }
  }

  submitting.value = true
  try {
    if (phoneAuth) {
      await phoneRegister({
        nickname,
        phone,
        password: form.value.password,
        realName: form.value.realName.trim()
      })
    } else {
      await wxRegister({
        nickname,
        phone,
        realName: form.value.realName.trim()
      })
    }
    setLegalConsent()
    uni.showToast({ title: '注册成功', icon: 'success' })
    goAfterAuthSuccess()
  } catch (e) {
    if (!phoneAuth && e?.code === 30005) {
      uni.showModal({
        title: '提示',
        content: '该微信已注册，是否直接登录？',
        confirmText: '登录',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await wxLogin()
            uni.showToast({ title: '登录成功', icon: 'success' })
            goAfterAuthSuccess()
          } catch (err) {
            uni.showToast({ title: err?.message || '登录失败', icon: 'none' })
          }
        }
      })
      return
    }
    if (e?.code === 30006) {
      uni.showModal({
        title: '手机号已被使用',
        content: phoneAuth
          ? '请换一个手机号，或直接登录'
          : '每个手机号只能注册一个学员账号。请换手机号或使用该号在 App 登录（若已设密码）',
        showCancel: false
      })
      return
    }
    if (!phoneAuth && e?.code === 30008) {
      uni.showModal({ title: '微信授权失败', content: e.message || '', showCancel: false })
      return
    }
    uni.showModal({
      title: '注册失败',
      content: (e?.message || '请稍后重试') + (e?.code ? `\n错误码：${e.code}` : ''),
      showCancel: false
    })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  applyThemeUI('注册')
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

.req {
  color: #ef4444;
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
</style>
