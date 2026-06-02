<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view v-if="useMock" class="mock-banner">演示模式 · 本地示例数据</view>

    <view class="hero">
      <view class="hero-bg" />
      <view class="hero-content">
        <text class="greeting">{{ greeting }}，{{ userName }}</text>
        <text class="date-line">{{ displayDate }}</text>
        <view class="study-row">
          <text class="study-label">今日已学</text>
          <text class="study-value">{{ todayStudyText }}</text>
        </view>
        <view class="study-row">
          <text class="study-label">今日剩余</text>
          <text class="study-value">{{ todayRemainingText }}</text>
        </view>
        <view v-if="loggedIn && stats.total > 0" class="progress-bar">
          <view class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </view>
        <text class="status-line">{{ progressTitle }}</text>
      </view>
    </view>

    <view class="tip-card" :class="tipCard.tone">
      <text class="tip-icon">{{ tipCard.icon }}</text>
      <view class="tip-body">
        <text class="tip-title">{{ tipCard.title }}</text>
        <text class="tip-desc">{{ tipCard.desc }}</text>
      </view>
    </view>

    <view class="task-section">
      <view class="section-head">
        <text class="section-title">今日任务</text>
        <text v-if="loggedIn && !loading && pendingTasks.length > 0" class="section-meta">
          {{ pendingTasks.length }} 项待完成
        </text>
      </view>

      <view v-if="!loggedIn" class="state-line">登录后显示今日待办</view>

      <view v-else-if="loading" class="state-line muted">加载中…</view>

      <view v-else-if="taskList.length === 0" class="state-line">今日暂无学习任务</view>

      <view v-else-if="pendingTasks.length === 0" class="state-line done-hint">待办已全部完成</view>

      <view v-else class="task-list">
        <view v-for="item in pendingTasks" :key="item.id" class="task-item">
          <view class="task-dot" />
          <view class="task-text">
            <text class="task-subject">{{ item.subject }}</text>
            <text class="task-content">{{ item.content }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="vocab-section">
      <view class="section-head">
        <text class="section-title">随机单词</text>
        <text v-if="vocabWords.length" class="section-meta">共 {{ vocabWords.length }} 个</text>
      </view>
      <view v-if="vocabLoading" class="state-line muted">单词加载中…</view>
      <view v-else-if="vocabWords.length === 0" class="state-line muted">暂无单词数据</view>
      <view v-else class="vocab-list">
        <view v-for="item in vocabWords" :key="item.id" class="vocab-chip">
          <text class="vocab-word">{{ item.word }}</text>
          <text v-if="item.phonetic" class="vocab-phonetic">{{ item.phonetic }}</text>
          <text class="vocab-meaning">{{ item.meaningZh }}</text>
        </view>
      </view>
    </view>

    <view class="vocab-foot">
      <button class="btn-vocab-more" @click="goVocab">学习更多单词</button>
    </view>

    <view v-if="encourageText" class="encourage-card">
      <text class="encourage-text">{{ encourageText }}</text>
    </view>

    <view class="page-bottom" />
  </scroll-view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import config from '@/config/index.js'
import { request } from '@/utils/request.js'
import { useLoggedIn } from '@/utils/auth.js'
import { isPlanItemDone, normalizePlanRow } from '@/utils/plan-store.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'
import { mockVocabSet } from '@/utils/vocab-mock.js'

const loggedIn = useLoggedIn()

const useMock = config.useMock
const loading = ref(false)
const taskList = ref([])
const userName = ref('考研人')
const encourageText = ref('')
const vocabLoading = ref(false)
const vocabWords = ref([])
const todayMinutes = ref(0)
/** 每分钟刷新一次，使「今日剩余」时间自动更新 */
const nowTick = ref(0)
let remainTimer = null
const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const MOCK_QUOTES = [
  '每一天的努力，都在为梦想蓄力。',
  '坚持就是胜利，加油！',
  '慢一点没关系，重要的是一直在路上。'
]

const stats = computed(() => {
  const total = taskList.value.length
  const done = taskList.value.filter((t) => isPlanItemDone(t)).length
  return { total, done, pending: total - done, allDone: total > 0 && done === total }
})

const pendingTasks = computed(() => taskList.value.filter((t) => !isPlanItemDone(t)))

const progressPercent = computed(() =>
  stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0
)

const todayStudyMinutes = computed(() => {
  if (todayMinutes.value > 0) return todayMinutes.value
  return taskList.value.reduce(
    (s, t) => s + (t.reported ? Number(t.actualMinutes) || 0 : 0),
    0
  )
})

const todayStudyText = computed(() => {
  const m = todayStudyMinutes.value
  if (!loggedIn.value) return '登录后查看'
  if (m <= 0) return '尚未记录'
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest > 0 ? `${h} 小时 ${rest} 分钟` : `${h} 小时`
})

const progressTitle = computed(() => {
  if (!loggedIn.value) return '登录后同步今日学习数据'
  if (loading.value) return '正在了解你的今日安排…'
  if (stats.value.total === 0) return '今天可以按自己的节奏来'
  if (stats.value.allDone) return '太棒了，今日任务已全部完成'
  return `还有 ${stats.value.pending} 项待完成`
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const displayDate = computed(() => {
  const d = new Date()
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${w}`
})

function formatDayRemaining(totalMinutes) {
  if (totalMinutes <= 0) return '今日已结束'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours} 小时 ${minutes} 分钟`
  if (hours > 0) return `${hours} 小时`
  return `${minutes} 分钟`
}

const timeCtx = computed(() => {
  nowTick.value
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const totalMinutes = Math.max(0, Math.floor((end - now) / 60000))
  return { totalMinutes }
})

const todayRemainingText = computed(() => formatDayRemaining(timeCtx.value.totalMinutes))

const tipCard = computed(() => {
  const { total, pending, allDone } = stats.value
  const totalMinutes = timeCtx.value.totalMinutes
  const remainText = formatDayRemaining(totalMinutes)

  if (!loggedIn.value) {
    return {
      tone: 'info',
      icon: '👋',
      title: '欢迎回来',
      desc: '登录后即可看到今天要完成的学习内容。'
    }
  }

  if (total === 0) {
    return {
      tone: 'info',
      icon: '🌱',
      title: '今天可以从容安排',
      desc: '暂无学习任务，适当休息也很好。'
    }
  }

  if (allDone) {
    return {
      tone: 'success',
      icon: '🎉',
      title: '今日已圆满',
      desc: '所有任务都完成了，记得适当放松。'
    }
  }

  if (totalMinutes >= 360) {
    return {
      tone: 'info',
      icon: '☀️',
      title: `还有 ${pending} 项待完成`,
      desc: '记录学习、勾选进度请切换到「计划」。'
    }
  }

  if (totalMinutes >= 180) {
    return {
      tone: 'warn',
      icon: '💪',
      title: `今日剩余 ${remainText}`,
      desc: '请前往「计划」逐项完成并记录学习。'
    }
  }

  return {
    tone: 'urgent',
    icon: '🌙',
    title: `今日剩余 ${remainText}`,
    desc: '请前往「计划」完成剩余任务。'
  }
})

/** 每次进入今日页重新随机 3 个词 */
async function loadRandomVocab() {
  vocabLoading.value = true
  try {
    if (useMock) {
      vocabWords.value = mockVocabSet(3).words
      return
    }
    const data = await request({
      url: '/vocab/set?wordCount=3&phrase=0',
      showError: false
    })
    vocabWords.value = data?.words || []
  } catch (e) {
    vocabWords.value = useMock ? mockVocabSet(3).words : []
  } finally {
    vocabLoading.value = false
  }
}

function goVocab() {
  uni.navigateTo({ url: '/pages/vocab/vocab' })
}

async function loadEncouragement() {
  if (useMock) {
    encourageText.value = MOCK_QUOTES[Math.floor(Math.random() * MOCK_QUOTES.length)]
    return
  }
  try {
    const data = await request({ url: '/encouragements/random', showError: false })
    encourageText.value = data?.content || MOCK_QUOTES[0]
  } catch (e) {
    encourageText.value = MOCK_QUOTES[0]
  }
}

async function loadTodayStats() {
  if (!loggedIn.value) {
    todayMinutes.value = 0
    return
  }
  try {
    const data = await request({ url: '/stats/summary', showError: false })
    todayMinutes.value = Number(data?.todayMinutes) || 0
  } catch (e) {
    todayMinutes.value = 0
  }
}

async function loadToday() {
  loading.value = true
  try {
    if (!loggedIn.value) {
      taskList.value = []
      todayMinutes.value = 0
      return
    }
    const [planData] = await Promise.all([
      request({ url: '/plans/today', showError: false }),
      loadTodayStats()
    ])
    const list = planData?.list ?? (Array.isArray(planData) ? planData : [])
    taskList.value = list.map(normalizePlanRow)
  } catch (e) {
    taskList.value = []
  } finally {
    loading.value = false
  }
}

function onPlanDataChanged() {
  loadToday()
}

if (typeof uni !== 'undefined' && uni.$on) {
  uni.$on('plan-data-changed', onPlanDataChanged)
}

function startRemainTimer() {
  if (remainTimer) clearInterval(remainTimer)
  nowTick.value++
  remainTimer = setInterval(() => {
    nowTick.value++
  }, 60000)
}

onUnload(() => {
  uni.$off?.('plan-data-changed', onPlanDataChanged)
  if (remainTimer) {
    clearInterval(remainTimer)
    remainTimer = null
  }
})

onShow(() => {
  applyThemeUI('今日')
  startRemainTimer()
  if (loggedIn.value) {
    request({ url: '/auth/me', showError: false })
      .then((d) => {
        if (d?.nickname) userName.value = d.nickname
      })
      .catch(() => {})
  } else {
    userName.value = '同学'
  }
  loadEncouragement()
  loadRandomVocab()
  loadToday()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  box-sizing: border-box;
}

.mock-banner {
  text-align: center;
  font-size: 22rpx;
  color: #b88230;
  background: #fff8e6;
  padding: 12rpx;
}

.hero {
  position: relative;
  margin: 24rpx 28rpx 20rpx;
  border-radius: 28rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: var(--theme-hero-gradient);
}

.hero-content {
  position: relative;
  padding: 36rpx 32rpx 32rpx;
  color: #fff;
}

.greeting {
  font-size: 38rpx;
  font-weight: 700;
}

.date-line {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  opacity: 0.88;
}

.study-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 20rpx;

  &:first-of-type {
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 1rpx solid rgba(255, 255, 255, 0.2);
  }
}

.study-label {
  font-size: 26rpx;
  opacity: 0.9;
}

.study-value {
  font-size: 32rpx;
  font-weight: 700;
}

.progress-bar {
  margin-top: 20rpx;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 999rpx;
  transition: width 0.35s ease;
}

.status-line {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.45;
  opacity: 0.95;
}

.tip-card {
  display: flex;
  margin: 0 28rpx 20rpx;
  padding: 24rpx 28rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(30, 40, 80, 0.04);

  &.success {
    border-left: 6rpx solid #22c55e;
  }
  &.info {
    border-left: 6rpx solid var(--theme-primary);
  }
  &.warn {
    border-left: 6rpx solid #f59e0b;
  }
  &.urgent {
    border-left: 6rpx solid #ef4444;
  }
}

.tip-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.tip-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.tip-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  line-height: 1.55;
}

.vocab-section {
  margin: 0 28rpx 20rpx;
  padding: 24rpx 28rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(30, 40, 80, 0.04);
}

.vocab-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.vocab-chip {
  padding: 18rpx 20rpx;
  background: var(--theme-input-bg);
  border-radius: 14rpx;
}

.vocab-word {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.vocab-phonetic {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.vocab-meaning {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--theme-primary);
  line-height: 1.4;
}

.vocab-foot {
  margin: 0 28rpx 20rpx;
  display: flex;
  justify-content: center;
}

.btn-vocab-more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  width: auto;
  height: 56rpx;
  line-height: 56rpx;
  margin: 0;
  padding: 0 28rpx;
  background: transparent !important;
  color: var(--theme-text-sub) !important;
  border: 1rpx solid var(--theme-border-soft);
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 400;

  &::after {
    border: none;
  }
}

.task-section {
  margin: 0 28rpx 20rpx;
  padding: 24rpx 28rpx;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(30, 40, 80, 0.04);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.section-meta {
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.state-line {
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
  padding: 8rpx 0;

  &.muted {
    color: #9ca3af;
  }

  &.done-hint {
    color: #059669;
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.task-dot {
  width: 12rpx;
  height: 12rpx;
  margin-top: 14rpx;
  border-radius: 50%;
  background: var(--theme-primary);
  flex-shrink: 0;
}

.task-text {
  flex: 1;
  min-width: 0;
}

.task-subject {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  line-height: 1.4;
}

.task-content {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
}

.encourage-card {
  margin: 0 28rpx 20rpx;
  padding: 28rpx 32rpx;
  text-align: center;
  background: var(--theme-card-bg);
  border-radius: 20rpx;
}

.encourage-text {
  font-size: 28rpx;
  line-height: 1.65;
  color: var(--theme-text-sub);
}

.page-bottom {
  height: 48rpx;
}
</style>
