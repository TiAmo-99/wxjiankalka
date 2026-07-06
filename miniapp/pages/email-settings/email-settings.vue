<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="form-card">
      <text class="form-tip">邮箱为选填。开启提醒后，将在指定时间向邮箱发送今日任务提醒。</text>

      <view class="field">
        <text class="label">邮箱</text>
        <input
          v-model="form.email"
          class="input"
          type="text"
          placeholder="选填，如 name@example.com"
          maxlength="255"
        />
      </view>

      <view class="field row-field">
        <text class="label">接收邮件提醒</text>
        <switch :checked="form.emailNotifyEnabled" :color="switchColor" @change="onToggleEnabled" />
      </view>

      <view v-if="form.emailNotifyEnabled" class="block">
        <text class="block-title">提醒方式</text>
        <view class="radio-row" @click="form.emailNotifyMode = 'default'">
          <view class="radio" :class="{ on: form.emailNotifyMode === 'default' }" />
          <view class="radio-text">
            <text class="radio-label">默认时段（推荐）</text>
            <text class="radio-desc">每天 9:00、14:00、21:00 检查未完成任务</text>
          </view>
        </view>
        <view class="radio-row" @click="form.emailNotifyMode = 'custom'">
          <view class="radio" :class="{ on: form.emailNotifyMode === 'custom' }" />
          <view class="radio-text">
            <text class="radio-label">仅指定时间</text>
            <text class="radio-desc">自选以下时段接收提醒</text>
          </view>
        </view>

        <view v-if="form.emailNotifyMode === 'custom'" class="slot-list">
          <view class="slot-item">
            <text>早上 9:00</text>
            <switch
              :checked="form.emailSlotMorning"
              :color="switchColor"
              @change="(e) => (form.emailSlotMorning = e.detail.value)"
            />
          </view>
          <view class="slot-item">
            <text>下午 14:00</text>
            <switch
              :checked="form.emailSlotAfternoon"
              :color="switchColor"
              @change="(e) => (form.emailSlotAfternoon = e.detail.value)"
            />
          </view>
          <view class="slot-item">
            <text>晚上 21:00</text>
            <switch
              :checked="form.emailSlotEvening"
              :color="switchColor"
              @change="(e) => (form.emailSlotEvening = e.detail.value)"
            />
          </view>
        </view>

        <view class="field row-field done-row">
          <view>
            <text class="label">全部完成时发送鼓励</text>
            <text class="hint">当日任务都完成时，可选收到一封鼓励邮件</text>
          </view>
          <switch
            :checked="form.emailNotifyWhenDone"
            :color="switchColor"
            @change="(e) => (form.emailNotifyWhenDone = e.detail.value)"
          />
        </view>
      </view>

      <button class="btn-submit" :loading="saving" :disabled="saving" @click="onSave">保存设置</button>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import { applyThemeUI, getTheme, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { goTabBar } from '@/utils/nav.js'

const loggedIn = useLoggedIn()
const saving = ref(false)
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})
const switchColor = computed(() => getTheme().colors.primary)

const form = reactive({
  email: '',
  emailNotifyEnabled: false,
  emailNotifyMode: 'default',
  emailSlotMorning: true,
  emailSlotAfternoon: true,
  emailSlotEvening: true,
  emailNotifyWhenDone: false
})

function onToggleEnabled(e) {
  form.emailNotifyEnabled = e.detail.value
}

onLoad(async () => {
  if (!loggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    goTabBar('/pages/mine/mine')
    return
  }
  try {
    const data = await request({ url: '/auth/me', showError: false })
    form.email = data?.email || ''
    form.emailNotifyEnabled = Boolean(data?.emailNotifyEnabled)
    form.emailNotifyMode = data?.emailNotifyMode === 'custom' ? 'custom' : 'default'
    form.emailSlotMorning = data?.emailSlotMorning !== false
    form.emailSlotAfternoon = data?.emailSlotAfternoon !== false
    form.emailSlotEvening = data?.emailSlotEvening !== false
    form.emailNotifyWhenDone = Boolean(data?.emailNotifyWhenDone)
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})

async function onSave() {
  if (saving.value) return
  const email = form.email.trim()
  if (form.emailNotifyEnabled && !email) {
    uni.showToast({ title: '请先填写邮箱', icon: 'none' })
    return
  }
  if (
    form.emailNotifyEnabled &&
    form.emailNotifyMode === 'custom' &&
    !form.emailSlotMorning &&
    !form.emailSlotAfternoon &&
    !form.emailSlotEvening
  ) {
    uni.showToast({ title: '请至少选择一个提醒时间', icon: 'none' })
    return
  }

  saving.value = true
  try {
    await request({
      url: '/auth/email-settings',
      method: 'PATCH',
      data: {
        email,
        emailNotifyEnabled: form.emailNotifyEnabled,
        emailNotifyMode: form.emailNotifyMode,
        emailSlotMorning: form.emailSlotMorning,
        emailSlotAfternoon: form.emailSlotAfternoon,
        emailSlotEvening: form.emailSlotEvening,
        emailNotifyWhenDone: form.emailNotifyWhenDone
      }
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    uni.navigateBack()
  } catch (e) {
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onShow(() => {
  applyThemeUI('邮箱提醒设置')
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

.form-tip {
  display: block;
  margin-bottom: 28rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.55;
}

.field {
  margin-bottom: 28rpx;
}

.row-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.label {
  display: block;
  font-size: 26rpx;
  color: var(--theme-text-main);
  margin-bottom: 12rpx;
}

.row-field .label {
  margin-bottom: 0;
}

.hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
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

.block {
  margin-bottom: 24rpx;
  padding-top: 8rpx;
}

.block-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  margin-bottom: 16rpx;
}

.radio-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.radio {
  width: 36rpx;
  height: 36rpx;
  margin-top: 4rpx;
  border-radius: 50%;
  border: 3rpx solid var(--theme-border-soft);
  box-sizing: border-box;
  flex-shrink: 0;

  &.on {
    border-color: var(--theme-primary);
    background: radial-gradient(circle at center, var(--theme-primary) 0 45%, transparent 50%);
  }
}

.radio-label {
  display: block;
  font-size: 28rpx;
  color: var(--theme-text-main);
}

.radio-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.slot-list {
  margin: 16rpx 0 8rpx;
  padding: 8rpx 20rpx;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
}

.slot-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
  font-size: 28rpx;
  color: var(--theme-text-main);
  border-bottom: 1rpx solid var(--theme-border-soft);

  &:last-child {
    border-bottom: none;
  }
}

.done-row {
  align-items: flex-start;
  margin-top: 20rpx;
}

@import '@/styles/buttons.scss';

.btn-submit {
  margin-top: 16rpx;
}
</style>
