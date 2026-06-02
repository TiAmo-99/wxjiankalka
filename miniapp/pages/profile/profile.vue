<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="form-card">
      <view class="field">
        <text class="label">昵称</text>
        <input v-model="form.nickname" class="input" type="nickname" maxlength="20" />
      </view>
      <view class="field">
        <text class="label">手机号</text>
        <input v-model="form.phone" class="input" type="number" maxlength="11" />
      </view>
      <view class="field">
        <text class="label">姓名</text>
        <input v-model="form.realName" class="input" maxlength="20" />
      </view>
      <view class="field">
        <text class="label">邮箱（选填）</text>
        <input v-model="form.email" class="input" maxlength="255" placeholder="用于接收学习提醒" />
      </view>
      <view class="field">
        <text class="label">学习目标</text>
        <input
          v-model="form.studyGoal"
          class="input"
          maxlength="200"
          placeholder="如：2026 考研 · 目标院校"
        />
      </view>
      <view class="field">
        <text class="label">个签 / 座右铭</text>
        <textarea
          v-model="form.motto"
          class="textarea"
          maxlength="200"
          placeholder="写一句激励自己的话"
        />
      </view>
      <button class="btn-submit" :loading="saving" :disabled="saving" @click="onSave">保存</button>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { updateProfile, useLoggedIn } from '@/utils/auth.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loggedIn = useLoggedIn()
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const saving = ref(false)
const form = ref({
  nickname: '',
  phone: '',
  realName: '',
  email: '',
  studyGoal: '',
  motto: ''
})

onLoad(async () => {
  if (!loggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.switchTab({ url: '/pages/mine/mine' }), 400)
    return
  }
  try {
    const data = await request({ url: '/auth/me', showError: false })
    form.value = {
      nickname: data?.nickname || '',
      phone: data?.phone || '',
      realName: data?.realName || '',
      email: data?.email || '',
      studyGoal: data?.studyGoal || '',
      motto: data?.motto || ''
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})

async function onSave() {
  if (saving.value) return
  saving.value = true
  try {
    await updateProfile({
      nickname: form.value.nickname.trim(),
      phone: String(form.value.phone).trim(),
      realName: form.value.realName.trim(),
      email: form.value.email.trim(),
      studyGoal: form.value.studyGoal.trim(),
      motto: form.value.motto.trim()
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 400)
  } catch (e) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onShow(() => {
  applyThemeUI('个人资料')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 32rpx;
  box-sizing: border-box;
}

.form-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
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

.input {
  height: 88rpx;
  padding: 0 24rpx;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  font-size: 28rpx;
  border: 2rpx solid var(--theme-border-soft);
  box-sizing: border-box;
}

.textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 24rpx;
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
</style>
