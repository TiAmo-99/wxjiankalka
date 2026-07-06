<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <text class="hero-title">{{ isChange ? '修改密码' : '设置密码' }}</text>
      <text class="hero-desc">{{ heroDesc }}</text>
    </view>

    <view class="form-card">
      <template v-if="!isChange">
        <view class="field">
          <text class="label">手机号 <text class="req">*</text></text>
          <input
            v-model="form.phone"
            class="input"
            type="number"
            maxlength="11"
            placeholder="小程序注册时填写的手机号"
          />
        </view>
        <view class="field">
          <text class="label">昵称 <text class="req">*</text></text>
          <input
            v-model="form.nickname"
            class="input"
            type="nickname"
            maxlength="20"
            placeholder="与小程序注册时一致"
          />
        </view>
      </template>

      <view v-if="isChange" class="field pwd-field">
        <text class="label">原密码 <text class="req">*</text></text>
        <input
          v-model="form.oldPassword"
          class="input input-pwd"
          :password="!showOldPwd"
          maxlength="64"
          placeholder="请输入当前密码"
        />
        <text class="toggle-pwd" @click="showOldPwd = !showOldPwd">{{ showOldPwd ? '隐藏' : '显示' }}</text>
      </view>

      <view class="field pwd-field">
        <text class="label">{{ isChange ? '新密码' : '密码' }} <text class="req">*</text></text>
        <input
          v-model="form.password"
          class="input input-pwd"
          :password="!showPwd"
          maxlength="64"
          placeholder="6～64 位"
        />
        <text class="toggle-pwd" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</text>
      </view>

      <view class="field pwd-field">
        <text class="label">确认密码 <text class="req">*</text></text>
        <input
          v-model="form.password2"
          class="input input-pwd"
          :password="!showPwd2"
          maxlength="64"
          placeholder="再次输入密码"
        />
        <text class="toggle-pwd" @click="showPwd2 = !showPwd2">{{ showPwd2 ? '隐藏' : '显示' }}</text>
      </view>

      <button class="btn-submit" :loading="submitting" :disabled="submitting" @click="onSubmit">
        {{ isChange ? '保存新密码' : '设置并登录' }}
      </button>

      <view v-if="!isChange" class="foot-link" @click="goLogin">
        <text>已有密码？去登录</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { changePassword, setInitialPassword, useLoggedIn } from '@/utils/auth.js'
import { request } from '@/utils/request.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loggedIn = useLoggedIn()
const mode = ref('initial')
const submitting = ref(false)
const showOldPwd = ref(false)
const showPwd = ref(false)
const showPwd2 = ref(false)

const form = ref({
  phone: '',
  nickname: '',
  oldPassword: '',
  password: '',
  password2: ''
})

const isChange = computed(() => mode.value === 'change')

const heroDesc = computed(() =>
  isChange.value
    ? '修改后请使用新密码登录 App'
    : '适用于在微信小程序注册、尚未设置 App 密码的账号'
)

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

onLoad((query) => {
  if (query?.mode === 'change') {
    mode.value = 'change'
    if (!loggedIn.value) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => uni.redirectTo({ url: '/pages/login/login' }), 400)
    }
    return
  }
  mode.value = 'initial'
  if (query?.phone) {
    form.value.phone = decodeURIComponent(String(query.phone))
  }
})

async function loadProfileHint() {
  if (mode.value !== 'initial' || !loggedIn.value) return
  try {
    const data = await request({ url: '/auth/me', showError: false })
    if (data?.phone && !form.value.phone) form.value.phone = data.phone
    if (data?.nickname && !form.value.nickname) form.value.nickname = data.nickname
  } catch (_) {
    /* ignore */
  }
}

function goLogin() {
  uni.redirectTo({ url: '/pages/login/login' })
}

async function onSubmit() {
  if (submitting.value) return

  const password = form.value.password
  const password2 = form.value.password2

  if (!password || password.length < 6) {
    uni.showToast({ title: '密码至少 6 位', icon: 'none' })
    return
  }
  if (password !== password2) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    if (isChange.value) {
      if (!form.value.oldPassword) {
        uni.showToast({ title: '请输入原密码', icon: 'none' })
        return
      }
      await changePassword({
        oldPassword: form.value.oldPassword,
        newPassword: password
      })
      uni.showToast({ title: '密码已更新', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 400)
      return
    }

    const phone = String(form.value.phone).trim()
    const nickname = form.value.nickname.trim()
    if (!/^1\d{10}$/.test(phone)) {
      uni.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (nickname.length < 2) {
      uni.showToast({ title: '请填写注册昵称', icon: 'none' })
      return
    }

    await setInitialPassword({ phone, nickname, password })
    uni.showToast({ title: '设置成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/mine/mine' })
    }, 400)
  } catch (e) {
    if (e?.code === 30010) {
      uni.showModal({
        title: '提示',
        content: e.message || '该账号已有密码',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) goLogin()
        }
      })
      return
    }
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  applyThemeUI(isChange.value ? '修改密码' : '设置密码')
  loadProfileHint()
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
  color: #e74c3c;
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
