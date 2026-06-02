<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <text class="hero-title">注册账号</text>
      <text class="hero-desc">绑定微信并填写信息，用于同步学习计划与学习记录</text>
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

      <view class="field">
        <text class="label">姓名（选填）</text>
        <input
          v-model="form.realName"
          class="input"
          maxlength="20"
          placeholder="真实姓名，便于机构识别"
        />
      </view>

      <button class="btn-submit" :loading="submitting" :disabled="submitting" @click="onSubmit">
        注册并登录
      </button>

      <view class="foot-link" @click="goLogin">
        <text>已有账号？去登录</text>
      </view>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { wxRegister, wxLogin } from '@/utils/auth.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const submitting = ref(false)
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})
const form = ref({
  nickname: '',
  phone: '',
  realName: ''
})

function goLogin() {
  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/mine/mine' })
    }
  })
}

async function onSubmit() {
  if (submitting.value) return
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

  submitting.value = true
  try {
    await wxRegister({
      nickname,
      phone,
      realName: form.value.realName.trim()
    })
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/mine/mine' })
    }, 400)
  } catch (e) {
    const msg = e?.message || e?.errMsg || '注册失败，请稍后重试'
    if (e?.code === 30005) {
      uni.showModal({
        title: '提示',
        content: '该微信已注册，是否直接登录？',
        confirmText: '登录',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await wxLogin()
            uni.showToast({ title: '登录成功', icon: 'success' })
            setTimeout(() => uni.switchTab({ url: '/pages/mine/mine' }), 400)
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
        content: '每个手机号只能注册一个学员账号。请换一个手机号，或使用该手机号对应的微信直接登录。',
        showCancel: false
      })
      return
    }
    if (e?.code === 30008) {
      uni.showModal({ title: '微信授权失败', content: msg, showCancel: false })
      return
    }
    uni.showModal({
      title: '注册失败',
      content: msg + (e?.code ? `\n错误码：${e.code}` : ''),
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
