<template>

  <theme-page-meta />

  <scroll-view class="page" :style="themeVars" scroll-y>

    <view class="form-card">

      <view class="info-box" :class="{ admin: isAdmin }">

        <text class="info-title">当前权限</text>

        <text class="info-level">{{ currentPermText }}</text>

        <text v-if="isAdmin" class="info-admin-tag">最终管理员 · 可审核他人申请</text>

        <text v-else class="info-desc">L1+ 可用二维码；L3+ 可用运维调试功能</text>

      </view>



      <!-- L10 管理员：待审核列表 -->

      <view v-if="isAdmin" class="review-section">

        <view class="review-head">

          <text class="review-title">待审核申请</text>

          <text class="review-count">{{ reviewTotal }} 条</text>

        </view>



        <view v-if="reviewLoading" class="review-empty">加载中…</view>

        <view v-else-if="!reviewList.length" class="review-empty">暂无待审核申请</view>

        <view v-else class="review-list">

          <view v-for="item in reviewList" :key="item.id" class="review-item">

            <view class="review-user">

              <text class="review-name">{{ displayName(item) }}</text>

              <text class="review-meta">ID {{ item.userId }} · {{ item.phone || '无手机' }}</text>

            </view>

            <view class="review-levels">

              <text>当前 L{{ item.currentPermLevel }}</text>

              <text class="arrow">→</text>

              <text class="target">申请 L{{ item.requestLevel }}</text>

            </view>

            <text class="review-reason">{{ item.reason }}</text>

            <text class="review-time">{{ item.createdAt }}</text>

            <view class="review-actions">

              <button class="act-btn reject" size="mini" @click="openReview(item, false)">拒绝</button>

              <button class="act-btn approve" size="mini" @click="openReview(item, true)">通过</button>

            </view>

          </view>

        </view>



        <view v-if="reviewHasMore" class="load-more">

          <button class="btn-more" :loading="reviewLoadingMore" @click="loadReviewMore">加载更多</button>

        </view>

      </view>



      <view v-if="pendingRequest && !isAdmin" class="pending-box">

        <text class="pending-tag">审核中</text>

        <text>已申请等级 {{ pendingRequest.requestLevel }}，请等待管理员处理</text>

      </view>



      <view v-if="!isAdmin" class="field">

        <text class="label">申请权限等级</text>

        <picker :range="levelLabels" :value="levelIndex" @change="onLevelChange">

          <view class="picker">{{ levelLabels[levelIndex] }}</view>

        </picker>

      </view>



      <view v-if="!isAdmin" class="field">

        <text class="label">申请原因</text>

        <textarea

          v-model="reason"

          class="textarea"

          placeholder="请说明申请用途，如：现场运维需要调试充电桩蓝牙"

          maxlength="500"

          :show-confirm-bar="false"

        />

        <text class="counter">{{ reason.length }}/500</text>

      </view>



      <button

        v-if="!isAdmin"

        class="btn-submit"

        :loading="submitting"

        :disabled="submitting || !!pendingRequest"

        @click="onSubmit"

      >

        {{ pendingRequest ? '等待审核中' : '提交申请' }}

      </button>

    </view>



    <view v-if="history.length" class="history-card">

      <text class="history-title">{{ isAdmin ? '我的申请记录' : '申请记录' }}</text>

      <view v-for="item in history" :key="item.id" class="history-item">

        <view class="history-row">

          <text>申请 L{{ item.requestLevel }}</text>

          <text :class="['status', item.status]">{{ statusText(item.status) }}</text>

        </view>

        <text class="history-reason">{{ item.reason }}</text>

        <text v-if="item.adminNote" class="history-note">备注：{{ item.adminNote }}</text>

      </view>

    </view>

  </scroll-view>



  <!-- 审核弹窗 -->

  <view v-if="reviewModal" class="modal-mask" @click="closeReview">

    <view class="modal" @click.stop>

      <text class="modal-title">{{ reviewApprove ? '通过申请' : '拒绝申请' }}</text>

      <text class="modal-meta">{{ displayName(reviewTarget) }} · 申请 L{{ reviewTarget?.requestLevel }}</text>

      <text class="modal-reason">{{ reviewTarget?.reason }}</text>



      <view v-if="reviewApprove" class="field modal-field">

        <text class="label">赋予权限等级</text>

        <picker :range="grantLevelLabels" :value="grantLevelIndex" @change="onGrantLevelChange">

          <view class="picker">{{ grantLevelLabels[grantLevelIndex] }}</view>

        </picker>

      </view>



      <view class="field modal-field">

        <text class="label">审核备注（可选）</text>

        <input v-model="reviewNote" class="input" maxlength="255" placeholder="如：已核实运维需求" />

      </view>



      <view class="modal-actions">

        <button class="btn-ghost" @click="closeReview">取消</button>

        <button

          class="btn-submit modal-btn"

          :loading="reviewing"

          :class="{ danger: !reviewApprove }"

          @click="submitReview"

        >

          {{ reviewing ? '提交中…' : reviewApprove ? '确认通过' : '确认拒绝' }}

        </button>

      </view>

    </view>

  </view>

</template>



<script setup>

import { computed, ref } from 'vue'

import { onShow } from '@dcloudio/uni-app'

import { request } from '@/utils/request.js'

import {

  PERM_OPTIONS,

  GRANT_MAX_LEVEL,

  permLabel,

  isFinalAdmin

} from '@/utils/permission.js'

import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'



const permLevel = ref(0)

const reason = ref('')

const levelIndex = ref(2)

const submitting = ref(false)

const history = ref([])

const pendingRequest = ref(null)



const reviewList = ref([])

const reviewTotal = ref(0)

const reviewPage = ref(1)

const reviewPageSize = 10

const reviewLoading = ref(false)

const reviewLoadingMore = ref(false)



const reviewModal = ref(false)

const reviewTarget = ref(null)

const reviewApprove = ref(true)

const reviewNote = ref('')

const reviewing = ref(false)

const grantLevelIndex = ref(2)



const levelLabels = PERM_OPTIONS.map((o) => o.label)

const grantLevelOptions = Array.from({ length: GRANT_MAX_LEVEL }, (_, i) => ({

  level: i + 1,

  label: `等级 ${i + 1}`

}))

const grantLevelLabels = grantLevelOptions.map((o) => o.label)



const themeVars = computed(() => {

  themeSignal.value

  return getThemeCssVars()

})



const isAdmin = computed(() => isFinalAdmin(permLevel.value))

const currentPermText = computed(() => permLabel(permLevel.value))

const reviewHasMore = computed(() => reviewList.value.length < reviewTotal.value)



function displayName(item) {

  if (!item) return ''

  return item.realName || item.nickname || `学员#${item.userId}`

}



function onLevelChange(e) {

  levelIndex.value = Number(e.detail.value)

}



function onGrantLevelChange(e) {

  grantLevelIndex.value = Number(e.detail.value)

}



function statusText(status) {

  if (status === 'pending') return '待审核'

  if (status === 'approved') return '已通过'

  if (status === 'rejected') return '已拒绝'

  return status

}



async function loadReview(append = false) {

  if (!isAdmin.value) return

  const p = append ? reviewPage.value + 1 : 1

  if (append) reviewLoadingMore.value = true

  else reviewLoading.value = true

  try {

    const qs = `page=${p}&pageSize=${reviewPageSize}`

    const data = await request({

      url: `/auth/permission-requests/review-queue?${qs}`,

      showError: !append

    })

    const rows = data?.list || []

    reviewTotal.value = data?.total || 0

    reviewPage.value = p

    reviewList.value = append ? [...reviewList.value, ...rows] : rows

  } catch (e) {

    if (!append) {

      reviewList.value = []

      reviewTotal.value = 0

    }

  } finally {

    reviewLoading.value = false

    reviewLoadingMore.value = false

  }

}



function loadReviewMore() {

  if (!reviewHasMore.value || reviewLoadingMore.value) return

  loadReview(true)

}



async function loadData() {

  try {

    const me = await request({ url: '/auth/me', showError: false })

    permLevel.value = me?.permLevel ?? 0

  } catch (e) {

    /* ignore */

  }

  try {

    const data = await request({ url: '/auth/permission-requests', showError: false })

    history.value = data?.list || []

    pendingRequest.value = history.value.find((x) => x.status === 'pending') || null

  } catch (e) {

    history.value = []

  }

  if (isAdmin.value) {

    await loadReview(false)

  } else {

    reviewList.value = []

    reviewTotal.value = 0

  }

}



async function onSubmit() {

  const text = reason.value.trim()

  if (text.length < 5) {

    uni.showToast({ title: '申请原因至少 5 个字', icon: 'none' })

    return

  }

  const requestLevel = PERM_OPTIONS[levelIndex.value].level

  submitting.value = true

  try {

    await request({

      url: '/auth/permission-requests',

      method: 'POST',

      data: { requestLevel, reason: text }

    })

    uni.showToast({ title: '已提交', icon: 'success' })

    reason.value = ''

    await loadData()

  } catch (e) {

    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })

  } finally {

    submitting.value = false

  }

}



function openReview(item, approve) {

  reviewTarget.value = item

  reviewApprove.value = approve

  reviewNote.value = ''

  const idx = grantLevelOptions.findIndex((o) => o.level === item.requestLevel)

  grantLevelIndex.value = idx >= 0 ? idx : 2

  reviewModal.value = true

}



function closeReview() {

  reviewModal.value = false

  reviewTarget.value = null

}



async function submitReview() {

  if (!reviewTarget.value || reviewing.value) return

  reviewing.value = true

  try {

    const payload = {

      action: reviewApprove.value ? 'approve' : 'reject',

      adminNote: reviewNote.value.trim()

    }

    if (reviewApprove.value) {

      payload.permLevel = grantLevelOptions[grantLevelIndex.value].level

    }

    await request({

      url: `/auth/permission-requests/${reviewTarget.value.id}/review`,

      method: 'PATCH',

      data: payload

    })

    uni.showToast({

      title: reviewApprove.value ? '已通过' : '已拒绝',

      icon: 'success'

    })

    closeReview()

    await loadData()

  } catch (e) {

    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })

  } finally {

    reviewing.value = false

  }

}



onShow(loadData)

onShow(() => {

  applyThemeUI('权限申请')

})

</script>



<style lang="scss" scoped>

.page {

  min-height: 100vh;

  background: var(--theme-page-bg);

  padding: 24rpx 28rpx;

  box-sizing: border-box;

}



.form-card,

.history-card {

  background: var(--theme-card-bg);

  border-radius: 24rpx;

  padding: 32rpx 28rpx;

  box-shadow: 0 8rpx 28rpx rgba(30, 40, 80, 0.05);

}



.history-card {

  margin-top: 24rpx;

}



.info-box {

  background: linear-gradient(135deg, var(--theme-input-bg) 0%, #f9f7ff 100%);

  border-radius: 20rpx;

  padding: 28rpx;

  margin-bottom: 28rpx;



  &.admin {

    background: linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%);

  }

}



.info-title {

  display: block;

  font-size: 24rpx;

  color: #6b7280;

}



.info-level {

  display: block;

  margin-top: 8rpx;

  font-size: 36rpx;

  font-weight: 700;

  color: var(--theme-primary);

}



.info-admin-tag {

  display: block;

  margin-top: 8rpx;

  font-size: 22rpx;

  color: #b45309;

  font-weight: 600;

}



.info-desc {

  display: block;

  margin-top: 8rpx;

  font-size: 22rpx;

  color: var(--theme-text-sub);

}



.review-section {

  margin-bottom: 28rpx;

}



.review-head {

  display: flex;

  justify-content: space-between;

  align-items: center;

  margin-bottom: 16rpx;

}



.review-title {

  font-size: 30rpx;

  font-weight: 700;

  color: var(--theme-text-main);

}



.review-count {

  font-size: 24rpx;

  color: #d97706;

  font-weight: 600;

}



.review-empty {

  padding: 32rpx;

  text-align: center;

  font-size: 26rpx;

  color: var(--theme-text-sub);

  background: var(--theme-input-bg);

  border-radius: 16rpx;

}



.review-list {

  display: flex;

  flex-direction: column;

  gap: 16rpx;

}



.review-item {

  padding: 24rpx;

  background: var(--theme-input-bg);

  border-radius: 16rpx;

  border: 1rpx solid var(--theme-border-soft);

}



.review-name {

  display: block;

  font-size: 28rpx;

  font-weight: 600;

  color: var(--theme-text-main);

}



.review-meta {

  display: block;

  margin-top: 4rpx;

  font-size: 22rpx;

  color: var(--theme-text-sub);

}



.review-levels {

  display: flex;

  align-items: center;

  gap: 8rpx;

  margin-top: 12rpx;

  font-size: 24rpx;

  color: var(--theme-text-main);



  .arrow {

    color: var(--theme-text-sub);

  }



  .target {

    color: var(--theme-primary);

    font-weight: 600;

  }

}



.review-reason {

  display: block;

  margin-top: 12rpx;

  font-size: 26rpx;

  color: var(--theme-text-sub);

  line-height: 1.5;

}



.review-time {

  display: block;

  margin-top: 8rpx;

  font-size: 22rpx;

  color: var(--theme-text-sub);

}



.review-actions {

  display: flex;

  justify-content: flex-end;

  gap: 12rpx;

  margin-top: 16rpx;

}



.act-btn {

  font-size: 24rpx;

  border: none;

  border-radius: 999rpx;

  padding: 0 24rpx;



  &::after {

    border: none;

  }



  &.approve {

    background: var(--theme-primary);

    color: #fff;

  }



  &.reject {

    background: #fee2e2;

    color: #b91c1c;

  }

}



.load-more {

  margin-top: 16rpx;

  text-align: center;

}



.btn-more {

  font-size: 26rpx;

  background: transparent;

  color: var(--theme-primary);

  border: none;



  &::after {

    border: none;

  }

}



.pending-box {

  display: flex;

  align-items: center;

  gap: 12rpx;

  padding: 20rpx;

  margin-bottom: 24rpx;

  background: #fffbeb;

  border-radius: 16rpx;

  font-size: 24rpx;

  color: #92400e;

}



.pending-tag {

  padding: 4rpx 12rpx;

  background: #fbbf24;

  color: #fff;

  border-radius: 8rpx;

  font-size: 20rpx;

}



.field {

  margin-bottom: 28rpx;

}



.modal-field {

  margin-bottom: 20rpx;

}



.label {

  display: block;

  font-size: 26rpx;

  color: var(--theme-text-main);

  margin-bottom: 12rpx;

  font-weight: 600;

}



.picker {

  padding: 24rpx;

  background: var(--theme-input-bg);

  border-radius: 16rpx;

  font-size: 28rpx;

  color: var(--theme-text-main);

}



.textarea {

  width: 100%;

  min-height: 200rpx;

  padding: 24rpx;

  background: var(--theme-input-bg);

  border-radius: 16rpx;

  font-size: 28rpx;

  box-sizing: border-box;

}



.input {

  width: 100%;

  height: 80rpx;

  padding: 0 24rpx;

  box-sizing: border-box;

  background: var(--theme-input-bg);

  border-radius: 16rpx;

  font-size: 28rpx;

}



.counter {

  display: block;

  text-align: right;

  margin-top: 8rpx;

  font-size: 22rpx;

  color: var(--theme-text-sub);

}



@import '@/styles/buttons.scss';



.btn-submit {

  margin-top: 8rpx;

}



.history-title {

  display: block;

  font-size: 28rpx;

  font-weight: 600;

  color: var(--theme-text-main);

  margin-bottom: 20rpx;

}



.history-item {

  padding: 20rpx 0;

  border-bottom: 1rpx solid var(--theme-border-soft);



  &:last-child {

    border-bottom: none;

  }

}



.history-row {

  display: flex;

  justify-content: space-between;

  font-size: 26rpx;

  color: var(--theme-text-main);

}



.status {

  font-size: 22rpx;



  &.pending {

    color: #d97706;

  }



  &.approved {

    color: #059669;

  }



  &.rejected {

    color: #dc2626;

  }

}



.history-reason {

  display: block;

  margin-top: 8rpx;

  font-size: 24rpx;

  color: var(--theme-text-sub);

  line-height: 1.5;

}



.history-note {

  display: block;

  margin-top: 6rpx;

  font-size: 22rpx;

  color: var(--theme-text-sub);

}



.modal-mask {

  position: fixed;

  inset: 0;

  background: rgba(15, 23, 42, 0.45);

  display: flex;

  align-items: center;

  justify-content: center;

  z-index: 100;

  padding: 40rpx;

  box-sizing: border-box;

}



.modal {

  width: 100%;

  max-width: 640rpx;

  background: var(--theme-card-bg);

  border-radius: 24rpx;

  padding: 32rpx 28rpx;

}



.modal-title {

  display: block;

  font-size: 32rpx;

  font-weight: 700;

  color: var(--theme-text-main);

}



.modal-meta {

  display: block;

  margin-top: 8rpx;

  font-size: 24rpx;

  color: var(--theme-text-sub);

}



.modal-reason {

  display: block;

  margin-top: 16rpx;

  padding: 20rpx;

  background: var(--theme-input-bg);

  border-radius: 12rpx;

  font-size: 26rpx;

  line-height: 1.5;

  color: var(--theme-text-main);

}



.modal-actions {

  display: flex;

  gap: 16rpx;

  margin-top: 24rpx;

}



.btn-ghost {

  flex: 1;

  height: 80rpx;

  line-height: 80rpx;

  background: var(--theme-input-bg);

  color: var(--theme-text-main);

  border-radius: 999rpx;

  font-size: 28rpx;

  border: none;



  &::after {

    border: none;

  }

}



.modal-btn {

  flex: 1.4;

  margin-top: 0;



  &.danger {

    background: #dc2626;

  }

}

</style>


