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
    <view v-if="!loggedIn" class="empty-card">
      <text class="empty-title">请先登录</text>
      <text class="empty-desc">登录后可查看学习记录</text>
      <button class="btn-link" @click="goMine">前往「我的」</button>
    </view>

    <block v-else>
      <view class="filter-row">
        <view
          v-for="item in ranges"
          :key="item.key"
          class="filter-chip"
          :class="{ active: rangeKey === item.key }"
          @click="switchRange(item.key)"
        >
          {{ item.label }}
        </view>
      </view>

      <view v-if="loading && !groups.length" class="loading-tip">加载中...</view>
      <view v-else-if="!groups.length" class="empty-card">
        <text class="empty-title">暂无学习记录</text>
        <text class="empty-desc">在「计划」中完成任务并提交后，记录会显示在这里</text>
      </view>

      <view v-for="group in groups" :key="group.date" class="day-block">
        <view class="day-head">
          <text class="day-label">{{ group.label }}</text>
          <text class="day-sum">{{ group.totalMinutes }} 分钟</text>
        </view>
        <view class="record-card">
          <view
            v-for="row in group.items"
            :key="row.id"
            class="record-row"
            @click="openDetail(row)"
          >
            <view class="record-main">
              <view class="record-top">
                <text class="record-subject">{{ row.subject }}</text>
                <text class="record-tag" :class="row.completed ? 'done' : 'pending'">
                  {{ row.completed ? '已完成' : '未完成' }}
                </text>
              </view>
              <text class="record-content">{{ row.content || '—' }}</text>
              <text class="record-meta">
                {{ formatMeta(row) }}
              </text>
            </view>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <view v-if="hasMore" class="load-more">
        <button class="btn-more" :loading="loadingMore" @click="loadMore">加载更多</button>
      </view>
    </block>

    <view class="page-bottom" />
  </scroll-view>

  <view v-if="detailOpen" class="mask" @click="closeDetail" />
  <view class="sheet" :class="{ show: detailOpen }">
    <view class="sheet-head">
      <text class="sheet-title">记录详情</text>
      <text class="sheet-close" @click="closeDetail">×</text>
    </view>
    <scroll-view v-if="active" class="sheet-body" scroll-y>
      <view class="detail-row">
        <text class="detail-label">日期</text>
        <text class="detail-val">{{ active.reportDate }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">科目</text>
        <text class="detail-val">{{ active.subject }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">内容</text>
        <text class="detail-val">{{ active.content || '—' }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">学习时长</text>
        <text class="detail-val">{{ active.actualMinutes }} 分钟</text>
      </view>
      <view v-if="active.startTime || active.endTime" class="detail-row">
        <text class="detail-label">时段</text>
        <text class="detail-val">{{ active.startTime || '—' }} — {{ active.endTime || '—' }}</text>
      </view>
      <view class="detail-row">
        <text class="detail-label">完成状态</text>
        <text class="detail-val">{{ active.completed ? '已完成' : '未完成' }}</text>
      </view>
      <view v-if="active.note" class="detail-row">
        <text class="detail-label">备注</text>
        <text class="detail-val">{{ active.note }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import { formatDateLabel, todayStr } from '@/utils/plan-store.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loggedIn = useLoggedIn()
const today = todayStr()

const ranges = [
  { key: '7', label: '近 7 天', days: 7 },
  { key: '30', label: '近 30 天', days: 30 },
  { key: '90', label: '近 90 天', days: 90 }
]

const rangeKey = ref('30')
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 30

const detailOpen = ref(false)
const active = ref(null)
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const groups = computed(() => {
  const map = new Map()
  for (const row of list.value) {
    const date = row.reportDate
    if (!map.has(date)) {
      map.set(date, {
        date,
        label: date === today ? `今天 · ${formatDateLabel(date)}` : formatDateLabel(date),
        items: [],
        totalMinutes: 0
      })
    }
    const g = map.get(date)
    g.items.push(row)
    g.totalMinutes += Number(row.actualMinutes) || 0
  }
  return [...map.values()]
})

const hasMore = computed(() => list.value.length < total.value)

function dateOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() - (days - 1))
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const queryRange = computed(() => {
  const item = ranges.find((r) => r.key === rangeKey.value) || ranges[1]
  return { from: dateOffset(item.days), to: today }
})

function formatMeta(row) {
  const parts = [`${row.actualMinutes || 0} 分钟`]
  if (row.startTime && row.endTime) parts.push(`${row.startTime}–${row.endTime}`)
  if (row.isOther) parts.push('其他学习')
  return parts.join(' · ')
}

function goMine() {
  uni.switchTab({ url: '/pages/mine/mine' })
}

function openDetail(row) {
  active.value = row
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  active.value = null
}

async function fetchList(append = false) {
  if (!loggedIn.value) return
  const nextPage = append ? page.value + 1 : 1
  if (append) loadingMore.value = true
  else loading.value = true

  try {
    const data = await request({
      url: '/reports',
      method: 'GET',
      data: {
        from: queryRange.value.from,
        to: queryRange.value.to,
        page: nextPage,
        pageSize
      },
      showError: !append,
      showLoading: !append && !refreshing.value
    })
    const rows = data?.list || []
    total.value = data?.total ?? rows.length
    page.value = nextPage
    list.value = append ? [...list.value, ...rows] : rows
  } catch (e) {
    if (!append) list.value = []
  } finally {
    loading.value = false
    loadingMore.value = false
    refreshing.value = false
  }
}

function switchRange(key) {
  if (rangeKey.value === key) return
  rangeKey.value = key
  page.value = 1
  fetchList(false)
}

function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  fetchList(true)
}

async function onRefresh() {
  refreshing.value = true
  page.value = 1
  await fetchList(false)
}

onShow(() => {
  applyThemeUI('学习记录')
  if (!loggedIn.value) return
  page.value = 1
  fetchList(false)
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx;
  box-sizing: border-box;
}

.filter-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.filter-chip {
  padding: 12rpx 28rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  background: var(--theme-card-bg);
  border-radius: 999rpx;
  border: 2rpx solid var(--theme-border-soft);

  &.active {
    color: var(--theme-primary);
    border-color: var(--theme-primary);
    background: var(--theme-input-bg);
    font-weight: 600;
  }
}

.day-block {
  margin-bottom: 24rpx;
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 8rpx 16rpx;
}

.day-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.day-sum {
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.record-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.05);
  border: 1rpx solid rgba(79, 110, 247, 0.06);
}

.record-row {
  display: flex;
  align-items: center;
  padding: 28rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &:last-child {
    border-bottom: none;
  }
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.record-subject {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.record-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;

  &.done {
    color: #059669;
    background: #ecfdf5;
  }

  &.pending {
    color: #d97706;
    background: #fffbeb;
  }
}

.record-content {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.arrow {
  color: #d1d5db;
  font-size: 32rpx;
  margin-left: 12rpx;
}

.empty-card,
.loading-tip {
  padding: 48rpx 32rpx;
  text-align: center;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.empty-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
}

.btn-link {
  margin-top: 28rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: var(--theme-primary, #3f60ea) !important;
  color: #fff !important;
  border: none;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.12);
}

.btn-link::after {
  border: none;
}

.load-more {
  padding: 16rpx 0 8rpx;
}

.btn-more {
  background: var(--theme-card-bg);
  color: var(--theme-primary);
  border: 2rpx solid var(--theme-primary);
  border-radius: 44rpx;
  font-size: 28rpx;
}

.btn-more::after {
  border: none;
}

.page-bottom {
  height: 48rpx;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 75vh;
  background: var(--theme-card-bg);
  border-radius: 28rpx 28rpx 0 0;
  z-index: 101;
  transform: translateY(100%);
  transition: transform 0.25s ease;

  &.show {
    transform: translateY(0);
  }
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.sheet-close {
  font-size: 44rpx;
  color: #9ca3af;
  line-height: 1;
  padding: 0 8rpx;
}

.sheet-body {
  max-height: 60vh;
  padding: 16rpx 32rpx 48rpx;
  box-sizing: border-box;
}

.detail-row {
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.detail-label {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  margin-bottom: 8rpx;
}

.detail-val {
  font-size: 28rpx;
  color: var(--theme-text-main);
  line-height: 1.5;
}
</style>
