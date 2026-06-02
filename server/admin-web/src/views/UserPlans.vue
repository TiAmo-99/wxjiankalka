<template>
  <div>
    <div class="head">
      <router-link to="/users">← 返回学员列表</router-link>
      <h2 v-if="student">「{{ student.nickname }}」的学习任务</h2>
      <p v-if="student" class="user-meta">
        手机 {{ student.phone || '—' }} · 邮箱 {{ student.email || '未填写' }} ·
        权限 L{{ student.permLevel ?? 0 }} ·
        <span :class="student.status === 'active' ? 'tag tag-ok' : 'tag tag-off'">
          {{ student.status === 'active' ? '正常' : '禁用' }}
        </span>
        <button class="btn btn-ghost btn-sm" @click="openPermModal">修改权限</button>
        <button
          class="btn btn-primary btn-remind"
          :disabled="emailSending || !student.email"
          :title="student.email ? '向学员邮箱发送今日未完成任务提醒' : '学员未填写邮箱'"
          @click="sendEmailReminder"
        >
          {{ emailSending ? '发送中…' : '邮箱提醒' }}
        </button>
      </p>
    </div>

    <div class="stats" v-if="stats">
      <div class="stat-card">计划任务 {{ stats.planItemCount }} 项</div>
      <div class="stat-card">累计学习 {{ stats.totalMinutes }} 分钟</div>
      <div class="stat-card">上报 {{ stats.reportCount }} 次</div>
      <div class="stat-card">打卡 {{ stats.streakDays }} 天</div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <label>选择日期</label>
        <input v-model="selectedDate" type="date" class="input" @change="loadItems" />
        <button class="btn btn-ghost" @click="shiftDay(-1)">前一天</button>
        <button class="btn btn-ghost" @click="shiftDay(1)">后一天</button>
        <button class="btn btn-ghost" @click="selectedDate = today; loadItems()">今天</button>
      </div>

      <h3>{{ selectedDate }} 的任务（{{ items.length }}）</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>科目</th>
              <th>任务内容</th>
              <th>目标(分)</th>
              <th>上报</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!items.length">
              <td colspan="5">当日暂无任务，可在下方添加</td>
            </tr>
            <tr v-for="item in items" :key="item.id">
              <td>{{ item.subject }}</td>
              <td>{{ item.content }}</td>
              <td>{{ item.targetMinutes }}</td>
              <td>
                <span v-if="item.reported" class="tag tag-ok">已报 {{ item.actualMinutes }}分</span>
                <span v-else class="tag tag-warn">未报</span>
              </td>
              <td>
                <button class="btn btn-danger" @click="removeItem(item)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel form-panel">
      <h3>添加任务（{{ selectedDate }}）</h3>
      <div class="form-grid">
        <input v-model="form.subject" class="input" placeholder="科目，如：政治" />
        <input v-model="form.content" class="input wide" placeholder="任务内容" />
        <input v-model.number="form.targetMinutes" class="input" type="number" placeholder="目标分钟" />
        <button class="btn btn-primary" :disabled="saving" @click="addItem">
          {{ saving ? '提交中…' : '添加任务' }}
        </button>
      </div>
      <p class="hint">保存后学员在小程序「计划-今日」即可看到；仅当日可在小程序上报。</p>
    </div>
  </div>

  <div v-if="permModal" class="modal-mask" @click.self="permModal = false">
    <div class="modal">
      <h3>修改用户权限</h3>
      <p class="modal-meta">{{ student?.nickname }} · 当前 L{{ student?.permLevel ?? 0 }}</p>
      <label class="field-label">权限等级（0～9，工具箱需 &gt;2）</label>
      <input v-model.number="permInput" class="input" type="number" min="0" max="10" />
      <div class="modal-actions">
        <button class="btn btn-ghost" @click="permModal = false">取消</button>
        <button class="btn btn-primary" :disabled="permSaving" @click="savePermLevel">
          {{ permSaving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { request } from '@/api/request'

const route = useRoute()
const userId = Number(route.params.id)

const student = ref(null)
const stats = ref(null)
const items = ref([])
const selectedDate = ref('')
const saving = ref(false)
const emailSending = ref(false)
const permModal = ref(false)
const permInput = ref(0)
const permSaving = ref(false)
const form = ref({ subject: '', content: '', targetMinutes: 60 })

const today = new Date().toISOString().slice(0, 10)

function shiftDay(delta) {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + delta)
  selectedDate.value = d.toISOString().slice(0, 10)
  loadItems()
}

async function loadStudent() {
  student.value = await request(`/admin/users/${userId}`)
  stats.value = await request(`/admin/users/${userId}/stats`)
  permInput.value = student.value?.permLevel ?? 0
}

function openPermModal() {
  permInput.value = student.value?.permLevel ?? 0
  permModal.value = true
}

async function savePermLevel() {
  permSaving.value = true
  try {
    await request(`/admin/users/${userId}/perm-level`, {
      method: 'PATCH',
      body: JSON.stringify({ permLevel: permInput.value })
    })
    permModal.value = false
    await loadStudent()
  } catch (e) {
    alert(e.message)
  } finally {
    permSaving.value = false
  }
}

async function loadItems() {
  const data = await request(
    `/admin/plan-items?userId=${userId}&from=${selectedDate.value}&to=${selectedDate.value}`
  )
  items.value = data?.list || []
}

async function addItem() {
  if (!form.value.subject.trim() || !form.value.content.trim()) {
    alert('请填写科目和任务内容')
    return
  }
  saving.value = true
  try {
    await request('/admin/plan-items', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        date: selectedDate.value,
        subject: form.value.subject.trim(),
        content: form.value.content.trim(),
        targetMinutes: form.value.targetMinutes || 0
      })
    })
    form.value.subject = ''
    form.value.content = ''
    await loadItems()
    stats.value = await request(`/admin/users/${userId}/stats`)
  } catch (e) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}

async function sendEmailReminder() {
  if (!student.value?.email) {
    alert('该学员未填写邮箱')
    return
  }
  let preview = []
  try {
    const data = await request(`/admin/plan-items?userId=${userId}&from=${today}&to=${today}`)
    preview = (data?.list || []).filter((t) => !t.reported)
  } catch (e) {
    alert(e.message)
    return
  }
  if (!preview.length) {
    alert('今日无未完成任务，无需发送提醒')
    return
  }
  const lines = preview.map((t, i) => `${i + 1}. 【${t.subject}】${t.content}`).join('\n')
  if (!confirm(`将向 ${student.value.email} 发送邮件，包含以下 ${preview.length} 项未完成任务：\n\n${lines}\n\n确定发送？`)) {
    return
  }
  emailSending.value = true
  try {
    await request(`/admin/users/${userId}/email-reminder`, { method: 'POST' })
    alert(`已向 ${student.value.email} 发送提醒邮件`)
  } catch (e) {
    alert(e.message)
  } finally {
    emailSending.value = false
  }
}

async function removeItem(item) {
  if (!confirm(`确定删除「${item.subject}」？`)) return
  try {
    await request(`/admin/plan-items/${item.id}`, { method: 'DELETE' })
    await loadItems()
    stats.value = await request(`/admin/users/${userId}/stats`)
  } catch (e) {
    alert(e.message)
  }
}

onMounted(async () => {
  selectedDate.value = today
  try {
    await loadStudent()
    await loadItems()
  } catch (e) {
    alert(e.message)
  }
})
</script>

<style scoped>
.head a {
  font-size: 14px;
}

.head h2 {
  margin: 12px 0 6px;
}

.head p {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 14px;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-remind {
  margin-left: 4px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
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
  width: min(400px, 92vw);
}

.modal h3 {
  margin: 0 0 8px;
}

.modal-meta {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 14px;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(79, 110, 247, 0.06);
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.panel h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.form-grid {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.form-grid .wide {
  flex: 1;
  min-width: 200px;
}

.hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: #6b7280;
}
</style>
