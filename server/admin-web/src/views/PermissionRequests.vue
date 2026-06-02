<template>
  <div>
    <div class="head">
      <h2>权限申请</h2>
      <p>审核学员权限升级申请，通过后可调整最终权限等级</p>
    </div>

    <div class="toolbar">
      <select v-model="status" class="select" @change="load">
        <option value="">全部状态</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">已拒绝</option>
      </select>
      <button class="btn btn-primary" @click="load">刷新</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>学员</th>
            <th>手机</th>
            <th>当前权限</th>
            <th>申请等级</th>
            <th>申请原因</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9">加载中…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="9">暂无申请</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.nickname }}</td>
            <td>{{ row.phone || '—' }}</td>
            <td>L{{ row.currentPermLevel }}</td>
            <td>L{{ row.requestLevel }}</td>
            <td class="reason">{{ row.reason }}</td>
            <td>
              <span :class="['tag', statusClass(row.status)]">{{ statusLabel(row.status) }}</span>
            </td>
            <td>{{ row.createdAt || '—' }}</td>
            <td>
              <button
                v-if="row.status === 'pending'"
                class="btn btn-primary btn-sm"
                @click="openReview(row)"
              >
                处理
              </button>
              <span v-else class="muted">{{ row.adminNote || '—' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > pageSize" class="pager">
      <button class="btn btn-ghost" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
    </div>

    <div v-if="reviewRow" class="modal-mask" @click.self="reviewRow = null">
      <div class="modal">
        <h3>处理权限申请 #{{ reviewRow.id }}</h3>
        <p class="modal-meta">
          {{ reviewRow.nickname }} · 当前 L{{ reviewRow.currentPermLevel }} → 申请 L{{
            reviewRow.requestLevel
          }}
        </p>
        <p class="modal-reason">{{ reviewRow.reason }}</p>

        <label class="field-label">通过后赋予权限等级</label>
        <input v-model.number="reviewLevel" class="input" type="number" min="0" max="9" />

        <label class="field-label">审核备注（可选）</label>
        <input v-model="reviewNote" class="input" placeholder="如：已核实运维需求" />

        <div class="modal-actions">
          <button class="btn btn-ghost" @click="reviewRow = null">取消</button>
          <button class="btn btn-danger" :disabled="reviewing" @click="submitReview(false)">拒绝</button>
          <button class="btn btn-primary" :disabled="reviewing" @click="submitReview(true)">
            {{ reviewing ? '提交中…' : '通过' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { request } from '@/api/request'

const list = ref([])
const loading = ref(false)
const status = ref('pending')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const reviewRow = ref(null)
const reviewLevel = ref(3)
const reviewNote = ref('')
const reviewing = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function statusLabel(s) {
  if (s === 'pending') return '待审核'
  if (s === 'approved') return '已通过'
  if (s === 'rejected') return '已拒绝'
  return s
}

function statusClass(s) {
  if (s === 'pending') return 'tag-warn'
  if (s === 'approved') return 'tag-ok'
  if (s === 'rejected') return 'tag-off'
  return ''
}

async function load() {
  loading.value = true
  try {
    const data = await request(
      `/admin/permission-requests?page=${page.value}&pageSize=${pageSize}&status=${status.value}`
    )
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function openReview(row) {
  reviewRow.value = row
  reviewLevel.value = row.requestLevel
  reviewNote.value = ''
}

async function submitReview(approved) {
  if (!reviewRow.value) return
  reviewing.value = true
  try {
    await request(`/admin/permission-requests/${reviewRow.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: approved ? 'approve' : 'reject',
        permLevel: approved ? reviewLevel.value : undefined,
        adminNote: reviewNote.value
      })
    })
    reviewRow.value = null
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    reviewing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.head h2 {
  margin: 0 0 6px;
}

.head p {
  margin: 0 0 20px;
  color: #6b7280;
  font-size: 14px;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.reason {
  max-width: 220px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 13px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.muted {
  font-size: 12px;
  color: #9ca3af;
}

.pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: min(440px, 92vw);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin: 0 0 8px;
}

.modal-meta {
  margin: 0 0 8px;
  color: #6b7280;
  font-size: 14px;
}

.modal-reason {
  margin: 0 0 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #374151;
}

.field-label + .input {
  margin-bottom: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
