<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="conn-card">
      <view class="conn-head">
        <view class="status-chip" :class="connClass">
          <text>{{ connLabel }}</text>
        </view>
        <button v-if="!isConnected" class="btn-link" size="mini" @tap="goConnect">去连接</button>
        <button v-else class="btn-link" size="mini" @tap="goConnect">管理连接</button>
      </view>
      <text v-if="connection.deviceName" class="device-name">{{ connection.deviceName }}</text>
      <text v-else class="device-hint">请先在「蓝牙连接与收发」中连接充电桩设备</text>
    </view>

    <text class="section-title">功能菜单</text>
    <view class="menu-list">
      <view
        v-for="item in menus"
        :key="item.id"
        class="menu-item"
        :class="{ disabled: item.needConnect && !isConnected }"
        @tap="onMenuTap(item)"
      >
        <view class="menu-icon">{{ item.icon }}</view>
        <view class="menu-body">
          <view class="menu-title-row">
            <text class="menu-title">{{ item.title }}</text>
            <text v-if="!item.ready" class="tag-soon">预留</text>
          </view>
          <text class="menu-desc">{{ item.desc }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="tip-card">
      <text>连接成功后，设备自动推送 SystemInfo 与 GunInfo，可在「充电监控」查看。</text>
    </view>
  </scroll-view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { connection } from '@/services/charger/charger-store.js'
import { CHARGER_ROUTES, openChargerPage } from '@/utils/charger-routes.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const isConnected = computed(() => connection.state === 'connected')

const connLabel = computed(() => {
  const map = {
    idle: '未连接',
    scanning: '扫描中',
    connecting: '连接中',
    connected: '已连接',
    error: '连接失败'
  }
  return map[connection.state] || connection.state
})

const connClass = computed(() => {
  if (connection.state === 'connected') return 'ok'
  if (connection.state === 'scanning' || connection.state === 'connecting') return 'pending'
  if (connection.state === 'error') return 'err'
  return ''
})

const menus = [
  {
    id: 'connect',
    icon: '🔗',
    title: '蓝牙连接与收发',
    desc: '扫描连接、JSON/文本/Hex 调试',
    path: CHARGER_ROUTES.connect,
    ready: true,
    needConnect: false
  },
  {
    id: 'monitor',
    icon: '⚡',
    title: '充电监控',
    desc: '设备信息、充电枪实时数据与启停',
    path: CHARGER_ROUTES.monitor,
    ready: true,
    needConnect: true
  },
  {
    id: 'params',
    icon: '⚙️',
    title: '参数配置',
    desc: '网络、计费、使能等参数读写',
    path: CHARGER_ROUTES.params,
    ready: true,
    needConnect: true
  },
  {
    id: 'history',
    icon: '📁',
    title: '历史记录',
    desc: '故障与充电历史查询',
    path: CHARGER_ROUTES.history,
    ready: false,
    needConnect: true
  },
  {
    id: 'firmware',
    icon: '⬆️',
    title: '固件升级',
    desc: '分片上传固件包（支持聊天记录选文件）',
    path: CHARGER_ROUTES.firmware,
    ready: true,
    needConnect: true
  }
]

function goConnect() {
  openChargerPage('connect')
}

function onMenuTap(item) {
  if (item.needConnect && !isConnected.value) {
    uni.showModal({
      title: '尚未连接',
      content: '请先在「蓝牙连接与收发」中连接设备',
      confirmText: '去连接',
      success: (res) => {
        if (res.confirm) goConnect()
      }
    })
    return
  }
  if (!item.ready) {
    uni.showToast({ title: '功能开发中', icon: 'none' })
    return
  }
  openChargerPage(item.id)
}

onShow(() => {
  applyThemeUI('充电桩蓝牙')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
}

.conn-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  border: 1rpx solid var(--theme-border-soft);
  margin-bottom: 28rpx;
}

.conn-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.status-chip {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background: var(--theme-input-bg);
  color: var(--theme-text-sub);

  &.ok {
    background: rgba(34, 197, 94, 0.15);
    color: #16a34a;
  }
  &.pending {
    background: rgba(59, 130, 246, 0.12);
    color: var(--theme-primary);
  }
  &.err {
    background: rgba(239, 68, 68, 0.12);
    color: #dc2626;
  }
}

.btn-link {
  background: var(--theme-input-bg);
  color: var(--theme-primary);
  border: none;
  font-size: 24rpx;
  &::after {
    border: none;
  }
}

.device-name {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.device-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
}

.section-title {
  display: block;
  margin: 0 8rpx 16rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  border: 1rpx solid var(--theme-border-soft);

  &.disabled {
    opacity: 0.55;
  }
}

.menu-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 36rpx;
  background: var(--theme-input-bg);
  border-radius: 18rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.menu-body {
  flex: 1;
  min-width: 0;
}

.menu-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.menu-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.tag-soon {
  font-size: 20rpx;
  color: var(--theme-text-sub);
  background: var(--theme-input-bg);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.menu-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.arrow {
  font-size: 36rpx;
  color: #d1d5db;
  margin-left: 8rpx;
}

.tip-card {
  margin-top: 28rpx;
  padding: 24rpx;
  background: var(--theme-card-bg);
  border-radius: 16rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.6;
}
</style>
