<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="segment">
      <view
        v-for="item in modes"
        :key="item.key"
        class="segment-item"
        :class="{ active: mode === item.key }"
        @click="switchMode(item.key)"
      >
        {{ item.label }}
      </view>
    </view>

    <view v-if="mode !== 'today'" class="readonly-tip">
      <text>本周、全部为只读；点击任务查看完整详情；记录学习请切换到「今日」</text>
      <text v-if="mode === 'week'" class="readonly-link" @click="switchMode('today')">前往今日 ›</text>
    </view>

    <view v-if="loading" class="empty">加载中...</view>

    <!-- 今日：可上报、可记录 -->
    <block v-else-if="mode === 'today'">
      <view class="block-head">
        <text class="block-title">{{ displayDate }} · 今日任务</text>
      </view>
      <view v-if="taskList.length === 0" class="empty-card">今日暂无学习计划</view>
      <view v-else class="task-block">
        <view
          v-for="item in taskList"
          :key="item.id"
          class="task-row"
          @click="openTask(item, today)"
        >
          <view class="row-dot" :class="isTaskDone(item) ? 'done' : 'pending'" />
          <view class="row-main">
            <view class="row-top">
              <text class="row-title">{{ item.subject }}</text>
              <text class="row-tag" :class="isTaskDone(item) ? 'tag-done' : 'tag-pending'">
                {{ isTaskDone(item) ? '已完成' : '未完成' }}
              </text>
            </view>
            <text class="row-desc">{{ item.content }}</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
      </view>
      <button class="btn-add-task" @click="openAddTask()">+ 新增学习任务</button>
    </block>

    <!-- 本周：只读，按天分组 -->
    <block v-else-if="mode === 'week'">
      <view class="block-head">
        <text class="block-title">本周任务</text>
        <text class="block-sub">{{ weekRangeText }}</text>
      </view>
      <view v-if="weekGrouped.every((g) => g.items.length === 0)" class="empty-card">本周暂无学习计划</view>
      <view v-for="group in weekGrouped" :key="group.date" class="day-group">
        <view class="day-group-head" :class="{ today: group.isToday }">
          <text class="dg-weekday">{{ group.weekday }}</text>
          <text class="dg-date">{{ group.dateLabel }}</text>
          <text v-if="group.isToday" class="dg-badge">今天</text>
        </view>
        <view v-if="group.items.length === 0" class="day-empty">当日无任务</view>
        <view
          v-for="item in group.items"
          :key="item.id"
          class="task-row inset readonly"
          @click="openDetail(item)"
        >
          <view class="row-dot" :class="isTaskDone(item) ? 'done' : 'pending'" />
          <view class="row-main">
            <view class="row-top">
              <text class="row-title">{{ item.subject }}</text>
              <text class="row-tag" :class="isTaskDone(item) ? 'tag-done' : 'tag-pending'">
                {{ isTaskDone(item) ? '已完成' : '未完成' }}
              </text>
            </view>
            <text class="row-desc ellipsis">{{ item.content }}</text>
            <text class="row-meta">点击查看详情</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </block>

    <!-- 全部：只读，月历选日 + 选中日任务 -->
    <block v-else-if="mode === 'all'">
      <view class="cal-card">
        <view class="cal-head">
          <text class="cal-nav" @click="prevMonth">‹</text>
          <text class="cal-title">{{ calYear }}年{{ calMonth }}月</text>
          <text class="cal-nav" @click="nextMonth">›</text>
        </view>
        <view class="cal-weekdays">
          <text v-for="w in weekdays" :key="w" class="wd">{{ w }}</text>
        </view>
        <view class="cal-grid">
          <view v-for="(cell, idx) in calendarCells" :key="idx" class="cal-cell">
            <view
              v-if="!cell.empty"
              class="day-btn"
              :class="dayClass(cell.date)"
              @click="selectDate(cell.date)"
            >
              <text class="day-num" :class="{ today: cell.date === today }">{{ cell.day }}</text>
              <view
                v-if="dayStatusMap[cell.date] && dayStatusMap[cell.date] !== 'none'"
                class="day-dot"
                :class="dayStatusMap[cell.date]"
              />
            </view>
          </view>
        </view>
        <view class="legend">
          <view class="leg-item"><view class="leg-dot pending" /><text>未完成</text></view>
          <view class="leg-item"><view class="leg-dot done" /><text>已完成</text></view>
          <view class="leg-item"><view class="leg-dot over" /><text>超额完成</text></view>
        </view>
      </view>

      <view class="day-panel">
        <text class="day-title">{{ selectedDate }} 的任务</text>
        <view v-if="dayTasks.length === 0" class="day-empty">该日暂无计划</view>
        <view
          v-for="item in dayTasks"
          :key="item.id"
          class="task-row inset readonly"
          @click="openDetail(item)"
        >
          <view class="row-dot" :class="isTaskDone(item) ? 'done' : 'pending'" />
          <view class="row-main">
            <view class="row-top">
              <text class="row-title">{{ item.subject }}</text>
              <text class="row-tag" :class="isTaskDone(item) ? 'tag-done' : 'tag-pending'">
                {{ isTaskDone(item) ? '已完成' : '未完成' }}
              </text>
            </view>
            <text class="row-desc ellipsis">{{ item.content }}</text>
            <text class="row-meta">点击查看详情</text>
          </view>
          <text class="row-arrow">›</text>
        </view>
        <view v-if="selectedDate === today" class="day-readonly-hint" @click="switchMode('today')">
          需记录学习？请切换到「今日」
        </view>
      </view>
      <button class="btn-add-task" @click="openAddTask(selectedDate)">+ 新增学习任务</button>
    </block>

    <view class="page-bottom" />
  </scroll-view>

  <!-- 本周 / 全部：任务详情弹窗（只读） -->
  <view v-if="detailOpen" class="mask mask-modal" @click="closeDetail">
    <view class="modal-box" @click.stop>
      <view class="modal-header">
        <view class="modal-head-left">
          <text class="modal-subject">{{ detailDisplay?.subject }}</text>
          <text class="modal-tag" :class="detailDisplay?.reported ? 'done' : 'pending'">
            {{ detailDisplay?.reported ? '已完成' : '未完成' }}
          </text>
        </view>
        <text class="modal-close" @click="closeDetail">×</text>
      </view>
      <scroll-view class="modal-body" scroll-y>
        <view class="modal-section">
          <text class="modal-section-title">计划信息</text>
          <view v-for="row in detailPlanRows" :key="row.label" class="info-cell">
            <text class="info-icon">{{ row.icon }}</text>
            <view class="info-text">
              <text class="info-label">{{ row.label }}</text>
              <text class="info-value">{{ row.value }}</text>
            </view>
          </view>
        </view>
        <view class="modal-section">
          <text class="modal-section-title">上报记录</text>
          <view v-if="!detailDisplay?.reported">
            <view class="info-cell">
              <text class="info-icon">📌</text>
              <view class="info-text">
                <text class="info-label">完成状态</text>
                <text class="info-value">未完成</text>
              </view>
            </view>
            <view class="info-empty">尚未填写学习时段、时长与备注</view>
          </view>
          <view v-else>
            <view v-for="row in detailReportRows" :key="row.label" class="info-cell">
              <text class="info-icon">{{ row.icon }}</text>
              <view class="info-text">
                <text class="info-label">{{ row.label }}</text>
                <text class="info-value">{{ row.value }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
      <view v-if="detailTask?.date === today" class="modal-foot">
        <button class="btn-modal-action" @click="goTodayFromDetail">去今日记录</button>
      </view>
      <view v-else class="modal-foot hint-only">
        <text>仅支持在「今日」进行学习记录</text>
      </view>
    </view>
  </view>

</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import { goAddTaskWithAuth } from '@/utils/add-task.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loggedIn = useLoggedIn()

import {
  buildMonthCells,
  formatDateLabel,
  getDayStatus,
  getWeekDates,
  getTaskDisplay,
  isPlanItemDone,
  normalizePlanRow,
  todayStr
} from '@/utils/plan-store.js'

const STUDY_NAV_KEY = 'study_nav_payload'

const modes = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'all', label: '全部' }
]
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const today = todayStr()
const mode = ref('today')
const loading = ref(false)
const taskList = ref([])
const allItems = ref([])

const now = new Date()
const calYear = ref(now.getFullYear())
const calMonth = ref(now.getMonth() + 1)
const selectedDate = ref(today)

const detailOpen = ref(false)
const detailTask = ref(null)

const displayDate = computed(() => formatDateLabel(today))

const calendarCells = computed(() => buildMonthCells(calYear.value, calMonth.value))

const dayStatusMap = computed(() => {
  const map = {}
  if (mode.value !== 'all') return map
  calendarCells.value.forEach((c) => {
    if (!c.empty) {
      map[c.date] = getDayStatus(c.date, allItems.value)
    }
  })
  return map
})

const dayTasks = computed(() => allItems.value.filter((i) => i.date === selectedDate.value))

const weekGrouped = computed(() => {
  const days = getWeekDates()
  return days.map((d) => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
    items: taskList.value.filter((i) => i.date === d.date)
  }))
})

const weekRangeText = computed(() => {
  const days = getWeekDates()
  if (!days.length) return ''
  return `${formatDateLabel(days[0].date)} - ${formatDateLabel(days[6].date)}`
})

const detailDisplay = computed(() =>
  detailTask.value ? getTaskDisplay(detailTask.value) : null
)

const detailPlanRows = computed(() => {
  const t = detailDisplay.value
  if (!t) return []
  return [
    { icon: '📚', label: '科目', value: t.subject },
    { icon: '📝', label: '学习内容', value: t.content || '—' },
    { icon: '📅', label: '计划日期', value: t.date }
  ]
})

const detailReportRows = computed(() => {
  const t = detailDisplay.value
  if (!t || !t.reported) return []
  const rows = [
    { icon: '✅', label: '完成状态', value: '已完成' },
    { icon: '⏳', label: '实际时长', value: `${t.actualMinutes || 0} 分钟` }
  ]
  if (t.startTime || t.endTime) {
    rows.push({
      icon: '🕐',
      label: '学习时段',
      value: t.startTime && t.endTime ? `${t.startTime} - ${t.endTime}` : t.startTime || t.endTime || '—'
    })
  } else {
    rows.push({ icon: '🕐', label: '学习时段', value: '未填写' })
  }
  rows.push({ icon: '💬', label: '备注', value: t.note?.trim() ? t.note : '无' })
  return rows
})

const apiMap = {
  today: '/plans/today',
  week: '/plans/week',
  all: '/plans/all'
}

function isTaskDone(item) {
  return isPlanItemDone(item)
}

function dayClass(date) {
  const s = dayStatusMap.value[date]
  return {
    selected: date === selectedDate.value,
    [`st-${s}`]: s && s !== 'none'
  }
}

function selectDate(date) {
  selectedDate.value = date
  closeDetail()
}

function prevMonth() {
  if (calMonth.value === 1) {
    calMonth.value = 12
    calYear.value--
  } else calMonth.value--
}

function nextMonth() {
  if (calMonth.value === 12) {
    calMonth.value = 1
    calYear.value++
  } else calMonth.value++
}

function switchMode(key) {
  mode.value = key
  closeDetail()
  loadByMode()
}

function openDetail(item) {
  detailTask.value = item
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  detailTask.value = null
}

function goTodayFromDetail() {
  const item = detailTask.value
  closeDetail()
  switchMode('today')
  if (item) {
    setTimeout(() => openTask(item, today), 300)
  }
}

function goStudyPage(payload) {
  if (payload.mode === 'plan' && payload.task) {
    payload.task = normalizePlanRow(payload.task)
  }
  uni.setStorageSync(STUDY_NAV_KEY, payload)
  uni.navigateTo({ url: '/pages/task-study/task-study' })
}

async function loadByMode() {
  loading.value = true
  try {
    if (!loggedIn.value) {
      taskList.value = []
      if (mode.value === 'all') allItems.value = []
      return
    }
    const url = apiMap[mode.value]
    const data = await request({ url, showError: false })
    const list = (data?.list ?? []).map(normalizePlanRow)
    taskList.value = list
    if (mode.value === 'all') {
      allItems.value = list
      if (!list.some((i) => i.date === selectedDate.value)) {
        selectedDate.value = today
      }
    }
  } catch (e) {
    taskList.value = []
    if (mode.value === 'all') allItems.value = []
  } finally {
    loading.value = false
  }
}

function openTask(item, dateStr = today) {
  if (dateStr !== today) {
    uni.showToast({ title: '仅可记录今日学习', icon: 'none' })
    return
  }
  goStudyPage({ mode: 'plan', date: dateStr, task: item })
}

function openAddTask(dateStr) {
  goAddTaskWithAuth(loggedIn.value, dateStr)
}

function applyPrefill() {
  const d = uni.getStorageSync('plan_prefill_date')
  if (!d) return
  uni.removeStorageSync('plan_prefill_date')
  if (d === today) {
    mode.value = 'today'
  } else {
    mode.value = 'all'
    selectedDate.value = d
    const [y, m] = d.split('-')
    calYear.value = Number(y)
    calMonth.value = Number(m)
  }
}

function onPlanDataChanged() {
  loadByMode()
}

if (typeof uni !== 'undefined' && uni.$on) {
  uni.$on('plan-data-changed', onPlanDataChanged)
}

onUnload(() => {
  uni.$off?.('plan-data-changed', onPlanDataChanged)
})

onShow(() => {
  applyThemeUI('计划')
  applyPrefill()
  loadByMode()
})
</script>

<style lang="scss" scoped>
.page {
  height: 100vh;
  background: var(--theme-page-bg);
}

.segment {
  display: flex;
  margin: 20rpx 28rpx;
  padding: 8rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(30, 40, 80, 0.05);
  border: 1rpx solid var(--theme-border-soft);
}

.segment-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: var(--theme-text-sub);
  border-radius: 12rpx;
  border: 1rpx solid transparent;

  &.active {
    background: var(--theme-primary);
    color: #fff;
    font-weight: 600;
    border-color: var(--theme-primary);
  }
}

.readonly-tip {
  margin: 0 28rpx 16rpx;
  padding: 20rpx 24rpx;
  background: #fff8e6;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #b88230;
  line-height: 1.5;
}

.readonly-link {
  display: block;
  margin-top: 8rpx;
  color: var(--theme-primary);
  font-weight: 600;
}

.task-row.readonly {
  opacity: 0.96;
}

.row-arrow {
  color: #d1d5db;
  font-size: 36rpx;
  margin-left: 8rpx;
}

.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-readonly-hint {
  margin: 16rpx 24rpx 8rpx;
  padding: 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--theme-primary);
  background: var(--theme-input-bg);
  border-radius: 12rpx;
}

.block-head {
  padding: 8rpx 28rpx 16rpx;
}

.block-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.block-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.task-block,
.day-panel {
  margin: 0 28rpx 20rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.05);
  border: 1rpx solid rgba(79, 110, 247, 0.06);
}

.day-panel {
  padding-bottom: 16rpx;
}

.day-title {
  display: block;
  padding: 24rpx 24rpx 8rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.task-row {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.inset {
    margin: 0;
  }
}

.row-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  flex-shrink: 0;

  &.done {
    background: #22c55e;
  }
  &.pending {
    background: #f59e0b;
  }
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-top {
  display: flex;
  align-items: center;
}

.row-title {
  font-size: 28rpx;
  font-weight: 600;
  flex: 1;
  color: var(--theme-text-main);
}

.row-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;

  &.tag-done {
    background: #dcfce7;
    color: #16a34a;
  }
  &.tag-pending {
    background: #fef3c7;
    color: #d97706;
  }
}

.row-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.row-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.day-group {
  margin: 0 28rpx 20rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  overflow: hidden;
}

.day-group-head {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: var(--theme-input-bg);
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.today {
    background: #eef2ff;
  }
}

.dg-weekday {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  margin-right: 16rpx;
}

.dg-date {
  font-size: 26rpx;
  color: var(--theme-text-sub);
  flex: 1;
}

.dg-badge {
  font-size: 22rpx;
  color: var(--theme-primary);
  background: var(--theme-input-bg);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.day-empty {
  padding: 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.empty-card {
  margin: 0 28rpx;
  padding: 48rpx;
  text-align: center;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  color: var(--theme-text-sub);
  font-size: 28rpx;
}

.btn-add-task {
  display: block;
  margin: 24rpx 28rpx 8rpx;
  padding: 28rpx 32rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff !important;
  background: var(--theme-primary, #3f60ea) !important;
  border: none;
  border-radius: 20rpx;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.18);
  line-height: 1.3;
}

.btn-add-task::after {
  border: none;
}

.empty {
  text-align: center;
  padding: 48rpx;
  color: var(--theme-text-sub);
}

/* 日历（仅全部） */
.cal-card {
  margin: 0 28rpx 20rpx;
  padding: 24rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.cal-nav {
  font-size: 44rpx;
  color: var(--theme-primary);
  padding: 0 20rpx;
}

.cal-title {
  font-size: 32rpx;
  font-weight: 600;
}

.cal-weekdays {
  display: flex;
  margin-bottom: 8rpx;
}

.wd {
  flex: 1;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}

.cal-grid {
  display: flex;
  flex-wrap: wrap;
}

.cal-cell {
  width: 14.28%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &.selected {
    background: var(--theme-primary);
    .day-num {
      color: #fff;
    }
  }
  &.st-pending:not(.selected) {
    background: #fef3c7;
  }
  &.st-done:not(.selected) {
    background: #dcfce7;
  }
  &.st-over:not(.selected) {
    background: #ede9fe;
  }
}

.day-num {
  font-size: 28rpx;
  color: #374151;
  &.today {
    font-weight: 700;
    color: var(--theme-primary);
  }
}

.day-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  margin-top: 4rpx;
  &.pending {
    background: #f59e0b;
  }
  &.done {
    background: #22c55e;
  }
  &.over {
    background: #8b5cf6;
  }
}

.legend {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f3f4f6;
}

.leg-item {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #6b7280;
}

.leg-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
  margin-right: 8rpx;
  &.pending {
    background: #fef3c7;
    border: 2rpx solid #f59e0b;
  }
  &.done {
    background: #dcfce7;
    border: 2rpx solid #22c55e;
  }
  &.over {
    background: #ede9fe;
    border: 2rpx solid #8b5cf6;
  }
}

.page-bottom {
  height: 32rpx;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  z-index: 100;
}

.mask-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 32rpx;
  box-sizing: border-box;
  z-index: 102;
}

.modal-box {
  width: 100%;
  max-height: 78vh;
  z-index: 103;
  background: var(--theme-card-bg);
  border-radius: 28rpx;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24rpx 80rpx rgba(30, 40, 80, 0.2);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 28rpx 28rpx 20rpx;
  background: linear-gradient(135deg, var(--theme-input-bg) 0%, var(--theme-card-bg) 100%);
  border-bottom: 1rpx solid #e8ecf4;
}

.modal-head-left {
  flex: 1;
  padding-right: 16rpx;
}

.modal-subject {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1f36;
}

.modal-tag {
  display: inline-block;
  margin-top: 10rpx;
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;

  &.done {
    background: #dcfce7;
    color: #16a34a;
  }
  &.pending {
    background: #fef3c7;
    color: #d97706;
  }
}

.modal-close {
  font-size: 48rpx;
  color: #9ca3af;
  line-height: 1;
  padding: 0 8rpx;
}

.modal-body {
  flex: 1;
  max-height: 50vh;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
}

.modal-section {
  margin-bottom: 24rpx;
}

.modal-section-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 2rpx;
  margin-bottom: 16rpx;
}

.info-cell {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 16rpx;
  background: #f8fafc;
  border-radius: 14rpx;
  margin-bottom: 12rpx;
}

.info-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  line-height: 1.2;
}

.info-text {
  flex: 1;
}

.info-label {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  margin-bottom: 4rpx;
}

.info-value {
  font-size: 28rpx;
  color: #1f2937;
  line-height: 1.45;
  word-break: break-all;
}

.info-empty {
  padding: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #9ca3af;
  background: #f8fafc;
  border-radius: 14rpx;
}

.modal-foot {
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f3f4f6;

  &.hint-only {
    text-align: center;
    font-size: 24rpx;
    color: #9ca3af;
  }
}

.btn-modal-action {
  height: 80rpx;
  line-height: 80rpx;
  background: var(--theme-primary, #3f60ea) !important;
  color: #fff !important;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.btn-modal-action::after {
  border: none;
}

</style>
