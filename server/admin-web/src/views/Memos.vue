<template>
  <div>
    <div class="head">
      <h2>学员备忘录</h2>
      <p>查看、编辑、删除所有学员的云端备忘录（小程序「我的 → 备忘录」同步数据）</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-label">备忘录总数</span>
        <span class="stat-value">{{ stats.total }}</span>
      </div>
      <div class="stat-card ok">
        <span class="stat-label">今日新增</span>
        <span class="stat-value">{{ stats.todayCreated }}</span>
      </div>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="input search"
        placeholder="搜索标题 / 内容 / 学员昵称 / 手机"
        @keyup.enter="onSearch"
      />
      <input
        v-model="userIdFilter"
        class="input uid"
        type="number"
        min="1"
        placeholder="学员 ID"
        @keyup.enter="onSearch"
      />
      <button class="btn btn-primary" @click="onSearch">查询</button>
      <button class="btn btn-ghost" @click="openCreate">新建备忘录</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>学员</th>
            <th>标题</th>
            <th>内容摘要</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="6">暂无备忘录</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td>
            <td class="user-cell">
              <div class="user-name">{{ row.userNickname || '—' }}</div>
              <div class="user-meta">ID {{ row.userId }} · {{ row.userPhone || '无手机' }}</div>
            </td>
            <td>{{ row.title || '（无标题）' }}</td>
            <td class="content-cell">{{ preview(row.content) }}</td>
            <td>{{ row.updatedAt || row.createdAt || '—' }}</td>
            <td class="actions">
              <button class="btn btn-ghost btn-sm" @click="openEdit(row)">编辑</button>
              <button class="btn btn-danger btn-sm" @click="onRemove(row)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > pageSize" class="pager">
      <button class="btn btn-ghost" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>{{ page }} / {{ totalPages }}（共 {{ total }} 条）</span>
      <button class="btn btn-ghost" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
    </div>

    <div v-if="modalOpen" class="modal-mask" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editing ? '编辑备忘录' : '新建备忘录' }}</h3>
        <p v-if="editing" class="modal-meta">
          学员：{{ form.userNickname || '—' }}（ID {{ form.userId }}）
        </p>
        <label v-if="!editing" class="field-label">学员 ID *</label>
        <input
          v-if="!editing"
          v-model.number="form.userId"
          class="input"
          type="number"
          min="1"
          placeholder="在「学员管理」中查看 ID"
        />
        <label class="field-label">标题</label>
        <input v-model="form.title" class="input" maxlength="120" placeholder="可选" />
        <label class="field-label">内容 *</label>
        <textarea
          v-model="form.content"
          class="textarea"
          rows="8"
          maxlength="10000"
          placeholder="备忘录正文"
        />
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closeModal">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
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
const saving = ref(false)
const keyword = ref('')
const userIdFilter = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const stats = ref({ total: 0, todayCreated: 0 })

const modalOpen = ref(false)
const editing = ref(false)
const editId = ref(null)
const form = ref({
  userId: null,
  userNickname: '',
  title: '',
  content: ''
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function preview(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  if (!s) return '（无内容）'
  return s.length > 60 ? `${s.slice(0, 60)}…` : s
}

async function loadStats() {
  try {
    stats.value = (await request('/admin/memos/stats')) || { total: 0, todayCreated: 0 }
  } catch (_) {
    stats.value = { total: 0, todayCreated: 0 }
  }
}

async function load() {
  loading.value = true
  try {
    const uid = userIdFilter.value === '' || userIdFilter.value === null ? '' : Number(userIdFilter.value)
    const qs = new URLSearchParams({
      page: String(page.value),
      pageSize: String(pageSize),
      keyword: keyword.value.trim()
    })
    if (uid) qs.set('userId', String(uid))
    const data = await request(`/admin/memos?${qs}`)
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  load()
}

function openCreate() {
  editing.value = false
  editId.value = null
  form.value = { userId: null, userNickname: '', title: '', content: '' }
  modalOpen.value = true
}

function openEdit(row) {
  editing.value = true
  editId.value = row.id
  form.value = {
    userId: row.userId,
    userNickname: row.userNickname,
    title: row.title || '',
    content: row.content || ''
  }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function save() {
  if (!form.value.content.trim()) {
    alert('请填写内容')
    return
  }
  if (!editing.value && !form.value.userId) {
    alert('请填写学员 ID')
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.value.title.trim(),
      content: form.value.content.trim()
    }
    if (editing.value) {
      await request(`/admin/memos/${editId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    } else {
      await request('/admin/memos', {
        method: 'POST',
        body: JSON.stringify({ ...payload, userId: form.value.userId })
      })
    }
    modalOpen.value = false
    await Promise.all([load(), loadStats()])
  } catch (e) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}

async function onRemove(row) {
  const title = row.title || '无标题'
  if (!confirm(`确定删除备忘录 #${row.id}「${title}」？\n学员：${row.userNickname || row.userId}`)) return
  try {
    await request(`/admin/memos/${row.id}`, { method: 'DELETE' })
    await Promise.all([load(), loadStats()])
  } catch (e) {
    alert(e.message)
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), load()])
})
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

.stats {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 140px;
  box-shadow: 0 4px 20px rgba(79, 110, 247, 0.06);
}

.stat-card.ok .stat-value {
  color: #059669;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
}

.stat-value {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.search {
  flex: 1;
  min-width: 220px;
}

.uid {
  width: 120px;
}

.user-cell {
  min-width: 120px;
}

.user-name {
  font-weight: 600;
}

.user-meta {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.content-cell {
  max-width: 320px;
  line-height: 1.5;
  color: #374151;
}

.actions {
  white-space: nowrap;
}

.actions .btn {
  margin-right: 6px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.modal-meta {
  margin: 0 0 12px;
  color: #6b7280;
  font-size: 14px;
}

.field-label {
  display: block;
  margin: 12px 0 6px;
  font-size: 14px;
  color: #374151;
}

.textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
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
  width: min(520px, 92vw);
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin: 0 0 8px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}
</style>
