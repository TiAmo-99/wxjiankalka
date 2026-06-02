<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="hero">
      <text class="hero-title">英语单词</text>
      <text class="hero-desc">点击单词或语料可显示中文释义，先自测再对照</text>
    </view>

    <view v-if="loading" class="state-line">加载中…</view>
    <view v-else-if="empty" class="empty-card">
      <text class="empty-title">暂无词库</text>
      <text class="empty-desc">请在服务器执行 npm run db:import-vocab 导入词汇</text>
    </view>

    <block v-else>
      <view class="card">
        <view class="card-head">
          <text class="card-title">本组单词</text>
          <text class="card-meta">{{ words.length }} 个</text>
        </view>
        <view
          v-for="item in words"
          :key="item.id"
          class="word-row"
          @click="toggleWord(item.id)"
        >
          <view class="word-main">
            <text class="word-en">{{ item.word }}</text>
            <text v-if="item.phonetic" class="word-phonetic">{{ item.phonetic }}</text>
          </view>
          <text class="word-zh" :class="{ hidden: !revealed[item.id] }">
            {{ revealed[item.id] ? item.meaningZh : '点击显示释义' }}
          </text>
        </view>
      </view>

      <view v-if="phrase" class="card phrase-card">
        <view class="card-head">
          <text class="card-title">{{ corpusTitle }}</text>
          <text class="optional-tag">选学</text>
        </view>
        <text v-if="phrase.title" class="corpus-subtitle">{{ phrase.title }}</text>
        <view class="phrase-row" @click="phraseRevealed = !phraseRevealed">
          <text class="phrase-en" :class="corpusEnClass">{{ phrase.phraseEn }}</text>
          <text class="word-zh" :class="{ hidden: !phraseRevealed, 'zh-long': isLongCorpus }">
            {{ phraseRevealed ? phrase.meaningZh : '点击显示释义' }}
          </text>
        </view>
      </view>
    </block>

    <view class="foot-spacer" />
  </scroll-view>

  <view class="foot-bar" :style="themeVars">
    <button class="btn-submit" :loading="loading" :disabled="loading" @click="loadSet">更新一组</button>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import config from '@/config/index.js'
import { request } from '@/utils/request.js'
import { mockVocabSet } from '@/utils/vocab-mock.js'
import { debounceLeading } from '@/utils/debounce.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loading = ref(false)
const empty = ref(false)
const words = ref([])
const phrase = ref(null)
const revealed = reactive({})
const phraseRevealed = ref(false)

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const corpusTitle = computed(() => {
  const k = phrase.value?.kind
  if (k === 'sentence') return '今日长句'
  if (k === 'passage') return '阅读片段'
  return '今日短语'
})

const isLongCorpus = computed(() => {
  const k = phrase.value?.kind
  return k === 'sentence' || k === 'passage'
})

const corpusEnClass = computed(() => {
  if (phrase.value?.kind === 'passage') return 'phrase-en passage-en'
  if (phrase.value?.kind === 'sentence') return 'phrase-en sentence-en'
  return 'phrase-en'
})

function toggleWord(id) {
  revealed[id] = !revealed[id]
}

function resetReveal() {
  Object.keys(revealed).forEach((k) => delete revealed[k])
  phraseRevealed.value = false
}

async function loadSetCore() {
  if (loading.value) return
  loading.value = true
  try {
    let data
    if (config.useMock) {
      data = mockVocabSet(10)
    } else {
      data = await request({
        url: '/vocab/set?wordCount=10&phrase=1',
        showError: true
      })
    }
    words.value = data?.words || []
    phrase.value = data?.phrase || null
    empty.value = Boolean(data?.empty) || words.value.length === 0
    resetReveal()
  } catch (e) {
    console.warn(e)
    if (config.useMock) {
      const data = mockVocabSet(10)
      words.value = data.words
      phrase.value = data.phrase
      empty.value = false
      resetReveal()
    } else {
      words.value = []
      phrase.value = null
      empty.value = true
    }
  } finally {
    loading.value = false
  }
}

const loadSet = debounceLeading(loadSetCore, 600)

onShow(() => {
  applyThemeUI('英语单词')
  loadSetCore()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding-bottom: 160rpx;
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
  font-size: 40rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
  opacity: 0.92;
}

.state-line {
  text-align: center;
  padding: 48rpx;
  color: var(--theme-text-sub);
  font-size: 28rpx;
}

.empty-card {
  margin: 0 28rpx;
  padding: 48rpx 32rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.empty-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
}

.card {
  margin: 0 28rpx 20rpx;
  padding: 8rpx 24rpx 12rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.06);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 8rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.card-meta {
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.optional-tag {
  font-size: 22rpx;
  color: var(--theme-primary);
  background: var(--theme-input-bg);
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.word-row {
  padding: 22rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &:last-child {
    border-bottom: none;
  }
}

.word-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 12rpx;
}

.word-en {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--theme-text-main);
}

.word-phonetic {
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.word-zh {
  display: block;
  margin-top: 12rpx;
  font-size: 28rpx;
  line-height: 1.45;
  color: var(--theme-primary);

  &.hidden {
    color: var(--theme-text-sub);
    font-weight: 400;
  }
}

.phrase-row {
  padding: 16rpx 0 20rpx;
}

.corpus-subtitle {
  display: block;
  margin: 0 0 8rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.phrase-en {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  line-height: 1.5;
}

.phrase-en.sentence-en {
  font-size: 30rpx;
  font-weight: 500;
}

.phrase-en.passage-en {
  font-size: 28rpx;
  font-weight: 400;
  line-height: 1.65;
}

.word-zh.zh-long {
  line-height: 1.6;
}

.foot-spacer {
  height: 32rpx;
}

@import '@/styles/buttons.scss';

.foot-bar .btn-submit {
  flex: 1;
}
</style>
