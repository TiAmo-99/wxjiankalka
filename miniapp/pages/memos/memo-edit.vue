<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero" :class="{ edit: isEdit }">
      <text class="hero-icon">{{ isEdit ? '✏️' : '📝' }}</text>
      <text class="hero-title">{{ isEdit ? '编辑备忘录' : '新建备忘录' }}</text>
      <text class="hero-desc">{{ isEdit ? '修改后将同步到云端' : '记录学习要点、待办或灵感' }}</text>
    </view>

    <view class="card">
      <view class="field">
        <view class="label-row">
          <text class="label">标题</text>
          <text class="label-hint">可选</text>
        </view>
        <input
          v-model="form.title"
          class="input"
          maxlength="120"
          placeholder="给备忘录起个名字，方便查找"
        />
      </view>
      <view class="field last">
        <view class="label-row">
          <text class="label">内容</text>
          <text class="label-required">必填</text>
        </view>
        <textarea
          v-model="form.content"
          class="textarea"
          :placeholder="contentPlaceholder"
          maxlength="10000"
          :show-confirm-bar="false"
          :auto-height="false"
        />
        <view class="count-row">
          <text class="count" :class="{ warn: form.content.length > 9000 }">
            {{ form.content.length }} / 10000
          </text>
        </view>
      </view>
    </view>

    <view class="tip-card">
      <text class="tip-icon">☁️</text>
      <text class="tip-text">保存后自动同步云端，可在列表页随时查看与编辑</text>
    </view>

    <view class="foot-spacer" />
  </scroll-view>

  <view class="foot-bar" :style="themeVars">
    <button class="btn-ghost" @click="goBack">取消</button>
    <button class="btn-submit" :loading="saving" :disabled="saving" @click="save">保存</button>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { debounceLeading } from '@/utils/debounce.js'

const memoId = ref(null)
const saving = ref(false)
const contentPlaceholder = '写下你想记录的内容，例如：今日复习重点、待办事项、错题笔记等'
const form = reactive({
  title: '',
  content: ''
})

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isEdit = computed(() => Boolean(memoId.value))

async function loadDetail(id) {
  const data = await request({ url: `/memos/${id}`, showError: true })
  form.title = data?.title || ''
  form.content = data?.content || ''
}

async function saveCore() {
  if (saving.value) return
  if (!form.content.trim()) {
    uni.showToast({ icon: 'none', title: '请填写内容' })
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      content: form.content.trim()
    }
    if (isEdit.value) {
      await request({
        url: `/memos/${memoId.value}`,
        method: 'PATCH',
        data: payload
      })
    } else {
      await request({
        url: '/memos',
        method: 'POST',
        data: payload
      })
    }
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 400)
  } catch (e) {
    uni.showToast({ icon: 'none', title: e.message || '保存失败' })
  } finally {
    saving.value = false
  }
}

const save = debounceLeading(saveCore, 600)

function goBack() {
  uni.navigateBack()
}

onLoad((options) => {
  if (options?.id) {
    memoId.value = Number(options.id)
  }
})

onShow(async () => {
  applyThemeUI(isEdit.value ? '编辑备忘录' : '新建备忘录')
  if (memoId.value) {
    try {
      await loadDetail(memoId.value)
    } catch (e) {
      console.warn(e)
    }
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/buttons.scss';

.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding-bottom: 160rpx;
  box-sizing: border-box;
}

.hero {
  margin: 24rpx 28rpx 20rpx;
  padding: 28rpx 28rpx 32rpx;
  background: linear-gradient(135deg, #0d9488 0%, #14b8a6 48%, #2dd4bf 100%);
  border-radius: 24rpx;
  color: #fff;
  box-shadow: 0 12rpx 32rpx rgba(13, 148, 136, 0.25);

  &.edit {
    background: var(--theme-hero-gradient);
    box-shadow: 0 12rpx 32rpx rgba(63, 96, 234, 0.22);
  }
}

.hero-icon {
  display: block;
  font-size: 48rpx;
  line-height: 1;
  margin-bottom: 12rpx;
}

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.92;
  line-height: 1.45;
}

.card {
  margin: 0 28rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 8rpx 28rpx 16rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.06);
}

.field {
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.last {
    border-bottom: none;
  }
}

.label-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.label-hint {
  font-size: 22rpx;
  color: var(--theme-text-sub);
  padding: 2rpx 12rpx;
  background: var(--theme-input-bg);
  border-radius: 8rpx;
}

.label-required {
  font-size: 22rpx;
  color: #dc2626;
  font-weight: 500;
}

.input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  font-size: 30rpx;
  color: var(--theme-text-main);
}

.textarea {
  width: 100%;
  min-height: 420rpx;
  padding: 24rpx;
  box-sizing: border-box;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  font-size: 30rpx;
  line-height: 1.6;
  color: var(--theme-text-main);
}

.count-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 10rpx;
}

.count {
  font-size: 22rpx;
  color: var(--theme-text-sub);

  &.warn {
    color: #d97706;
    font-weight: 600;
  }
}

.tip-card {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin: 20rpx 28rpx 0;
  padding: 20rpx 24rpx;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  border: 1rpx dashed var(--theme-border-soft);
}

.tip-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
}

.foot-spacer {
  height: 32rpx;
}
</style>
