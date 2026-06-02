<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <text class="hero-title">新增学习任务</text>
      <text class="hero-desc">为自己添加今天及以后的学习安排，将出现在对应日期的计划中</text>
    </view>

    <view class="card">
      <view class="form-item">
        <text class="label">计划日期</text>
        <picker mode="date" :value="form.date" :start="minDate" :end="maxDate" @change="onDateChange">
          <view class="date-pick" :class="{ filled: form.date }">
            <text class="date-val">{{ dateLabel }}</text>
            <text class="date-arrow">›</text>
          </view>
        </picker>
        <text class="hint">仅可选择今天及以后的日期</text>
      </view>

      <view class="form-item">
        <text class="label">科目 / 类别</text>
        <input v-model="form.subject" class="input" placeholder="如：数学、英语、专业课" maxlength="100" />
      </view>

      <view class="form-item last">
        <text class="label">学习内容</text>
        <textarea
          v-model="form.content"
          class="textarea"
          placeholder="请描述要完成的学习内容"
          maxlength="500"
        />
      </view>
    </view>

    <view class="foot-spacer" />
  </scroll-view>

  <view class="foot-bar" :style="themeVars">
    <button class="btn-ghost" @click="goBack">取消</button>
    <button class="btn-submit" :loading="submitting" :disabled="submitting" @click="submit">新增</button>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import { formatDateLabel, todayStr } from '@/utils/plan-store.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { debounceLeading } from '@/utils/debounce.js'

const PREFILL_KEY = 'plan_prefill_date'
const SUBMIT_DEBOUNCE_MS = 800
const SUBMIT_COOLDOWN_MS = 1500
const loggedIn = useLoggedIn()
const today = todayStr()
const submitting = ref(false)
let submitCooldownUntil = 0
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const form = reactive({
  date: today,
  subject: '',
  content: ''
})

const minDate = today

const maxDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
})

const dateLabel = computed(() => {
  if (!form.date) return '请选择日期'
  if (form.date === today) return `今天（${formatDateLabel(form.date)}）`
  return formatDateLabel(form.date)
})

function onDateChange(e) {
  form.date = e.detail.value
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/plan/plan' })
  })
}

async function submitCore() {
  const now = Date.now()
  if (submitting.value || now < submitCooldownUntil) return

  if (!loggedIn.value) {
    uni.showToast({ title: '请先在「我的」登录或注册', icon: 'none' })
    return
  }
  if (form.date < today) {
    uni.showToast({ title: '只能选择今天及以后的日期', icon: 'none' })
    return
  }
  if (!form.subject.trim()) {
    uni.showToast({ title: '请填写科目', icon: 'none' })
    return
  }
  if (!form.content.trim()) {
    uni.showToast({ title: '请填写学习内容', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    await request({
      url: '/plans/items',
      method: 'POST',
      data: {
        date: form.date,
        subject: form.subject.trim(),
        content: form.content.trim(),
        targetMinutes: 0
      }
    })
    submitCooldownUntil = Date.now() + SUBMIT_COOLDOWN_MS
    uni.setStorageSync(PREFILL_KEY, form.date)
    uni.showToast({ title: '已添加', icon: 'success' })
    setTimeout(goBack, 500)
  } catch (e) {
    console.warn(e)
    submitting.value = false
  }
}

const submit = debounceLeading(submitCore, SUBMIT_DEBOUNCE_MS)

onLoad((query) => {
  if (query?.date && query.date >= today) {
    form.date = query.date
  }
})

onShow(() => {
  applyThemeUI('新增学习任务')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding-bottom: 160rpx;
  box-sizing: border-box;
}

.hero {
  margin: 24rpx 28rpx;
  padding: 36rpx 28rpx;
  background: var(--theme-hero-gradient);
  border-radius: 24rpx;
  color: #fff;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.5;
  opacity: 0.92;
}

.card {
  margin: 0 28rpx;
  padding: 8rpx 24rpx 16rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.06);
}

.form-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.last {
    border-bottom: none;
  }
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.hint {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.date-pick {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding: 24rpx 20rpx;
  background: var(--theme-input-bg);
  border-radius: 14rpx;
  border: 2rpx solid var(--theme-border-soft);

  &.filled {
    background: var(--theme-input-bg);
    border-color: var(--theme-primary);
  }
}

.date-val {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-primary);
}

.date-arrow {
  font-size: 36rpx;
  color: #9ca3af;
}

.input {
  width: 100%;
  height: 88rpx;
  margin-top: 12rpx;
  padding: 0 20rpx;
  line-height: 88rpx;
  background: var(--theme-input-bg);
  border-radius: 14rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.textarea {
  width: 100%;
  margin-top: 12rpx;
  padding: 18rpx 20rpx;
  min-height: 160rpx;
  line-height: 1.5;
  background: var(--theme-input-bg);
  border-radius: 14rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.foot-spacer {
  height: 32rpx;
}

@import '@/styles/buttons.scss';
</style>
