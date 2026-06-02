<template>
  <theme-page-meta />
  <scroll-view
    class="page"
    :style="themeVars"
    scroll-y
    refresher-enabled
    :refresher-triggered="refreshing"
    @refresherrefresh="onRefresh"
  >
    <view v-if="!loggedIn" class="empty-wrap">
      <view class="empty-card">
        <text class="empty-icon">📒</text>
        <text class="empty-title">请先登录</text>
        <text class="empty-desc">注册并登录后可使用云端备忘录，多设备同步</text>
        <button class="btn-link" @click="goMine">前往「我的」</button>
      </view>
    </view>

    <block v-else>
      <view class="hero">
        <view class="hero-top">
          <text class="hero-title">我的备忘录</text>
          <view v-if="!loading || list.length" class="hero-badge">{{ total }} 条</view>
        </view>
        <text class="hero-desc">云端保存 · 随时记录学习要点与待办</text>
      </view>

      <view class="search-wrap">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索标题或内容"
            confirm-type="search"
            @confirm="onSearch"
          />
          <text v-if="keyword" class="search-clear" @click="clearSearch">清除</text>
        </view>
      </view>

      <view v-if="loading && !list.length" class="state-line">
        <view class="loading-dot" />
        <text>加载中…</text>
      </view>

      <view v-else-if="!list.length" class="empty-wrap">
        <view class="empty-card">
          <text class="empty-icon">{{ keyword ? '🔎' : '📒' }}</text>
          <text class="empty-title">{{ keyword ? '未找到相关备忘录' : '暂无备忘录' }}</text>
          <text class="empty-desc">
            {{ keyword ? '换个关键词试试' : '记录第一条学习笔记或待办事项吧' }}
          </text>
          <button v-if="!keyword" class="btn-link" @click="openCreate">新建备忘录</button>
        </view>
      </view>

      <view v-else class="memo-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="memo-card"
          hover-class="memo-card-hover"
          @click="openEdit(item)"
        >
          <view class="memo-accent" />
          <view class="memo-body">
            <view class="memo-head">
              <view class="memo-title-wrap">
                <text class="memo-icon">📌</text>
                <text class="memo-title">{{ item.title || '无标题' }}</text>
              </view>
              <text class="memo-arrow">›</text>
            </view>
            <text class="memo-preview">{{ previewContent(item.content) }}</text>
            <view class="memo-foot">
              <text class="memo-time">{{ formatTime(item.updatedAt || item.createdAt) }}</text>
              <view class="memo-actions" @click.stop>
                <text class="act-link" @click="openEdit(item)">编辑</text>
                <text class="act-divider">|</text>
                <text class="act-link danger" @click="onDelete(item)">删除</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more">
        <button class="btn-more" :loading="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中…' : '加载更多' }}
        </button>
      </view>
    </block>

    <view class="foot-spacer" />
  </scroll-view>

  <view v-if="loggedIn" class="foot-bar" :style="themeVars">
    <button class="btn-submit full" @click="openCreate">
      <text class="btn-plus">＋</text>
      <text>新建备忘录</text>
    </button>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loggedIn = useLoggedIn()
const list = ref([])
const keyword = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const page = ref(1)
const total = ref(0)
const pageSize = 30

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const hasMore = computed(() => list.value.length < total.value)

function previewContent(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (!s) return '（无内容）'
  return s.length > 100 ? `${s.slice(0, 100)}…` : s
}

function formatTime(raw) {
  if (!raw) return ''
  const s = String(raw).replace('T', ' ').slice(0, 19)
  const d = new Date(s.replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return s.slice(0, 16)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const that = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = (today - that) / 86400000

  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (diff === 0) return `今天 ${hm}`
  if (diff === 1) return `昨天 ${hm}`
  if (diff < 7) return `${diff} 天前`
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function buildQuery(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

async function fetchList(append = false) {
  const p = append ? page.value + 1 : 1
  if (append) loadingMore.value = true
  else loading.value = true

  try {
    const qs = buildQuery({
      page: p,
      pageSize,
      keyword: keyword.value.trim()
    })
    const data = await request({
      url: qs ? `/memos?${qs}` : '/memos',
      method: 'GET',
      showError: !append
    })
    const rows = data?.list || []
    total.value = data?.total || 0
    page.value = p
    list.value = append ? [...list.value, ...rows] : rows
  } catch (e) {
    if (!append) list.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

function onSearch() {
  page.value = 1
  fetchList(false)
}

function clearSearch() {
  keyword.value = ''
  onSearch()
}

function reload() {
  page.value = 1
  fetchList(false)
}

function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  fetchList(true)
}

async function onRefresh() {
  refreshing.value = true
  await fetchList(false)
}

function openCreate() {
  uni.navigateTo({ url: '/pages/memos/memo-edit' })
}

function openEdit(item) {
  uni.navigateTo({ url: `/pages/memos/memo-edit?id=${item.id}` })
}

function onDelete(item) {
  const title = item.title || '无标题'
  uni.showModal({
    title: '删除备忘录',
    content: `确定删除「${title}」？删除后无法恢复。`,
    confirmColor: '#dc2626',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await request({ url: `/memos/${item.id}`, method: 'DELETE' })
        uni.showToast({ title: '已删除', icon: 'success' })
        reload()
      } catch (e) {
        uni.showToast({ icon: 'none', title: e.message || '删除失败' })
      }
    }
  })
}

function goMine() {
  uni.switchTab({ url: '/pages/mine/mine' })
}

onShow(() => {
  applyThemeUI('备忘录')
  if (loggedIn.value) reload()
  else {
    list.value = []
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/buttons.scss';

.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding-bottom: 180rpx;
  box-sizing: border-box;
}

.hero {
  margin: 24rpx 28rpx 20rpx;
  padding: 32rpx 28rpx;
  background: var(--theme-hero-gradient);
  border-radius: 24rpx;
  color: #fff;
  box-shadow: 0 12rpx 32rpx rgba(63, 96, 234, 0.22);
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.hero-title {
  font-size: 40rpx;
  font-weight: 700;
}

.hero-badge {
  padding: 6rpx 18rpx;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
  opacity: 0.92;
}

.search-wrap {
  padding: 0 28rpx 16rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 20rpx;
  height: 80rpx;
  background: var(--theme-card-bg);
  border-radius: 999rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 4rpx 16rpx rgba(30, 40, 80, 0.04);
}

.search-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
}

.search-clear {
  flex-shrink: 0;
  font-size: 24rpx;
  color: var(--theme-primary);
  padding: 8rpx 0;
}

.state-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 64rpx 28rpx;
  color: var(--theme-text-sub);
  font-size: 28rpx;
}

.loading-dot {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--theme-border-soft);
  border-top-color: var(--theme-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-wrap {
  padding: 0 28rpx;
}

.empty-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 56rpx 40rpx;
  text-align: center;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.05);
}

.empty-icon {
  display: block;
  font-size: 72rpx;
  line-height: 1;
  margin-bottom: 20rpx;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.empty-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.55;
}

.btn-link {
  margin-top: 32rpx;
  background: var(--theme-primary);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 999rpx;
  border: none;
  padding: 0 48rpx;
  height: 80rpx;
  line-height: 80rpx;

  &::after {
    border: none;
  }
}

.memo-list {
  padding: 0 28rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.memo-card {
  display: flex;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  overflow: hidden;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 8rpx 24rpx rgba(30, 40, 80, 0.06);
}

.memo-card-hover {
  opacity: 0.92;
  transform: scale(0.995);
}

.memo-accent {
  width: 8rpx;
  flex-shrink: 0;
  background: linear-gradient(180deg, #14b8a6 0%, #0d9488 100%);
}

.memo-body {
  flex: 1;
  min-width: 0;
  padding: 24rpx 24rpx 20rpx;
}

.memo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.memo-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.memo-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.memo-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-arrow {
  font-size: 36rpx;
  color: var(--theme-text-sub);
  opacity: 0.5;
  line-height: 1;
  flex-shrink: 0;
}

.memo-preview {
  margin-top: 14rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.memo-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--theme-border-soft);
}

.memo-time {
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.memo-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.act-link {
  font-size: 24rpx;
  color: var(--theme-primary);
  padding: 4rpx 8rpx;

  &.danger {
    color: #dc2626;
  }
}

.act-divider {
  font-size: 22rpx;
  color: var(--theme-border-soft);
}

.load-more {
  margin: 24rpx 28rpx 0;
  text-align: center;
}

.btn-more {
  font-size: 26rpx;
  background: var(--theme-card-bg);
  color: var(--theme-primary);
  border: 1rpx solid var(--theme-border-soft);
  border-radius: 999rpx;
  padding: 0 40rpx;
  height: 72rpx;
  line-height: 72rpx;

  &::after {
    border: none;
  }
}

.foot-spacer {
  height: 32rpx;
}

.foot-bar .btn-submit.full {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.btn-plus {
  font-size: 36rpx;
  font-weight: 400;
  line-height: 1;
}
</style>
