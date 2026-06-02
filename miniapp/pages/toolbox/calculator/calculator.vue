<template>
  <theme-page-meta />
  <view class="page" :style="themeVars">
    <view class="display-wrap">
      <text class="expr-line">{{ exprHint }}</text>
      <text class="display">{{ display }}</text>
    </view>

    <view class="keypad">
      <view class="row">
        <button class="key fn" @click="onClear">C</button>
        <button class="key fn" @click="onBackspace">⌫</button>
        <button class="key fn" @click="onPercent">%</button>
        <button class="key op" @click="onOperator('/')">÷</button>
      </view>
      <view class="row">
        <button class="key" @click="inputDigit('7')">7</button>
        <button class="key" @click="inputDigit('8')">8</button>
        <button class="key" @click="inputDigit('9')">9</button>
        <button class="key op" @click="onOperator('*')">×</button>
      </view>
      <view class="row">
        <button class="key" @click="inputDigit('4')">4</button>
        <button class="key" @click="inputDigit('5')">5</button>
        <button class="key" @click="inputDigit('6')">6</button>
        <button class="key op" @click="onOperator('-')">−</button>
      </view>
      <view class="row">
        <button class="key" @click="inputDigit('1')">1</button>
        <button class="key" @click="inputDigit('2')">2</button>
        <button class="key" @click="inputDigit('3')">3</button>
        <button class="key op" @click="onOperator('+')">+</button>
      </view>
      <view class="row">
        <button class="key wide" @click="inputDigit('0')">0</button>
        <button class="key" @click="inputDot">.</button>
        <button class="key eq" @click="onEquals">=</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { applyBinary, formatCalcDisplay } from '@/utils/calculator.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const display = ref('0')
const exprHint = ref('')
const accumulator = ref(null)
const pendingOp = ref(null)
const freshOperand = ref(true)

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

function currentNumber() {
  return Number(display.value) || 0
}

function flushPending() {
  const n = currentNumber()
  if (accumulator.value === null) {
    accumulator.value = n
    return
  }
  if (pendingOp.value) {
    try {
      accumulator.value = applyBinary(accumulator.value, n, pendingOp.value)
    } catch (e) {
      display.value = '错误'
      accumulator.value = null
      pendingOp.value = null
      freshOperand.value = true
      exprHint.value = ''
      throw e
    }
  }
}

function inputDigit(d) {
  if (display.value === '错误') onClear()
  if (freshOperand.value) {
    display.value = d
    freshOperand.value = false
  } else if (display.value === '0') {
    display.value = d
  } else if (display.value.length < 16) {
    display.value += d
  }
}

function inputDot() {
  if (display.value === '错误') onClear()
  if (freshOperand.value) {
    display.value = '0.'
    freshOperand.value = false
    return
  }
  if (!display.value.includes('.')) {
    display.value += '.'
  }
}

function onOperator(op) {
  if (display.value === '错误') onClear()
  try {
    flushPending()
    pendingOp.value = op
    freshOperand.value = true
    exprHint.value = `${formatCalcDisplay(accumulator.value)} ${op}`
  } catch (e) {
    uni.showToast({ icon: 'none', title: e.message })
  }
}

function onEquals() {
  if (display.value === '错误') return
  if (pendingOp.value === null) return
  try {
    flushPending()
    display.value = formatCalcDisplay(accumulator.value)
    exprHint.value = ''
    pendingOp.value = null
    accumulator.value = null
    freshOperand.value = true
  } catch (e) {
    uni.showToast({ icon: 'none', title: e.message })
  }
}

function onClear() {
  display.value = '0'
  exprHint.value = ''
  accumulator.value = null
  pendingOp.value = null
  freshOperand.value = true
}

function onBackspace() {
  if (display.value === '错误' || freshOperand.value) {
    onClear()
    return
  }
  if (display.value.length <= 1) {
    display.value = '0'
    freshOperand.value = true
  } else {
    display.value = display.value.slice(0, -1)
  }
}

function onPercent() {
  if (display.value === '错误') return
  const n = currentNumber() / 100
  display.value = formatCalcDisplay(n)
}

onShow(() => {
  applyThemeUI('计算器')
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx 48rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.display-wrap {
  flex: 1;
  min-height: 200rpx;
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-end;
  border: 1rpx solid var(--theme-border-soft);
}

.expr-line {
  font-size: 26rpx;
  color: var(--theme-text-sub);
  min-height: 36rpx;
  margin-bottom: 12rpx;
}

.display {
  font-size: 64rpx;
  font-weight: 700;
  color: var(--theme-text-main);
  word-break: break-all;
  text-align: right;
  line-height: 1.2;
}

.keypad {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.row {
  display: flex;
  gap: 16rpx;
}

.key {
  flex: 1;
  height: 100rpx;
  line-height: 100rpx;
  border-radius: 20rpx;
  font-size: 36rpx;
  background: var(--theme-card-bg);
  color: var(--theme-text-main);
  border: 1rpx solid var(--theme-border-soft);
  padding: 0;

  &::after {
    border: none;
  }

  &.wide {
    flex: 2.15;
  }

  &.fn {
    color: var(--theme-primary);
    background: var(--theme-input-bg);
  }

  &.op {
    color: #fff;
    background: var(--theme-primary);
    border-color: transparent;
  }

  &.eq {
    color: #fff;
    background: linear-gradient(135deg, #5f78f1, #6a63ea);
    border-color: transparent;
  }
}
</style>
