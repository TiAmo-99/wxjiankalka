<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <view class="hero-badge">{{ mode === 'other' ? '其他学习' : '今日任务' }}</view>
      <text class="hero-title">{{ heroTitle }}</text>
      <text v-if="heroSubtitle" class="hero-desc">{{ heroSubtitle }}</text>
      <view v-if="mode === 'plan' && task" class="hero-meta">
        <text>{{ reportDate }}</text>
      </view>
    </view>

    <!-- 其他学习：科目与内容 -->
    <view v-if="mode === 'other'" class="card">
      <view class="form-item">
        <text class="label">科目 / 类别</text>
        <input v-model="form.otherSubject" class="input" placeholder="如：数学、专业课" />
      </view>
      <view class="form-item last">
        <text class="label">学习内容</text>
        <textarea v-model="form.otherContent" class="textarea" placeholder="请描述本次学习内容" />
      </view>
    </view>

    <!-- 计时器 -->
    <view class="timer-card">
      <view class="timer-head">
        <text class="timer-label">学习计时</text>
        <view class="status-pill" :class="timerStatus">
          {{ statusText }}
        </view>
      </view>

      <view class="timer-display-wrap">
        <text class="timer-display">{{ displayElapsed }}</text>
      </view>

      <view class="timer-actions">
        <button
          v-if="timerState === 'idle' || timerState === 'stopped'"
          class="btn-timer primary"
          @click="startTimer"
        >
          {{ timerState === 'stopped' ? '重新开始' : '开始计时' }}
        </button>
        <template v-else-if="timerState === 'running'">
          <button class="btn-timer secondary" @click="pauseTimer">暂停</button>
          <button class="btn-timer danger" @click="stopTimer">结束计时</button>
        </template>
        <template v-else-if="timerState === 'paused'">
          <button class="btn-timer primary" @click="resumeTimer">继续</button>
          <button class="btn-timer danger" @click="stopTimer">结束计时</button>
        </template>
      </view>

      <text v-if="timerHint" class="timer-hint">{{ timerHint }}</text>
    </view>

    <!-- 学习记录 -->
    <view class="section-title">学习记录</view>
    <view class="card">
      <view class="form-item switch-row">
        <view>
          <text class="label">是否完成</text>
          <text class="hint">标记本条任务完成状态</text>
        </view>
        <switch :checked="form.completed" :color="themePrimary" @change="(e) => (form.completed = e.detail.value)" />
      </view>

      <view class="form-item">
        <text class="label">学习时长</text>
        <text class="hint">由计时自动统计，不可手动修改</text>
        <view class="minutes-row readonly">
          <text class="minutes-display">{{ durationDisplay }}</text>
          <text class="minutes-unit">分钟</text>
        </view>
        <text v-if="timerMinutes > 0" class="hint sync">与上方计时同步</text>
      </view>

      <view class="form-item">
        <text class="label">学习时段 <text class="optional">选填</text></text>
        <text class="hint">结束计时后自动填入，也可手动调整</text>
        <view class="time-row">
          <picker mode="time" :value="form.startTime" @change="onStartTimeChange">
            <view class="time-pick" :class="{ filled: form.startTime }">
              <text class="time-label">开始</text>
              <text class="time-val">{{ form.startTime || '选择' }}</text>
            </view>
          </picker>
          <view class="time-line" />
          <picker mode="time" :value="form.endTime" @change="onEndTimeChange">
            <view class="time-pick" :class="{ filled: form.endTime }">
              <text class="time-label">结束</text>
              <text class="time-val">{{ form.endTime || '选择' }}</text>
            </view>
          </picker>
        </view>
        <text v-if="timeRangeHint" class="hint accent">{{ timeRangeHint }}</text>
        <text v-if="timerSyncedHint" class="hint sync">{{ timerSyncedHint }}</text>
      </view>

      <view class="form-item last">
        <text class="label">备注 <text class="optional">选填</text></text>
        <textarea v-model="form.note" class="textarea" placeholder="学习小结、心得…" maxlength="300" />
      </view>
    </view>

    <view class="foot-spacer" />
  </scroll-view>

  <view class="foot-bar" :style="themeVars">
    <button class="btn-ghost" @click="goBack">返回</button>
    <button
      class="btn-submit"
      :class="{ disabled: timerState === 'running' }"
      :loading="submitting"
      :disabled="submitting || timerState === 'running'"
      @click="submit"
    >
      提交记录
    </button>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onHide, onShow, onUnload } from '@dcloudio/uni-app'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import {
  getTaskDisplay,
  isPlanItemDone,
  minutesBetweenTimes,
  normalizePlanRow,
  todayStr
} from '@/utils/plan-store.js'
import { formatElapsed, formatTimeHHMM, msToReportMinutes } from '@/utils/study-timer.js'
import {
  buildTimerSessionKey,
  clearTimerSession,
  loadTimerSession,
  pruneTimerSessions,
  saveTimerSession
} from '@/utils/study-timer-store.js'
import { applyThemeUI, getTheme, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const NAV_KEY = 'study_nav_payload'
const loggedIn = useLoggedIn()
const today = todayStr()

const mode = ref('plan')
const task = ref(null)
const reportDate = ref(today)
const submitting = ref(false)
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})
const themePrimary = computed(() => getTheme().colors.primary)

const timerState = ref('idle') // idle | running | paused | stopped
const elapsedMs = ref(0)
const tickCount = ref(0)
const sessionStartAt = ref(null)
const timerRestored = ref(false)
let tickTimer = null
let runStartedAt = 0
let sessionKey = ''

const form = reactive({
  completed: true,
  actualMinutes: '',
  startTime: '',
  endTime: '',
  note: '',
  otherSubject: '',
  otherContent: ''
})

const heroTitle = computed(() => {
  if (mode.value === 'other') return '记录其他学习'
  return task.value?.subject || '学习任务'
})

const heroSubtitle = computed(() => {
  if (mode.value === 'other') return '计划外的自学内容'
  return task.value?.content || ''
})

const timerStatus = computed(() => timerState.value)

const statusText = computed(() => {
  const map = {
    idle: '未开始',
    running: '计时中',
    paused: '已暂停',
    stopped: '已结束'
  }
  return map[timerState.value] || '未开始'
})

const displayElapsed = computed(() => {
  void tickCount.value
  let ms = elapsedMs.value
  if (timerState.value === 'running' && runStartedAt) {
    ms += Date.now() - runStartedAt
  }
  return formatElapsed(ms)
})

const timerMinutes = computed(() => {
  void tickCount.value
  return msToReportMinutes(getLiveElapsedMs())
})

const durationDisplay = computed(() => {
  if (timerMinutes.value > 0) return String(timerMinutes.value)
  if (timerState.value === 'running' || timerState.value === 'paused') return '计时中'
  return '—'
})

const timeRangeHint = computed(() => {
  const mins = minutesBetweenTimes(form.startTime, form.endTime)
  if (mins == null) return ''
  return `时段：${form.startTime} - ${form.endTime}`
})

const timerSyncedHint = computed(() => {
  if (timerState.value === 'running') {
    return '计时进行中，请先结束计时再提交；学习时长将自动同步'
  }
  if (timerState.value === 'paused') {
    return '已暂停，可先结束计时再提交，或继续学习'
  }
  if (timerState.value === 'stopped' && form.startTime && form.endTime) {
    return '已根据本次计时同步学习时段'
  }
  return ''
})

const timerHint = computed(() => {
  if (timerRestored.value && (timerState.value === 'paused' || timerState.value === 'stopped')) {
    return '已恢复上次计时，点击「继续」或「重新开始」'
  }
  if (timerState.value === 'paused') return '已暂停；退出本页会暂停计时，息屏仍会继续累计'
  if (timerState.value === 'stopped' && elapsedMs.value > 0) {
    return `本次学习 ${msToReportMinutes(elapsedMs.value)} 分钟，可修改后提交`
  }
  return '退出本页将暂停计时；停留本页息屏仍会计时'
})

function clearTick() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function startTick() {
  clearTick()
  tickTimer = setInterval(() => {
    if (timerState.value === 'running') tickCount.value++
  }, 1000)
}

function getLiveElapsedMs() {
  let ms = elapsedMs.value
  if (timerState.value === 'running' && runStartedAt) {
    ms += Date.now() - runStartedAt
  }
  return ms
}

function updateSessionKey() {
  sessionKey = buildTimerSessionKey(
    reportDate.value,
    mode.value,
    mode.value === 'plan' ? task.value?.id : null
  )
}

function snapshotTimerForm() {
  return {
    startTime: form.startTime,
    endTime: form.endTime,
    actualMinutes: form.actualMinutes,
    note: form.note,
    otherSubject: form.otherSubject,
    otherContent: form.otherContent,
    completed: form.completed
  }
}

function applyTimerForm(patch) {
  if (!patch) return
  if (patch.startTime != null) form.startTime = patch.startTime
  if (patch.endTime != null) form.endTime = patch.endTime
  if (patch.actualMinutes != null && patch.actualMinutes !== '') {
    form.actualMinutes = patch.actualMinutes
  }
  if (patch.note != null) form.note = patch.note
  if (patch.otherSubject != null) form.otherSubject = patch.otherSubject
  if (patch.otherContent != null) form.otherContent = patch.otherContent
  if (patch.completed != null) form.completed = patch.completed
}

function persistTimerState() {
  if (!sessionKey || reportDate.value !== today) return
  if (timerState.value === 'idle' && elapsedMs.value <= 0) {
    clearTimerSession(sessionKey)
    return
  }
  saveTimerSession(sessionKey, {
    timerState: timerState.value,
    elapsedMs: elapsedMs.value,
    runStartedAt: timerState.value === 'running' ? runStartedAt : 0,
    sessionStartAt: sessionStartAt.value,
    form: snapshotTimerForm()
  })
}

function restoreTimerState() {
  timerRestored.value = false
  if (!sessionKey || reportDate.value !== today) return
  const saved = loadTimerSession(sessionKey)
  if (!saved) return
  const state = saved.timerState
  const savedElapsed = Number(saved.elapsedMs) || 0
  if (!state || state === 'idle') return
  if (savedElapsed <= 0 && state !== 'stopped') return

  elapsedMs.value = savedElapsed
  sessionStartAt.value = saved.sessionStartAt || null
  applyTimerForm(saved.form)
  if (state === 'running' && saved.runStartedAt) {
    runStartedAt = saved.runStartedAt
    timerState.value = 'running'
    startTick()
    timerRestored.value = true
  } else {
    runStartedAt = 0
    timerState.value = state === 'running' ? 'paused' : state
    timerRestored.value =
      (timerState.value === 'paused' || timerState.value === 'stopped') && elapsedMs.value > 0
  }
  syncMinutesFromTimer()
}

function resetTimer() {
  clearTick()
  runStartedAt = 0
  elapsedMs.value = 0
  sessionStartAt.value = null
  timerState.value = 'idle'
  timerRestored.value = false
  if (sessionKey) clearTimerSession(sessionKey)
}

function startTimer() {
  if (timerState.value === 'stopped') {
    resetTimer()
    form.startTime = ''
    form.endTime = ''
  }
  timerRestored.value = false
  const now = new Date()
  if (!form.startTime) {
    form.startTime = formatTimeHHMM(now)
  }
  if (!sessionStartAt.value) {
    sessionStartAt.value = now.getTime()
  }
  runStartedAt = Date.now()
  timerState.value = 'running'
  startTick()
  persistTimerState()
}

function syncMinutesFromTimer() {
  const mins = msToReportMinutes(getLiveElapsedMs())
  if (mins > 0) form.actualMinutes = mins
}

function pauseTimer() {
  if (timerState.value !== 'running') return
  elapsedMs.value += Date.now() - runStartedAt
  runStartedAt = 0
  timerState.value = 'paused'
  clearTick()
  syncMinutesFromTimer()
  persistTimerState()
}

function resumeTimer() {
  timerRestored.value = false
  runStartedAt = Date.now()
  timerState.value = 'running'
  startTick()
  persistTimerState()
}

function stopTimer() {
  if (timerState.value === 'running') {
    elapsedMs.value += Date.now() - runStartedAt
    runStartedAt = 0
  }
  clearTick()
  timerState.value = 'stopped'
  timerRestored.value = false
  const now = new Date()
  form.endTime = formatTimeHHMM(now)
  if (!form.startTime && sessionStartAt.value) {
    form.startTime = formatTimeHHMM(new Date(sessionStartAt.value))
  }
  const mins = msToReportMinutes(elapsedMs.value)
  if (mins > 0) {
    form.actualMinutes = mins
  }
  persistTimerState()
}

function onStartTimeChange(e) {
  form.startTime = e.detail.value
}

function onEndTimeChange(e) {
  form.endTime = e.detail.value
}

function consumeNavPayload() {
  const payload = uni.getStorageSync(NAV_KEY)
  if (!payload) return null
  uni.removeStorageSync(NAV_KEY)
  return payload
}

function applyNavPayload(payload) {
  mode.value = payload.mode || 'plan'
  reportDate.value = payload.date || today
  if (mode.value === 'plan' && payload.task) {
    task.value = normalizePlanRow(payload.task)
    const meta = getTaskDisplay(task.value)
    form.completed = !isPlanItemDone(task.value)
    form.actualMinutes = meta.actualMinutes ? String(meta.actualMinutes) : ''
    form.startTime = meta.startTime || ''
    form.endTime = meta.endTime || ''
    form.note = meta.note || ''
  } else {
    task.value = null
    form.otherSubject = ''
    form.otherContent = ''
    form.actualMinutes = ''
    form.startTime = ''
    form.endTime = ''
    form.note = ''
    form.completed = true
  }
  updateSessionKey()
}

function syncPageFromStorage() {
  updateSessionKey()
  restoreTimerState()
}

function initPage(requireNav = false) {
  pruneTimerSessions(today)
  const payload = consumeNavPayload()
  if (payload) {
    applyNavPayload(payload)
  } else if (requireNav && !task.value) {
    uni.showToast({ title: '任务信息丢失', icon: 'none' })
    setTimeout(goBack, 800)
    return
  } else {
    updateSessionKey()
  }
  restoreTimerState()
}

/** 退出页面时暂停（不结束本次累计时长） */
function pauseIfRunning() {
  if (timerState.value !== 'running') return
  elapsedMs.value += Date.now() - runStartedAt
  runStartedAt = 0
  timerState.value = 'paused'
  clearTick()
  syncMinutesFromTimer()
}

function goBack() {
  pauseIfRunning()
  persistTimerState()
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/plan/plan' })
  })
}

function resolveSubmitMinutes() {
  return msToReportMinutes(getLiveElapsedMs())
}

async function submit() {
  if (reportDate.value !== today) {
    uni.showToast({ title: '仅可记录今日学习', icon: 'none' })
    return
  }
  if (timerState.value === 'running') {
    uni.showToast({ title: '请先结束计时，再提交记录', icon: 'none', duration: 2500 })
    return
  }
  if (timerState.value === 'paused') {
    uni.showToast({ title: '请先结束计时，再提交记录', icon: 'none', duration: 2500 })
    return
  }
  await doSubmit()
}

async function doSubmit() {
  if (mode.value === 'other') {
    if (!form.otherSubject.trim() || !form.otherContent.trim()) {
      uni.showToast({ title: '请填写科目与内容', icon: 'none' })
      return
    }
  }
  if (form.startTime && form.endTime) {
    const rangeMins = minutesBetweenTimes(form.startTime, form.endTime)
    if (rangeMins == null || rangeMins <= 0) {
      uni.showToast({ title: '结束时间应晚于开始时间', icon: 'none' })
      return
    }
  }
  const resolvedMins = resolveSubmitMinutes()
  if (!resolvedMins) {
    uni.showToast({
      title: getLiveElapsedMs() > 0 ? '请先结束计时再提交' : '请先开始并完成计时',
      icon: 'none'
    })
    return
  }
  if (!loggedIn.value) {
    uni.showToast({ title: '请先在「我的」登录或注册', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const mins = resolvedMins
    const payload = {
      reportDate: reportDate.value,
      completed: form.completed,
      actualMinutes: mins,
      note: form.note,
      planItemId: mode.value === 'plan' ? task.value?.id : null,
      isOther: mode.value === 'other',
      otherSubject: form.otherSubject.trim(),
      otherContent: form.otherContent.trim()
    }
    if (form.startTime) payload.startTime = form.startTime
    if (form.endTime) payload.endTime = form.endTime
    await request({
      url: '/reports',
      method: 'POST',
      data: payload
    })
    if (sessionKey) clearTimerSession(sessionKey)
    uni.$emit?.('plan-data-changed')
    uni.showToast({ title: '已记录', icon: 'success' })
    setTimeout(goBack, 500)
  } catch (e) {
    console.warn(e)
  } finally {
    submitting.value = false
  }
}

onLoad(() => {
  initPage(true)
})

onShow(() => {
  applyThemeUI('学习记录')
  const payload = consumeNavPayload()
  if (payload) {
    applyNavPayload(payload)
  } else {
    syncPageFromStorage()
  }
  if (timerState.value === 'running' && runStartedAt) {
    startTick()
  }
})

/** 息屏 / 切后台：仍在计时页，按系统时间继续累计 */
onHide(() => {
  persistTimerState()
  clearTick()
})

/** 退出计时页：暂停计时 */
onUnload(() => {
  pauseIfRunning()
  persistTimerState()
  clearTick()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #f0f2f8;
  padding-bottom: 160rpx;
  box-sizing: border-box;
}

.hero {
  margin: 24rpx 28rpx;
  padding: 32rpx 28rpx;
  background: linear-gradient(145deg, #4f6ef7 0%, #6b4ce6 55%, #8b5cf6 100%);
  border-radius: 24rpx;
  color: #fff;
}

.hero-badge {
  display: inline-block;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  margin-bottom: 16rpx;
}

.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.3;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  opacity: 0.92;
  line-height: 1.5;
}

.hero-meta {
  margin-top: 16rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

.meta-dot {
  margin: 0 8rpx;
}

.timer-card {
  margin: 0 28rpx 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(79, 110, 247, 0.08);
}

.timer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.timer-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1f36;
}

.status-pill {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #f3f4f6;
  color: #6b7280;

  &.running {
    background: #dcfce7;
    color: #16a34a;
  }
  &.paused {
    background: #fef3c7;
    color: #d97706;
  }
  &.stopped {
    background: #eef2ff;
    color: #4f6ef7;
  }
}

.timer-display-wrap {
  text-align: center;
  padding: 24rpx 0 16rpx;
}

.timer-display {
  font-size: 88rpx;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #4f6ef7;
  letter-spacing: 4rpx;
}

.timer-target {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.target-pct {
  color: #4f6ef7;
  font-weight: 600;
}

.progress-bar {
  height: 12rpx;
  background: #eef2ff;
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 28rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4f6ef7, #8b5cf6);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.timer-actions {
  display: flex;
  gap: 16rpx;
  justify-content: center;
}

.btn-timer {
  flex: 1;
  max-width: 280rpx;
  font-size: 28rpx;
  border-radius: 999rpx;
  border: none;
  padding: 22rpx 0;
  line-height: 1.2;

  &::after {
    border: none;
  }

  &.primary {
    background: var(--theme-primary, #3f60ea) !important;
    color: #fff !important;
    box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.18);
  }
  &.secondary {
    background: #f3f4f6;
    color: #374151;
  }
  &.danger {
    background: #fff;
    color: #ef4444;
    border: 2rpx solid #fecaca;
  }
}

.timer-hint {
  display: block;
  margin-top: 20rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
  line-height: 1.5;
}

.section-title {
  padding: 8rpx 36rpx 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #6b7280;
}

.card {
  margin: 0 28rpx 24rpx;
  padding: 8rpx 24rpx 16rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 1rpx solid #e8ecf4;
}

.form-item {
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f3f4f6;

  &.last {
    border-bottom: none;
  }

  &.switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #374151;
}

.optional {
  font-size: 22rpx;
  font-weight: 400;
  color: #9ca3af;
}

.hint {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;

  &.accent {
    color: #4f6ef7;
    margin-top: 12rpx;
  }
  &.sync {
    color: #16a34a;
    margin-top: 8rpx;
  }
}

.input {
  width: 100%;
  height: 88rpx;
  margin-top: 12rpx;
  padding: 0 20rpx;
  line-height: 88rpx;
  background: var(--theme-input-bg, #f5f7fb);
  border-radius: 14rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.textarea {
  width: 100%;
  margin-top: 12rpx;
  padding: 18rpx 20rpx;
  min-height: 120rpx;
  line-height: 1.5;
  background: var(--theme-input-bg, #f5f7fb);
  border-radius: 14rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.time-row {
  display: flex;
  align-items: stretch;
  gap: 12rpx;
  margin-top: 16rpx;
}

.time-pick {
  flex: 1;
  padding: 16rpx;
  background: #f5f7fb;
  border-radius: 14rpx;
  border: 2rpx solid #eef2ff;
  text-align: center;

  &.filled {
    background: #eef2ff;
    border-color: #c7d2fe;
  }
}

.time-label {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
}

.time-val {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #4f6ef7;
}

.time-line {
  width: 24rpx;
  align-self: center;
  height: 2rpx;
  background: #d1d5db;
}

.minutes-row {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  background: #f5f7fb;
  border-radius: 14rpx;
  padding: 8rpx 20rpx;
  border: 2rpx solid #eef2ff;
}

.minutes-input {
  flex: 1;
  font-size: 48rpx;
  font-weight: 700;
  color: #4f6ef7;
  height: 72rpx;
}

.minutes-unit {
  font-size: 28rpx;
  color: #6b7280;
}

.apply-btn {
  font-size: 24rpx;
  color: #4f6ef7;
  padding: 8rpx 16rpx;
  margin-left: 8rpx;
}

.foot-spacer {
  height: 32rpx;
}

@import '@/styles/buttons.scss';

.minutes-row.readonly {
  border-color: #e5e7eb;
  background: #f9fafb;
}

.minutes-display {
  flex: 1;
  font-size: 48rpx;
  font-weight: 700;
  color: #4f6ef7;
  line-height: 72rpx;
}

/* theme overrides */
.page {
  background: var(--theme-page-bg);
}

.hero {
  background: var(--theme-hero-gradient);
}

.timer-card,
.card {
  background: var(--theme-card-bg);
}

.timer-label,
.label {
  color: var(--theme-text-main);
}

.section-title,
.hint,
.optional,
.timer-hint {
  color: var(--theme-text-sub);
}

.timer-display,
.target-pct,
.time-val,
.minutes-input,
.minutes-display,
.apply-btn {
  color: var(--theme-primary);
}

.hint.accent,
.status-pill.stopped {
  color: var(--theme-primary);
}
</style>
