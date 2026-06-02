<template>
  <theme-page-meta />
  <scroll-view class="page" :class="`theme-${currentThemeName}`" :style="themeStyle" scroll-y>
    <view class="profile-card" @click="openProfileActions">
      <view class="profile-bg" />
      <view class="profile-inner">
        <view class="profile-top">
          <view class="avatar-wrap">
            <view class="avatar">{{ avatarText }}</view>
          </view>
          <view class="profile-main">
            <view class="name-row">
              <text class="nickname">{{ nickname }}</text>
              <view v-if="loggedIn" class="perm-chip">L{{ permLevel }}</view>
            </view>
            <text class="profile-subtitle">{{ loggedIn ? '继续保持你的学习节奏' : '点击卡片登录或注册' }}</text>
          </view>
          <text class="profile-arrow">›</text>
        </view>
        <view class="profile-quote">
          <text class="quote-mark">“</text>
          <text class="signature-text">{{ profileMotto || '保持专注，稳步前进' }}</text>
        </view>
      </view>
    </view>

    <view v-if="!loggedIn" class="guest-tip">
      <text class="guest-icon">👋</text>
      <text>首次使用请先「注册」，已有账号点「登录」</text>
    </view>

    <view class="stats-panel">
      <view class="stats-head">
        <text class="stats-title">学习数据</text>
        <text class="stats-sub">持续记录，见证成长</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-num">{{ stats.totalMinutes }}</text>
          <text class="stat-label">累计(分钟)</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ stats.completedTasks }}</text>
          <text class="stat-label">完成任务</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ stats.weekMinutes }}</text>
          <text class="stat-label">本周(分钟)</text>
        </view>
        <view class="stat-item highlight">
          <text class="stat-num">{{ stats.streakDays }}</text>
          <text class="stat-label">连续打卡</text>
        </view>
      </view>
    </view>

    <view class="section-label">学习</view>
    <view class="menu-card">
      <view class="menu-item" @click="goAddTask">
        <view class="menu-icon bg-blue">📝</view>
        <view class="menu-body">
          <text class="menu-text">新增学习任务</text>
          <text class="menu-sub">自定义今日计划</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="goPlan">
        <view class="menu-icon bg-purple">📋</view>
        <view class="menu-body">
          <text class="menu-text">查看学习计划</text>
          <text class="menu-sub">今日任务与上报</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item last" @click="goHistory">
        <view class="menu-icon bg-green">📊</view>
        <view class="menu-body">
          <text class="menu-text">学习记录</text>
          <text class="menu-sub">历史上报明细</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="section-label">工具</view>
    <view class="menu-card">
      <view class="menu-item" @click="goMemos">
        <view class="menu-icon bg-teal">📒</view>
        <view class="menu-body">
          <text class="menu-text">备忘录</text>
          <text class="menu-sub">{{ loggedIn ? '云端保存，随时查看与编辑' : '登录后使用' }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item last" @click="goToolbox">
        <view class="menu-icon bg-slate">🧰</view>
        <view class="menu-body">
          <text class="menu-text">工具箱</text>
          <text class="menu-sub">{{ toolboxSub }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <template v-if="loggedIn">
      <view class="section-label">账户</view>
      <view class="menu-card">
        <view class="menu-item" @click="goProfile">
          <view class="menu-icon bg-indigo">👤</view>
          <view class="menu-body">
            <text class="menu-text">个人资料</text>
            <text class="menu-sub">昵称、邮箱与学习目标</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @click="openThemeSelector">
          <view class="menu-icon bg-pink">🎨</view>
          <view class="menu-body">
            <text class="menu-text">界面风格</text>
            <text class="menu-sub">{{ themeDesc }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @click="goPermissionApply">
          <view class="menu-icon bg-rose">🔑</view>
          <view class="menu-body">
            <text class="menu-text">权限申请</text>
            <text class="menu-sub">{{ permApplySub }}</text>
          </view>
          <view v-if="hasPendingPerm" class="badge">审核中</view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item last" @click="goEmailSettings">
          <view class="menu-icon bg-amber">✉️</view>
          <view class="menu-body">
            <text class="menu-text">邮箱提醒设置</text>
            <text class="menu-sub">定时任务提醒</text>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </template>

    <view class="footer">
      <text>考研学习记录</text>
    </view>
    <view class="page-bottom" />
  </scroll-view>

  <view v-if="actionSheetOpen" class="sheet-mask" @click="closeProfileActions" />
  <view class="action-sheet" :class="[{ show: actionSheetOpen }, `theme-${currentThemeName}`]">
    <view class="sheet-head">
      <text class="sheet-title">{{ loggedIn ? '账号操作' : '欢迎使用' }}</text>
      <text class="sheet-close" @click="closeProfileActions">×</text>
    </view>
    <view class="sheet-body">
      <view v-if="loggedIn" class="sheet-item" @click="onSheetProfile">
        <text class="sheet-item-icon">👤</text>
        <view class="sheet-item-main">
          <text class="sheet-item-title">修改信息</text>
          <text class="sheet-item-desc">编辑昵称、手机号、邮箱等资料</text>
        </view>
      </view>
      <view v-if="loggedIn" class="sheet-item danger" @click="onSheetLogout">
        <text class="sheet-item-icon">⎋</text>
        <view class="sheet-item-main">
          <text class="sheet-item-title">退出登录</text>
          <text class="sheet-item-desc">退出当前账号并清除本地登录态</text>
        </view>
      </view>

      <view v-if="!loggedIn" class="sheet-item" @click="onSheetLogin">
        <text class="sheet-item-icon">🔐</text>
        <view class="sheet-item-main">
          <text class="sheet-item-title">登录</text>
          <text class="sheet-item-desc">已有账号，直接登录同步数据</text>
        </view>
      </view>
      <view v-if="!loggedIn" class="sheet-item" @click="onSheetRegister">
        <text class="sheet-item-icon">📝</text>
        <view class="sheet-item-main">
          <text class="sheet-item-title">注册</text>
          <text class="sheet-item-desc">新用户先注册，再开始学习</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { logout, wxLogin, useLoggedIn } from '@/utils/auth.js'
import { goAddTaskWithAuth } from '@/utils/add-task.js'
import { canUseToolbox, isFinalAdmin, permLabel } from '@/utils/permission.js'
import {
  listThemes,
  getTheme,
  setTheme,
  applyThemeUI,
  getThemePageStyle,
  getThemeCssVars,
  themeSignal
} from '@/utils/theme.js'

const nickname = ref('未登录')
const avatarText = ref('?')
const loginLoading = ref(false)
const permLevel = ref(0)
const hasPendingPerm = ref(false)
const actionSheetOpen = ref(false)
const stats = ref({
  totalMinutes: 0,
  completedTasks: 0,
  weekMinutes: 0,
  streakDays: 0
})

const loggedIn = useLoggedIn()
const profileMotto = ref('')
const themeName = ref(getTheme().name)

const loginDesc = computed(() => {
  if (!loggedIn.value) return '登录后同步学习数据'
  if (profileMotto.value) return profileMotto.value
  return permLabel(permLevel.value)
})

const permApplySub = computed(() => {
  if (isFinalAdmin(permLevel.value)) return 'L10 管理员 · 审核他人申请'
  return hasPendingPerm.value ? '申请审核中，点击查看' : '申请更高权限等级'
})

const toolboxSub = computed(() => {
  const lv = permLevel.value
  if (canUseToolbox(lv)) return '计算器 · 二维码 · 运维调试'
  if (lv > 0) return '计算器 · 二维码（运维需 L3+）'
  return '计算器可用 · 更多工具需申请权限'
})
const themeDesc = computed(() => {
  themeName.value
  themeSignal.value
  const t = getTheme()
  return `${t.label} · ${t.desc}`
})
const themePageStyle = computed(() => {
  themeName.value
  themeSignal.value
  return getThemePageStyle()
})
const themeVars = computed(() => {
  themeName.value
  themeSignal.value
  return getThemeCssVars()
})
const themeStyle = computed(() => ({
  ...themePageStyle.value,
  ...themeVars.value
}))
const currentThemeName = computed(() => {
  themeName.value
  themeSignal.value
  return getTheme().name
})

async function loadProfile() {
  if (!loggedIn.value) {
    nickname.value = '未登录'
    avatarText.value = '?'
    permLevel.value = 0
    hasPendingPerm.value = false
    profileMotto.value = ''
    return
  }
  try {
    const data = await request({ url: '/auth/me', showError: false })
    nickname.value = data?.nickname || '学员'
    avatarText.value = (nickname.value[0] || '学').toUpperCase()
    profileMotto.value = data?.motto || ''
    permLevel.value = data?.permLevel ?? 0
    if (!profileMotto.value && data?.studyGoal) {
      profileMotto.value = data.studyGoal
    }
  } catch (e) {
    if (loggedIn.value) {
      nickname.value = '学员'
      avatarText.value = '学'
    }
  }
  try {
    const pr = await request({ url: '/auth/permission-requests', showError: false })
    hasPendingPerm.value = (pr?.list || []).some((x) => x.status === 'pending')
  } catch (e) {
    hasPendingPerm.value = false
  }
}

async function loadStats() {
  if (!loggedIn.value) {
    stats.value = { totalMinutes: 0, completedTasks: 0, weekMinutes: 0, streakDays: 0 }
    return
  }
  try {
    const data = await request({ url: '/stats/summary', showError: false })
    if (data) {
      stats.value = {
        totalMinutes: data.totalMinutes ?? 0,
        completedTasks: data.completedTasks ?? 0,
        weekMinutes: data.weekMinutes ?? 0,
        streakDays: data.streakDays ?? 0
      }
    }
  } catch (e) {
    stats.value = { totalMinutes: 0, completedTasks: 0, weekMinutes: 0, streakDays: 0 }
  }
}

async function handleLogin() {
  if (loginLoading.value) return
  loginLoading.value = true
  try {
    const data = await wxLogin()
    nickname.value = data?.nickname || data?.user?.nickname || '学员'
    avatarText.value = (nickname.value[0] || '学').toUpperCase()
    permLevel.value = data?.user?.permLevel ?? 0
    uni.showToast({ title: '登录成功', icon: 'success' })
    await loadProfile()
    await loadStats()
  } catch (e) {
    if (e?.code === 30001) {
      uni.showModal({
        title: '尚未注册',
        content: '该微信还未注册，请先完成注册',
        confirmText: '去注册',
        success: (res) => {
          if (res.confirm) goRegister()
        }
      })
      return
    }
    uni.showToast({ title: e?.message || '登录失败', icon: 'none' })
  } finally {
    loginLoading.value = false
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/register/register' })
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/profile' })
}

function goEmailSettings() {
  uni.navigateTo({ url: '/pages/email-settings/email-settings' })
}

function goPermissionApply() {
  uni.navigateTo({ url: '/pages/permission-apply/permission-apply' })
}

function goMemos() {
  if (!loggedIn.value) {
    uni.showModal({
      title: '请先登录',
      content: '登录后可使用云端备忘录',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) openProfileActions()
      }
    })
    return
  }
  uni.navigateTo({ url: '/pages/memos/memos' })
}

function goToolbox() {
  uni.navigateTo({ url: '/pages/toolbox/toolbox' })
}

function openThemeSelector() {
  const themes = listThemes()
  const labels = themes.map((t) => `${t.label} · ${t.desc}`)
  uni.showActionSheet({
    itemList: labels,
    success: (res) => {
      const picked = themes[res.tapIndex]
      if (!picked) return
      themeName.value = setTheme(picked.name).name
      applyThemeUI('我的')
      uni.showToast({ title: `已切换为${picked.label}`, icon: 'none' })
    }
  })
}

function goAddTask() {
  goAddTaskWithAuth(loggedIn.value)
}

function handleLogout() {
  logout()
  nickname.value = '未登录'
  avatarText.value = '?'
  permLevel.value = 0
  hasPendingPerm.value = false
  stats.value = { totalMinutes: 0, completedTasks: 0, weekMinutes: 0, streakDays: 0 }
  uni.showToast({ title: '已退出', icon: 'none' })
}

function openProfileActions() {
  actionSheetOpen.value = true
}

function closeProfileActions() {
  actionSheetOpen.value = false
}

function onSheetProfile() {
  closeProfileActions()
  goProfile()
}

function onSheetLogout() {
  closeProfileActions()
  handleLogout()
}

function onSheetLogin() {
  closeProfileActions()
  handleLogin()
}

function onSheetRegister() {
  closeProfileActions()
  goRegister()
}

function goHistory() {
  if (!loggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/report-history/report-history' })
}

function goPlan() {
  uni.switchTab({ url: '/pages/plan/plan' })
}

onShow(() => {
  themeName.value = getTheme().name
  applyThemeUI('我的')
  loadProfile()
  loadStats()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #e8ecff 0%, #f0f2f8 120rpx, #f0f2f8 100%);
  padding: 24rpx 28rpx;
  box-sizing: border-box;
}

.profile-card {
  position: relative;
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 18rpx rgba(30, 40, 80, 0.08);
}

.profile-bg {
  position: absolute;
  inset: 0;
  background: var(--theme-hero-gradient, linear-gradient(145deg, #1d3fcb 0%, #2f31b6 52%, #4d259d 100%));
}

.profile-inner {
  position: relative;
  padding: 26rpx 24rpx 22rpx;
  color: #fff;
}

.profile-top {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  position: relative;
  margin-right: 16rpx;
}

.avatar {
  width: 84rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1rpx solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  font-size: 34rpx;
  font-weight: 600;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.nickname {
  font-size: 34rpx;
  font-weight: 700;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.profile-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  opacity: 0.92;
}

.profile-arrow {
  font-size: 32rpx;
  opacity: 0.88;
  margin-left: 8rpx;
}

.perm-chip {
  padding: 2rpx 12rpx;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 500;
  border: 1rpx solid rgba(255, 255, 255, 0.26);
}

.profile-quote {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  margin-top: 18rpx;
  padding: 0 4rpx;
}

.quote-mark {
  flex-shrink: 0;
  font-size: 44rpx;
  line-height: 1;
  font-weight: 300;
  opacity: 0.55;
  margin-top: -4rpx;
}

.signature-text {
  flex: 1;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: 0.5rpx;
  opacity: 0.95;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.guest-tip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: -8rpx 0 20rpx;
  padding: 22rpx 24rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  font-size: 24rpx;
  color: #6b7280;
  box-shadow: 0 4rpx 20rpx rgba(30, 40, 80, 0.05);
}

.guest-icon {
  font-size: 32rpx;
}

.stats-panel {
  background: var(--theme-card-bg);
  border-radius: 28rpx;
  padding: 28rpx 24rpx 24rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(30, 40, 80, 0.06);
}

.stats-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 0 4rpx;
}

.stats-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.stats-sub {
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.stat-item {
  width: calc(50% - 8rpx);
  background: var(--theme-input-bg);
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  box-sizing: border-box;

  &.highlight {
    background: linear-gradient(135deg, #eef2ff, #f5f3ff);
  }
}

.stat-num {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: var(--theme-primary);
}

.stat-label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.section-label {
  padding: 0 8rpx 14rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--theme-text-sub);
  letter-spacing: 2rpx;
}

.menu-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 6rpx 24rpx rgba(30, 40, 80, 0.05);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.last {
    border-bottom: none;
  }
}

.menu-icon {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 32rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
  flex-shrink: 0;

  &.bg-blue {
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  }

  &.bg-purple {
    background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  }

  &.bg-green {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  }

  &.bg-teal {
    background: linear-gradient(135deg, #ccfbf1, #99f6e4);
  }

  &.bg-indigo {
    background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  }

  &.bg-amber {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
  }

  &.bg-rose {
    background: linear-gradient(135deg, #ffe4e6, #fecdd3);
  }

  &.bg-slate {
    background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  }

  &.bg-pink {
    background: linear-gradient(135deg, #ffe4ef, #ffc8dd);
  }

  &.bg-red {
    background: linear-gradient(135deg, #fee2e2, #fecaca);
  }
}

.menu-body {
  flex: 1;
  min-width: 0;
}

.menu-text {
  display: block;
  font-size: 28rpx;
  color: var(--theme-text-main);
  font-weight: 500;

  &.danger {
    color: #ef4444;
  }
}

.menu-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.badge {
  padding: 4rpx 12rpx;
  margin-right: 8rpx;
  background: #fef3c7;
  color: #d97706;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.arrow {
  color: #d1d5db;
  font-size: 32rpx;
  flex-shrink: 0;
}

.footer {
  text-align: center;
  padding: 24rpx 0 8rpx;
  font-size: 22rpx;
  color: #cbd5e1;
}

.page-bottom {
  height: 32rpx;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 110;
}

.action-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--theme-card-bg);
  border-radius: 28rpx 28rpx 0 0;
  transform: translateY(100%);
  transition: transform 0.22s ease;
  z-index: 111;
  box-shadow: 0 -12rpx 40rpx rgba(15, 23, 42, 0.2);
}

.action-sheet.show {
  transform: translateY(0);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 28rpx 18rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.sheet-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.sheet-close {
  font-size: 46rpx;
  line-height: 1;
  color: var(--theme-text-sub);
  padding: 0 6rpx;
}

.sheet-body {
  padding: 10rpx 20rpx calc(18rpx + env(safe-area-inset-bottom));
}

.sheet-item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 22rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 10rpx;
  background: var(--theme-input-bg);
  border: 1rpx solid var(--theme-border-soft);
}

.sheet-item.danger .sheet-item-title {
  color: #ef4444;
}

.sheet-item-icon {
  font-size: 34rpx;
  width: 44rpx;
  text-align: center;
}

.sheet-item-main {
  flex: 1;
}

.sheet-item-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.sheet-item-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

/* 女神粉：更柔和的卡片氛围与高光 */
.page.theme-goddess .profile-card {
  box-shadow: 0 8rpx 28rpx rgba(236, 95, 154, 0.16);
}

.action-sheet.theme-goddess {
  box-shadow: 0 -14rpx 44rpx rgba(236, 95, 154, 0.22);
}

.action-sheet.theme-goddess .sheet-item {
  background: #fff7fb;
  border-color: #ffd2e7;
}

.action-sheet.theme-goddess .sheet-item.danger .sheet-item-title {
  color: #db2777;
}

/* 酷夜黑：更清晰分层与冷色高亮 */
.page.theme-dark .profile-card {
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
}

.action-sheet.theme-dark {
  box-shadow: 0 -14rpx 44rpx rgba(0, 0, 0, 0.45);
}

.action-sheet.theme-dark .sheet-item {
  background: #0f172a;
  border-color: #1e293b;
}

/* 女神粉：菜单图标与状态块统一粉系 */
.page.theme-goddess .stat-item.highlight {
  background: linear-gradient(135deg, #ffe9f2, #ffdcec);
}

.page.theme-goddess .badge {
  background: #ffe6f1;
  color: #db2777;
}

.page.theme-goddess .menu-icon.bg-blue {
  background: linear-gradient(135deg, #ffdbe9, #ffc8de);
}

.page.theme-goddess .menu-icon.bg-purple {
  background: linear-gradient(135deg, #f7d8ff, #ebc8ff);
}

.page.theme-goddess .menu-icon.bg-green {
  background: linear-gradient(135deg, #ffe1ee, #ffd2e7);
}

.page.theme-goddess .menu-icon.bg-indigo {
  background: linear-gradient(135deg, #ffe8f2, #ffd9ea);
}

.page.theme-goddess .menu-icon.bg-amber {
  background: linear-gradient(135deg, #ffe1ee, #ffcadf);
}

.page.theme-goddess .menu-icon.bg-rose {
  background: linear-gradient(135deg, #ffd3e7, #ffbfda);
}

.page.theme-goddess .menu-icon.bg-slate {
  background: linear-gradient(135deg, #ffe8f2, #ffddea);
}

.page.theme-goddess .menu-icon.bg-red {
  background: linear-gradient(135deg, #ffc9df, #ffb7d4);
}

/* 酷夜黑：菜单图标改为深色霓虹感 */
.page.theme-dark .stat-item.highlight {
  background: linear-gradient(135deg, #17233a, #1b2b45);
}

.page.theme-dark .badge {
  background: rgba(96, 165, 250, 0.18);
  color: #93c5fd;
}

.page.theme-dark .menu-icon {
  color: #dbeafe;
}

.page.theme-dark .menu-icon.bg-blue {
  background: linear-gradient(135deg, #315fbe, #3f72d7);
}

.page.theme-dark .menu-icon.bg-purple {
  background: linear-gradient(135deg, #6a4fb4, #7f63c7);
}

.page.theme-dark .menu-icon.bg-green {
  background: linear-gradient(135deg, #1d7b66, #23917a);
}

.page.theme-dark .menu-icon.bg-indigo {
  background: linear-gradient(135deg, #3a61bf, #4a74d9);
}

.page.theme-dark .menu-icon.bg-amber {
  background: linear-gradient(135deg, #b0722f, #c88843);
}

.page.theme-dark .menu-icon.bg-rose {
  background: linear-gradient(135deg, #b24978, #c65f8c);
}

.page.theme-dark .menu-icon.bg-slate {
  background: linear-gradient(135deg, #4e5f79, #60728d);
}

.page.theme-dark .menu-icon.bg-red {
  background: linear-gradient(135deg, #b14a4a, #c85d5d);
}
</style>
