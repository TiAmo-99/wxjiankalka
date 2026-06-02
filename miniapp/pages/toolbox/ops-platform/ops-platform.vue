<template>
  <theme-page-meta />
  <scroll-view class="page" :style="themeVars" scroll-y>
    <view class="card account-card">
      <text class="card-title">运维账号</text>
      <text class="card-hint">手机号与密码将自动保存在本机，仅用于连接运维平台</text>
      <view class="field">
        <text class="label">手机号</text>
        <input
          v-model="loginId"
          class="input"
          type="number"
          maxlength="11"
          placeholder="运维平台登录手机号"
          @blur="persistAccount"
        />
      </view>
      <view class="field">
        <text class="label">密码</text>
        <input
          v-model="password"
          class="input"
          :password="!showPassword"
          maxlength="32"
          placeholder="运维平台登录密码"
          @blur="persistAccount"
        />
        <text class="toggle-pwd" @click="showPassword = !showPassword">
          {{ showPassword ? '隐藏' : '显示' }}
        </text>
      </view>
      <text v-if="accountSavedHint" class="saved-hint">{{ accountSavedHint }}</text>
    </view>

    <view class="card">
      <text class="card-title">充电站查询</text>
      <view class="row">
        <input
          v-model="stationKeyword"
          class="input flex"
          placeholder="充电站名称（可空，查全部）"
          confirm-type="search"
          @confirm="searchStations"
        />
        <button class="btn-mini" :loading="stationLoading" @click="searchStations">查询</button>
      </view>
      <view v-if="stationLoading" class="state">加载中…</view>
      <view v-else-if="stations.length" class="pick-list">
        <view
          v-for="item in stations"
          :key="item.id"
          class="pick-item"
          :class="{ active: selectedStation && selectedStation.id === item.id }"
          @click="selectStation(item)"
        >
          <text class="pick-name">{{ item.name || item.stationName || `站#${item.id}` }}</text>
          <text v-if="item.id" class="pick-meta">ID {{ item.id }}</text>
        </view>
      </view>
      <view v-else-if="stationSearched" class="state muted">未找到充电站</view>
    </view>

    <view v-if="selectedStation" class="card">
      <text class="card-title">充电桩列表</text>
      <text class="card-sub">{{ selectedStation.name || selectedStation.stationName }}</text>
      <view v-if="pileLoading" class="state">加载中…</view>
      <view v-else-if="piles.length" class="pick-list">
        <view
          v-for="item in piles"
          :key="item.code || item.id"
          class="pick-item"
          @click="queryPileByCode(item.code || item.pileCode)"
        >
          <text class="pick-name">{{ item.name || item.code || '未命名' }}</text>
          <text class="pick-meta">编号 {{ item.code || item.pileCode || '—' }}</text>
        </view>
      </view>
      <view v-else class="state muted">该站下暂无充电桩数据</view>
    </view>

    <view class="card">
      <text class="card-title">按桩编号查询</text>
      <view class="row">
        <input
          v-model="cpcode"
          class="input flex"
          type="text"
          placeholder="请输入充电桩编号"
          confirm-type="search"
          @confirm="queryPileByCode(cpcode)"
        />
        <button class="btn-mini" :loading="pileDetailLoading" @click="queryPileByCode(cpcode)">
          查询
        </button>
      </view>
    </view>

    <view v-if="pileDetail" class="card detail-card">
      <text class="card-title">充电桩信息</text>
      <view class="kv">
        <text class="k">桩编号</text>
        <text class="v">{{ cpcode || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">桩 ID</text>
        <text class="v">{{ pileDetail.cpid || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">地址</text>
        <text class="v">{{ pileDetail.cpaddr || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">类型</text>
        <text class="v">{{ pileTypeText }}</text>
      </view>
      <view class="kv">
        <text class="k">终端数</text>
        <text class="v">{{ pileDetail.termnum ?? '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">通信状态</text>
        <text class="v" :class="pileDetail.commstatus === 1 ? 'ok' : 'warn'">{{ commText }}</text>
      </view>
      <view class="kv">
        <text class="k">软件版本</text>
        <text class="v">{{ pileDetail.softver || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">规约版本</text>
        <text class="v">{{ pileDetail.ptlver || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">环境温度</text>
        <text class="v">{{ pileDetail.envtemp != null ? pileDetail.envtemp + '℃' : '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">最后通信</text>
        <text class="v">{{ pileDetail.lastcommtime || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">最后心跳</text>
        <text class="v">{{ pileDetail.lasthbtime || '—' }}</text>
      </view>
      <view class="kv">
        <text class="k">心跳次数</text>
        <text class="v">{{ pileDetail.hbcount ?? '—' }}</text>
      </view>

      <view v-if="terminals.length" class="section">
        <text class="section-title">充电终端</text>
        <view v-for="t in terminals" :key="t.id" class="term-row">
          <text>{{ t.name || `终端#${t.id}` }}</text>
          <text class="term-id">ID {{ t.id }}</text>
        </view>
      </view>

      <view v-if="faultInfo" class="section">
        <text class="section-title">告警摘要</text>
        <view class="fault-grid">
          <view class="fault-item">
            <text class="fault-k">故障总</text>
            <text :class="faultInfo.frsum > 0 ? 'warn' : 'ok'">{{ faultFlag(faultInfo.frsum) }}</text>
          </view>
          <view class="fault-item">
            <text class="fault-k">告警总</text>
            <text :class="faultInfo.warnsum > 0 ? 'warn' : 'ok'">{{ faultFlag(faultInfo.warnsum) }}</text>
          </view>
          <view class="fault-item">
            <text class="fault-k">急停</text>
            <text :class="faultInfo.frquickstop > 0 ? 'warn' : 'ok'">{{ faultFlag(faultInfo.frquickstop) }}</text>
          </view>
          <view class="fault-item">
            <text class="fault-k">过温</text>
            <text :class="faultInfo.frhightemp > 0 ? 'warn' : 'ok'">{{ faultFlag(faultInfo.frhightemp) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="foot-tip">
      <text>请在微信公众平台将 request 合法域名配置为 cms.iesztn.com</text>
    </view>
    <view class="foot-spacer" />
  </scroll-view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { loadOpsAccount, saveOpsAccount } from '@/utils/ops-account.js'
import { fetchPileDebug, fetchPileList, fetchStationList } from '@/utils/ops-request.js'
import { commStatusLabel, faultFlagLabel, formatOpsTime, pileTypeLabel } from '@/utils/ops-format.js'
import { applyThemeUI, getThemeCssVars, themeSignal } from '@/utils/theme.js'

const loginId = ref('')
const password = ref('')
const showPassword = ref(false)
const accountSavedHint = ref('')

const stationKeyword = ref('')
const stations = ref([])
const stationLoading = ref(false)
const stationSearched = ref(false)
const selectedStation = ref(null)

const piles = ref([])
const pileLoading = ref(false)

const cpcode = ref('')
const pileDetail = ref(null)
const pileDetailLoading = ref(false)
const faultInfo = ref(null)
const terminals = ref([])

const themeVars = computed(() => {
  themeSignal.value
  return getThemeCssVars()
})

const pileTypeText = computed(() =>
  pileDetail.value ? pileTypeLabel(pileDetail.value.cptype) : '—'
)
const commText = computed(() =>
  pileDetail.value ? commStatusLabel(pileDetail.value.commstatus) : '—'
)

let saveTimer = null

function persistAccount() {
  saveOpsAccount({ loginId: loginId.value, password: password.value })
  accountSavedHint.value = '已保存到本地'
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    accountSavedHint.value = ''
  }, 2000)
}

watch([loginId, password], () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persistAccount, 500)
})

function validateLoginId() {
  const id = loginId.value.trim()
  if (id.length !== 11) {
    uni.showToast({ icon: 'none', title: '请输入11位运维手机号' })
    return ''
  }
  return id
}

function faultFlag(v) {
  return faultFlagLabel(v)
}

async function searchStations() {
  const id = validateLoginId()
  if (!id) return

  stationLoading.value = true
  stationSearched.value = false
  selectedStation.value = null
  piles.value = []
  pileDetail.value = null

  try {
    const data = await fetchStationList(id, stationKeyword.value.trim())
    stations.value = data?.stationList || []
    stationSearched.value = true
    if (!stations.value.length) {
      uni.showToast({ icon: 'none', title: '未找到充电站' })
    }
  } catch (e) {
    stations.value = []
    stationSearched.value = true
    uni.showToast({ icon: 'none', title: e.message || '查询失败' })
  } finally {
    stationLoading.value = false
  }
}

async function selectStation(item) {
  selectedStation.value = item
  piles.value = []
  pileLoading.value = true
  cpcode.value = ''

  try {
    const data = await fetchPileList(item.id)
    piles.value = data?.chgpileList || []
  } catch (e) {
    piles.value = []
    uni.showToast({ icon: 'none', title: e.message || '加载充电桩失败' })
  } finally {
    pileLoading.value = false
  }
}

async function queryPileByCode(code) {
  const id = validateLoginId()
  if (!id) return

  const c = String(code || '').trim()
  if (!c) {
    uni.showToast({ icon: 'none', title: '请输入充电桩编号' })
    return
  }

  cpcode.value = c
  pileDetailLoading.value = true
  pileDetail.value = null
  faultInfo.value = null
  terminals.value = []

  try {
    const data = await fetchPileDebug(c, id)
    if (data?.result !== 'success') {
      uni.showModal({ title: '提示', content: '未查询到此充电桩', showCancel: false })
      return
    }

    const raw = data.cpredisdata || {}
    pileDetail.value = {
      ...raw,
      lastcommtime: formatOpsTime(raw.lastcommtime),
      lasthbtime: formatOpsTime(raw.lasthbtime),
      lastcpstatustime: formatOpsTime(raw.lastcpstatustime)
    }
    faultInfo.value = data.faultinfo || null
    terminals.value = data.termlist || []
  } catch (e) {
    uni.showToast({ icon: 'none', title: e.message || '查询失败' })
  } finally {
    pileDetailLoading.value = false
  }
}

onShow(() => {
  applyThemeUI('运维平台调试')
  const saved = loadOpsAccount()
  loginId.value = saved.loginId
  password.value = saved.password
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--theme-page-bg);
  padding: 24rpx 28rpx;
  box-sizing: border-box;
}

.card {
  background: var(--theme-card-bg);
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid var(--theme-border-soft);
  box-shadow: 0 8rpx 24rpx rgba(30, 40, 80, 0.05);
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--theme-text-main);
}

.card-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--theme-text-sub);
}

.card-hint {
  display: block;
  margin-top: 8rpx;
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  line-height: 1.45;
}

.field {
  margin-top: 16rpx;
  position: relative;
}

.label {
  display: block;
  font-size: 24rpx;
  color: var(--theme-text-sub);
  margin-bottom: 8rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: var(--theme-input-bg);
  border-radius: 16rpx;
  font-size: 28rpx;
  color: var(--theme-text-main);
  border: 1rpx solid var(--theme-border-soft);
}

.toggle-pwd {
  position: absolute;
  right: 20rpx;
  bottom: 22rpx;
  font-size: 24rpx;
  color: var(--theme-primary);
}

.saved-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: var(--theme-primary);
}

.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
}

.flex {
  flex: 1;
}

.btn-mini {
  flex-shrink: 0;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  background: var(--theme-primary);
  color: #fff;
  border-radius: 16rpx;
  border: none;

  &::after {
    border: none;
  }
}

.state {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: var(--theme-text-sub);
  text-align: center;

  &.muted {
    opacity: 0.85;
  }
}

.pick-list {
  margin-top: 16rpx;
  max-height: 360rpx;
  overflow-y: auto;
}

.pick-item {
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  border-bottom: 1rpx solid var(--theme-border-soft);

  &.active {
    background: var(--theme-input-bg);
  }

  &:last-child {
    border-bottom: none;
  }
}

.pick-name {
  display: block;
  font-size: 28rpx;
  color: var(--theme-text-main);
}

.pick-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
}

.kv {
  display: flex;
  padding: 14rpx 0;
  border-bottom: 1rpx solid var(--theme-border-soft);
  font-size: 26rpx;
  line-height: 1.45;

  &:last-of-type {
    border-bottom: none;
  }
}

.k {
  width: 180rpx;
  flex-shrink: 0;
  color: var(--theme-text-sub);
}

.v {
  flex: 1;
  color: var(--theme-text-main);
  word-break: break-all;

  &.ok {
    color: #16a34a;
  }

  &.warn {
    color: #dc2626;
  }
}

.section {
  margin-top: 24rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--theme-border-soft);
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--theme-text-main);
  margin-bottom: 12rpx;
}

.term-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: var(--theme-text-main);
}

.term-id {
  color: var(--theme-text-sub);
  font-size: 24rpx;
}

.fault-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.fault-item {
  background: var(--theme-input-bg);
  border-radius: 12rpx;
  padding: 16rpx;
  font-size: 24rpx;
}

.fault-k {
  display: block;
  color: var(--theme-text-sub);
  margin-bottom: 6rpx;
}

.foot-tip {
  padding: 8rpx 8rpx 24rpx;
  font-size: 22rpx;
  color: var(--theme-text-sub);
  line-height: 1.5;
  text-align: center;
}

.foot-spacer {
  height: 40rpx;
}
</style>
