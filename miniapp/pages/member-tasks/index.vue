<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <text class="hero-title">学员任务查看</text>
      <text class="hero-desc">L10 管理员可查看指定成员每日任务完成与上报情况</text>
    </view>

    <view class="card">
      <view class="form-item">
        <text class="label">选择学员</text>
        <input
          v-model="studentKeyword"
          class="input"
          placeholder="搜索昵称 / 手机号 / 姓名"
          maxlength="30"
          @confirm="loadStudents"
        />
        <picker
          mode="selector"
          :range="studentOptions"
          range-key="label"
          :value="studentIndex"
          @change="onStudentChange"
        >
          <view class="pick-row">
            <text class="pick-val">{{ currentStudentLabel }}</text>
            <text class="pick-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-item last">
        <text class="label">查看日期</text>
        <picker mode="date" :value="selectedDate" @change="onDateChange">
          <view class="pick-row">
            <text class="pick-val">{{ dateLabel }}</text>
            <text class="pick-arrow">›</text>
          </view>
        </picker>
      </view>
    </view>

    <view v-if="selectedUserId" class="summary-card">
      <text class="summary-name">{{ currentStudentLabel }}</text>
      <text class="summary-date">{{ dateLabel }}</text>
      <view class="summary-stats">
        <view class="stat">
          <text class="stat-num">{{ summary.total }}</text>
          <text class="stat-label">总任务</text>
        </view>
        <view class="stat ok">
          <text class="stat-num">{{ summary.done }}</text>
          <text class="stat-label">已完成</text>
        </view>
        <view class="stat pending">
          <text class="stat-num">{{ summary.pending }}</text>
          <text class="stat-label">未完成</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!selectedUserId" class="empty-card">请先选择学员</view>
    <view v-else-if="taskList.length === 0" class="empty-card">该日暂无学习任务</view>
    <view v-else class="task-block">
      <view v-for="item in taskList" :key="item.id" class="task-row" @click="openDetail(item)">
        <view class="row-dot" :class="isPlanItemDone(item) ? 'done' : 'pending'" />
        <view class="row-main">
          <view class="row-top">
            <text class="row-title">{{ item.subject }}</text>
            <text class="row-tag" :class="isPlanItemDone(item) ? 'tag-done' : 'tag-pending'">
              {{ isPlanItemDone(item) ? '已完成' : '未完成' }}
            </text>
          </view>
          <text class="row-desc">{{ item.content }}</text>
          <text v-if="item.reported" class="row-meta">
            已学 {{ item.actualMinutes || 0 }} 分钟
            <text v-if="item.startTime && item.endTime"> · {{ item.startTime }}-{{ item.endTime }}</text>
          </text>
        </view>
        <text class="row-arrow">›</text>
      </view>
    </view>

    <view class="page-bottom" />
  </scroll-view>

  <view v-if="detailOpen" class="mask" @click="closeDetail">
    <view class="modal-box" @click.stop>
      <view class="modal-head">
        <text class="modal-title">{{ detailTask?.subject }}</text>
        <text class="modal-close" @click="closeDetail">×</text>
      </view>
      <scroll-view class="modal-body" scroll-y>
        <view class="info-row">
          <text class="info-label">学习内容</text>
          <text class="info-value">{{ detailTask?.content || '—' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">完成状态</text>
          <text class="info-value">{{ detailTask?.reported ? '已完成' : '未完成' }}</text>
        </view>
        <view v-if="detailTask?.reported" class="info-row">
          <text class="info-label">实际时长</text>
          <text class="info-value">{{ detailTask?.actualMinutes || 0 }} 分钟</text>
        </view>
        <view v-if="detailTask?.note" class="info-row">
          <text class="info-label">备注</text>
          <text class="info-value">{{ detailTask.note }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { isFinalAdmin } from '@/utils/permission.js'
import {
  formatDateLabel,
  getTaskDisplay,
  isPlanItemDone,
  normalizePlanRow,
  todayStr
} from '@/utils/plan-store.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { goTabBar } from '@/utils/nav.js'

const today = todayStr()
const permLevel = ref(0)
const loading = ref(false)
const studentKeyword = ref('')
const students = ref([])
const studentIndex = ref(0)
const selectedDate = ref(today)
const taskList = ref([])
const summary = ref({ total: 0, done: 0, pending: 0 })
const detailOpen = ref(false)
const detailTask = ref(null)

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const studentOptions = computed(() =>
  students.value.map((s) => ({
    id: s.id,
    label: `${s.nickname || '学员'}${s.phone ? ` · ${s.phone}` : ''}${s.realName ? `（${s.realName}）` : ''}`
  }))
)

const selectedUserId = computed(() => studentOptions.value[studentIndex.value]?.id ?? null)
const currentStudentLabel = computed(() => studentOptions.value[studentIndex.value]?.label || '请选择学员')
const dateLabel = computed(() => {
  if (!selectedDate.value) return '请选择日期'
  if (selectedDate.value === today) return `今天（${formatDateLabel(selectedDate.value)}）`
  return formatDateLabel(selectedDate.value)
})

function onStudentChange(e) {
  studentIndex.value = Number(e.detail.value) || 0
  loadTasks()
}

function onDateChange(e) {
  selectedDate.value = e.detail.value
  loadTasks()
}

async function loadProfile() {
  try {
    const data = await request({ url: '/auth/me', showError: false })
    permLevel.value = data?.permLevel ?? 0
  } catch (_) {
    permLevel.value = 0
  }
  if (!isFinalAdmin(permLevel.value)) {
    uni.showToast({ title: '需要 L10 管理员权限', icon: 'none' })
    goTabBar('/pages/mine/mine')
  }
}

async function loadStudents() {
  try {
    const qs = studentKeyword.value.trim()
      ? `?keyword=${encodeURIComponent(studentKeyword.value.trim())}&pageSize=50`
      : '?pageSize=50'
    const data = await request({ url: `/auth/students${qs}`, showError: false })
    students.value = data?.list || []
    if (studentIndex.value >= studentOptions.value.length) {
      studentIndex.value = 0
    }
    if (students.value.length && selectedUserId.value) {
      loadTasks()
    }
  } catch (_) {
    students.value = []
  }
}

async function loadTasks() {
  if (!selectedUserId.value || !selectedDate.value) return
  loading.value = true
  try {
    const data = await request({
      url: `/plans/day?date=${selectedDate.value}&userId=${selectedUserId.value}`,
      showError: true
    })
    taskList.value = (data?.list || []).map(normalizePlanRow)
    summary.value = data?.summary || {
      total: taskList.value.length,
      done: taskList.value.filter((i) => i.reported).length,
      pending: 0
    }
    if (summary.value.pending == null) {
      summary.value.pending = summary.value.total - summary.value.done
    }
  } catch (e) {
    taskList.value = []
    summary.value = { total: 0, done: 0, pending: 0 }
  } finally {
    loading.value = false
  }
}

function openDetail(item) {
  detailTask.value = getTaskDisplay(item)
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  detailTask.value = null
}

let searchTimer = null
watch(studentKeyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadStudents, 400)
})

watch(selectedUserId, (id) => {
  if (id) loadTasks()
})

onShow(async () => {
  applyThemeUI('学员任务查看')
  await loadProfile()
  if (isFinalAdmin(permLevel.value)) {
    await loadStudents()
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding-bottom: 32rpx;
  box-sizing: border-box;
}

.hero {
  margin: 24rpx 28rpx;
  padding: 32rpx 28rpx;
  background: var(--theme-hero-gradient);
  border-radius: 24rpx;
  color: #fff;
}

.hero-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  opacity: 0.92;
}

.card {
  margin: 0 28rpx 20rpx;
  padding: 8rpx 24rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.form-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.last {
    border-bottom: none;
  }
}

.label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  margin-bottom: 12rpx;
}

.input {
  width: 100%;
  height: 72rpx;
  padding: 0 20rpx;
  margin-bottom: 12rpx;
  background: var(--theme-input-bg);
  border-radius: 12rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

.pick-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: var(--theme-input-bg);
  border-radius: 12rpx;
}

.pick-val {
  font-size: 28rpx;
  color: var(--theme-primary);
  font-weight: 600;
}

.pick-arrow {
  color: #9ca3af;
  font-size: 32rpx;
}

.summary-card {
  margin: 0 28rpx 20rpx;
  padding: 24rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
}

.summary-name {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.summary-date {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.summary-stats {
  display: flex;
  margin-top: 20rpx;
  gap: 16rpx;
}

.stat {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: var(--theme-input-bg);

  &.ok .stat-num {
    color: #16a34a;
  }
  &.pending .stat-num {
    color: #d97706;
  }
}

.stat-num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: var(--theme-primary);
}

.stat-label {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.task-block {
  margin: 0 28rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  overflow: hidden;
  border: 1rpx solid var(--theme-border-soft);
}

.task-row {
  display: flex;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &:last-child {
    border-bottom: none;
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
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
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

.row-arrow {
  color: #d1d5db;
  font-size: 32rpx;
}

.empty,
.empty-card {
  margin: 0 28rpx;
  padding: 48rpx 24rpx;
  text-align: center;
  font-size: 26rpx;
  color: var(--theme-text-sub);
}

.empty-card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
}

.page-bottom {
  height: 32rpx;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.modal-box {
  width: 100%;
  max-height: 70vh;
  background: var(--theme-card-bg);
  border-radius: 28rpx 28rpx 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.modal-close {
  font-size: 44rpx;
  color: var(--theme-text-sub);
  line-height: 1;
}

.modal-body {
  max-height: 50vh;
  padding: 16rpx 28rpx 32rpx;
}

.info-row {
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.info-value {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
  line-height: 1.5;
}
</style>
