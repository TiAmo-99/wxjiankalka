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
            <text class="profile-subtitle">{{ loggedIn ? '简卡拉卡Tool 运维账号' : '点击卡片登录或注册' }}</text>
          </view>
          <text class="profile-arrow">›</text>
        </view>
        <view class="profile-quote">
          <text class="quote-mark">“</text>
          <text class="signature-text">{{ profileMotto || '现场调试，安全运维' }}</text>
        </view>
      </view>
    </view>

    <view v-if="!loggedIn" class="guest-tip">
      <text class="guest-icon">👋</text>
      <text>{{ guestTip }}</text>
    </view>

    <view v-if="loggedIn" class="perm-panel">
      <text class="perm-panel-title">运维权限</text>
      <text class="perm-panel-desc">{{ permLabel(permLevel) }} · 蓝牙调试需 L3+</text>
    </view>

    <template v-if="loggedIn">
      <view class="section-label">账户</view>
      <view class="menu-card">
        <view class="menu-item" @click="goProfile">
          <view class="menu-icon bg-indigo">👤</view>
          <view class="menu-body">
            <text class="menu-text">个人资料</text>
            <text class="menu-sub">昵称与联系方式</text>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="menu-item" @click="goSetPassword">
          <view class="menu-icon bg-teal">🔒</view>
          <view class="menu-body">
            <text class="menu-text">{{ hasPassword ? '修改密码' : '设置密码' }}</text>
            <text class="menu-sub">{{ passwordMenuSub }}</text>
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
        <view class="menu-item last" @click="goPermissionApply">
          <view class="menu-icon bg-rose">🔑</view>
          <view class="menu-body">
            <text class="menu-text">权限申请</text>
            <text class="menu-sub">{{ permApplySub }}</text>
          </view>
          <view v-if="hasPendingPerm" class="badge">审核中</view>
          <text class="arrow">›</text>
        </view>
      </view>
    </template>

    <view class="footer">
      <text>简卡拉卡Tool</text>
      <view class="legal-links">
        <text class="legal-link" @click="goPrivacy">隐私政策</text>
        <text class="legal-dot">·</text>
        <text class="legal-link" @click="goUserAgreement">用户服务协议</text>
      </view>
    </view>
    <view class="page-bottom" />
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { logout, wxLogin, useLoggedIn } from '@/utils/auth.js'
import { usePhoneAuth } from '@/utils/platform.js'
import { openPrivacyPolicy, openUserAgreement } from '@/utils/legal.js'
import { isFinalAdmin, permLabel } from '@/utils/permission.js'
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

const loggedIn = useLoggedIn()
const phoneAuth = usePhoneAuth()
const profileMotto = ref('')
const themeName = ref(getTheme().name)
const hasPassword = ref(true)

const guestTip = computed(() =>
  phoneAuth
    ? '首次使用请先「注册」，已有账号点卡片选择登录'
    : '首次使用请先「注册」，已有账号可微信或密码登录'
)
const passwordMenuSub = computed(() => {
  if (hasPassword.value) return '更新账号密码，可用于密码登录'
  return phoneAuth ? '注册时已设置，可在此修改' : '设置后可使用手机号 + 密码登录'
})

const loginDesc = computed(() => {
  if (!loggedIn.value) return '登录后同步学习数据'
  if (profileMotto.value) return profileMotto.value
  return permLabel(permLevel.value)
})

const permApplySub = computed(() => {
  if (isFinalAdmin(permLevel.value)) return 'L10 管理员 · 审核他人申请'
  return hasPendingPerm.value ? '申请审核中，点击查看' : '申请更高权限等级'
})

const isAdminUser = computed(() => isFinalAdmin(permLevel.value))

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
    hasPassword.value = true
    return
  }
  try {
    const data = await request({ url: '/auth/me', showError: false })
    nickname.value = data?.nickname || '学员'
    avatarText.value = (nickname.value[0] || '学').toUpperCase()
    profileMotto.value = data?.motto || ''
    permLevel.value = data?.permLevel ?? 0
    hasPassword.value = data?.hasPassword !== false
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

function goPrivacy() {
  openPrivacyPolicy()
}

function goUserAgreement() {
  openUserAgreement()
}

function goPhoneLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function goSetPassword() {
  if (loggedIn.value && hasPassword.value) {
    uni.navigateTo({ url: '/pages/set-password/set-password?mode=change' })
    return
  }
  uni.navigateTo({ url: '/pages/set-password/set-password' })
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/profile' })
}

function goPermissionApply() {
  uni.navigateTo({ url: '/pages/permission-apply/permission-apply' })
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

function handleLogout() {
  logout()
  nickname.value = '未登录'
  avatarText.value = '?'
  permLevel.value = 0
  hasPendingPerm.value = false
  uni.showToast({ title: '已退出', icon: 'none' })
}

function openProfileActions() {
  if (loggedIn.value) {
    uni.showActionSheet({
      itemList: ['修改信息', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) goProfile()
        else if (res.tapIndex === 1) handleLogout()
      }
    })
    return
  }

  const itemList = phoneAuth
    ? ['账号密码登录', '注册']
    : ['微信一键登录', '账号密码登录', '注册']

  uni.showActionSheet({
    itemList,
    success: (res) => {
      if (phoneAuth) {
        if (res.tapIndex === 0) goPhoneLogin()
        else if (res.tapIndex === 1) goRegister()
        return
      }
      if (res.tapIndex === 0) handleLogin()
      else if (res.tapIndex === 1) goPhoneLogin()
      else if (res.tapIndex === 2) goRegister()
    }
  })
}

onShow(() => {
  themeName.value = getTheme().name
  applyThemeUI('我的')
  loadProfile()
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

.perm-panel {
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(30, 40, 80, 0.06);
}

.perm-panel-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--theme-text-main);
  margin-bottom: 8rpx;
}

.perm-panel-desc {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
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

  &.bg-cyan {
    background: linear-gradient(135deg, #cffafe, #a5f3fc);
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

.legal-links {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
  gap: 8rpx;
}

.legal-link {
  font-size: 22rpx;
  color: var(--theme-primary);
}

.legal-dot {
  font-size: 22rpx;
  color: var(--theme-text-sub);
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

/* 女神粉：更柔和的卡片氛围与高光 */
.page.theme-goddess .profile-card {
  box-shadow: 0 8rpx 28rpx rgba(236, 95, 154, 0.16);
}

/* 酷夜黑：更清晰分层与冷色高亮 */
.page.theme-dark .profile-card {
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.32);
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
