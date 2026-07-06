<template>
  <view v-if="visible" class="picker-mask" @tap="onClose">
    <view class="picker-sheet" @tap.stop>
      <view class="picker-head">
        <text class="picker-title">选择蓝牙设备</text>
        <text class="picker-close" @tap="onClose">×</text>
      </view>

      <view class="picker-status">
        <view v-if="scanning" class="scan-dot" />
        <text>{{ summary }}</text>
      </view>

      <scroll-view class="picker-list" scroll-y>
        <view v-if="!devices.length" class="picker-empty">
          <text>{{ scanning ? '正在搜索 BLE 设备…' : '未发现 BLE 设备' }}</text>
          <text class="picker-empty-sub">仅显示低功耗蓝牙（BLE）。系统蓝牙里的 Niren / USB 转蓝牙为经典蓝牙，小程序无法扫描。</text>
        </view>
        <view
          v-for="d in devices"
          :key="d.deviceId"
          class="picker-item"
          @tap="onPick(d)"
        >
          <view class="picker-item-main">
            <text class="picker-name" :class="{ muted: d.isUnnamed }">{{ d.name }}</text>
            <text class="picker-id">{{ d.deviceId }}</text>
          </view>
          <text v-if="d.RSSI != null" class="picker-rssi">{{ d.RSSI }} dBm</text>
          <text class="picker-arrow">›</text>
        </view>
      </scroll-view>

      <view class="picker-foot">
        <button class="btn-rescan" :loading="scanning" @tap="onRescan">重新扫描</button>
        <button class="btn-cancel" @tap="onClose">取消</button>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  scanning: { type: Boolean, default: false },
  devices: { type: Array, default: () => [] },
  summary: { type: String, default: '' }
})

const emit = defineEmits(['close', 'pick', 'rescan'])

function onClose() {
  emit('close')
}

function onPick(d) {
  emit('pick', d)
}

function onRescan() {
  emit('rescan')
}
</script>

<style lang="scss" scoped>
.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
}

.picker-sheet {
  width: 100%;
  max-height: 78vh;
  background: var(--theme-card-bg, #fff);
  border-radius: 28rpx 28rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx 16rpx;
  border-bottom: 1rpx solid var(--theme-border-soft, #e5e7eb);
}

.picker-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--theme-text-main, #111);
}

.picker-close {
  font-size: 48rpx;
  line-height: 1;
  color: var(--theme-text-sub, #6b7280);
  padding: 0 8rpx;
}

.picker-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 28rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub, #6b7280);
}

.scan-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--theme-primary, #3f60ea);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.picker-list {
  flex: 1;
  min-height: 280rpx;
  max-height: 50vh;
  padding: 0 16rpx;
  box-sizing: border-box;
}

.picker-empty {
  padding: 48rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--theme-text-sub, #6b7280);
  line-height: 1.5;
}

.picker-empty-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  opacity: 0.85;
}

.picker-item {
  display: flex;
  align-items: center;
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid var(--theme-border-soft, #e5e7eb);
}

.picker-item-main {
  flex: 1;
  min-width: 0;
}

.picker-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main, #111);

  &.muted {
    font-weight: 500;
    color: var(--theme-text-sub, #6b7280);
  }
}

.picker-id {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: var(--theme-text-sub, #6b7280);
  word-break: break-all;
}

.picker-rssi {
  font-size: 22rpx;
  color: var(--theme-text-sub, #6b7280);
  margin-right: 8rpx;
}

.picker-arrow {
  font-size: 36rpx;
  color: #d1d5db;
}

.picker-foot {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 28rpx 24rpx;
  border-top: 1rpx solid var(--theme-border-soft, #e5e7eb);
}

.btn-rescan {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--theme-primary, #3f60ea);
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
  &::after {
    border: none;
  }
}

.btn-cancel {
  flex: 0 0 160rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--theme-input-bg, #f3f4f6);
  color: var(--theme-text-sub, #6b7280);
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
  &::after {
    border: none;
  }
}
</style>
