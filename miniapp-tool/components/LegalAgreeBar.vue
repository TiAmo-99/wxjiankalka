<template>
  <view class="legal-bar">
    <view class="check-wrap">
      <view class="checkbox" :class="{ checked: modelValue }" @tap="toggle">
        <text v-if="modelValue" class="tick">✓</text>
      </view>
      <view class="legal-text" @tap="toggle">
        <text>我已阅读并同意</text>
        <text class="link" @tap.stop="openUserAgreement">《用户服务协议》</text>
        <text>、</text>
        <text class="link" @tap.stop="openPrivacyPolicy">《隐私政策》</text>
        <!-- #ifdef MP-WEIXIN -->
        <text>及</text>
        <text class="link" @tap.stop="onOpenWxPrivacyContract">《微信隐私指引》</text>
        <!-- #endif -->
      </view>
    </view>
  </view>
</template>

<script setup>
import { openPrivacyPolicy, openUserAgreement } from '@/utils/legal.js'
import { openWxPrivacyContract } from '@/utils/wx-privacy.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

function toggle() {
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}

async function onOpenWxPrivacyContract() {
  try {
    await openWxPrivacyContract()
  } catch (_) {
    uni.showToast({ title: '无法打开微信隐私指引', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.legal-bar {
  margin: 20rpx 0 4rpx;
}

.check-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid var(--theme-border-soft);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2rpx;
  background: var(--theme-input-bg);
  box-sizing: border-box;

  &.checked {
    background: var(--theme-primary);
    border-color: var(--theme-primary);
  }
}

.tick {
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}

.legal-text {
  flex: 1;
  font-size: 22rpx;
  line-height: 1.5;
  color: var(--theme-text-sub);
}

.link {
  color: var(--theme-primary);
}
</style>
