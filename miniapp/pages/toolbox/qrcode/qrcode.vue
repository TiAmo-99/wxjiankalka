<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'scan' }" @click="tab = 'scan'">扫码解码</view>
      <view class="tab" :class="{ active: tab === 'gen' }" @click="tab = 'gen'">生成二维码</view>
    </view>

    <view v-if="tab === 'scan'" class="card">
      <text class="card-title">扫描二维码</text>
      <text class="card-hint">识别结果可复制，支持二维码与部分条码</text>
      <button class="btn-primary" @click="scanCode">开始扫描</button>
      <view v-if="scanResult" class="result-box">
        <text class="result-label">解码内容</text>
        <text class="result-text" selectable>{{ scanResult }}</text>
        <view class="result-actions">
          <button class="btn-ghost" size="mini" @click="copyText(scanResult)">复制</button>
          <button class="btn-ghost" size="mini" @click="scanResult = ''">清空</button>
        </view>
      </view>
    </view>

    <view v-else class="card">
      <text class="card-title">生成二维码</text>
      <textarea
        v-model="genText"
        class="textarea"
        maxlength="500"
        placeholder="输入要生成二维码的文字或链接"
        :show-confirm-bar="false"
      />
      <text class="char-count">{{ genText.length }} / 500</text>
      <button class="btn-primary" :loading="genLoading" @click="generateQr">生成</button>

      <view class="qr-wrap" :class="{ 'qr-wrap--hidden': !qrCanvasMounted }">
        <canvas
          canvas-id="opsQrCanvas"
          class="qr-canvas"
          :style="{ width: qrSize + 'px', height: qrSize + 'px' }"
        />
      </view>
      <view v-if="qrReady" class="qr-actions">
        <button class="btn-ghost" size="mini" @click="saveQrImage">保存到相册</button>
        <button class="btn-ghost" size="mini" @click="copyText(genText)">复制文字</button>
      </view>
    </view>

    <view class="foot-spacer" />
  </scroll-view>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { canvasToImage, drawQrToCanvas } from '@/utils/qr-canvas.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const tab = ref('scan')
const scanResult = ref('')
const genText = ref('')
const genLoading = ref(false)
const qrReady = ref(false)
const qrCanvasMounted = ref(false)
const qrSize = 280

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

function scanCode() {
  uni.scanCode({
    onlyFromCamera: false,
    scanType: ['qrCode', 'barCode'],
    success: (res) => {
      scanResult.value = res.result || ''
      if (!scanResult.value) {
        uni.showToast({ icon: 'none', title: '未识别到内容' })
      }
    },
    fail: (err) => {
      if (err.errMsg && err.errMsg.includes('cancel')) return
      uni.showToast({ icon: 'none', title: '扫描失败' })
    }
  })
}

async function generateQr() {
  const text = genText.value.trim()
  if (!text) {
    uni.showToast({ icon: 'none', title: '请输入内容' })
    return
  }
  genLoading.value = true
  qrReady.value = false
  qrCanvasMounted.value = true
  try {
    await nextTick()
    await new Promise((r) => setTimeout(r, 80))
    await drawQrToCanvas('opsQrCanvas', text, qrSize)
    qrReady.value = true
  } catch (e) {
    qrCanvasMounted.value = false
    uni.showToast({ icon: 'none', title: e.message || '生成失败' })
  } finally {
    genLoading.value = false
  }
}

function copyText(text) {
  if (!text) return
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: '已复制', icon: 'success' })
  })
}

async function saveQrImage() {
  try {
    const path = await canvasToImage('opsQrCanvas')
    uni.saveImageToPhotosAlbum({
      filePath: path,
      success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => {
        uni.showModal({
          title: '保存失败',
          content: '请在设置中允许保存到相册后重试',
          showCancel: false
        })
      }
    })
  } catch (e) {
    uni.showToast({ icon: 'none', title: e.message || '导出失败' })
  }
}

onShow(() => {
  applyThemeUI('二维码')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx;
  box-sizing: border-box;
}

.tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--theme-text-sub);
  background: var(--theme-card-bg);
  border: 1rpx solid var(--theme-border-soft);

  &.active {
    color: #fff;
    background: var(--theme-primary);
    border-color: transparent;
  }
}

.card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.card-hint {
  display: block;
  margin-top: 8rpx;
  margin-bottom: 20rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.45;
}

.btn-primary {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 16rpx;
  font-size: 30rpx;
  border: none;

  &::after {
    border: none;
  }
}

.btn-ghost {
  background: var(--theme-input-bg);
  color: var(--theme-primary);
  border: none;

  &::after {
    border: none;
  }
}

.result-box {
  margin-top: 24rpx;
  padding: 20rpx;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
}

.result-label {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  margin-bottom: 12rpx;
}

.result-text {
  display: block;
  font-size: 28rpx;
  color: var(--theme-text-main);
  line-height: 1.5;
  word-break: break-all;
}

.result-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  margin-top: 16rpx;
  padding: 20rpx;
  box-sizing: border-box;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
  border: 1rpx solid var(--theme-border-soft);
}

.char-count {
  display: block;
  text-align: right;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  margin: 8rpx 0 16rpx;
}

.qr-wrap {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;

  &--hidden {
    position: fixed;
    left: -9999px;
    opacity: 0;
    pointer-events: none;
  }
}

.qr-canvas {
  width: 280px;
  height: 280px;
  background: #fff;
  border-radius: 12rpx;
}

.qr-actions {
  display: flex;
  justify-content: center;
  gap: 16rpx;
  margin-top: 20rpx;
}

.foot-spacer {
  height: 48rpx;
}
</style>
