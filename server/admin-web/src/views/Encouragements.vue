<template>
  <div>
    <div class="head">
      <h2>鼓励话语</h2>
      <p>在此添加的句子会在小程序首页底部随机展示，给学员暖心鼓励</p>
    </div>

    <div class="panel form-panel">
      <h3>新增鼓励语</h3>
      <textarea
        v-model="form.content"
        class="textarea"
        rows="3"
        maxlength="500"
        placeholder="例如：每一天的努力，都在为梦想蓄力。"
      />
      <div class="form-actions">
        <input
          v-model.number="form.sortOrder"
          class="input sort"
          type="number"
          placeholder="排序（越小越靠前）"
        />
        <button class="btn btn-primary" :disabled="saving" @click="onAdd">
          {{ saving ? '提交中…' : '添加' }}
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>内容</th>
            <th>排序</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5">加载中…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="5">暂无鼓励语，请添加</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td>
            <td class="content-cell">{{ row.content }}</td>
            <td>{{ row.sortOrder }}</td>
            <td>
              <span :class="row.status === 'active' ? 'tag tag-ok' : 'tag tag-off'">
                {{ row.status === 'active' ? '展示中' : '已停用' }}
              </span>
            </td>
            <td class="actions">
              <button class="btn btn-ghost" @click="toggleStatus(row)">
                {{ row.status === 'active' ? '停用' : '启用' }}
              </button>
              <button class="btn btn-danger" @click="onRemove(row)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { request } from '@/api/request'

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const form = ref({ content: '', sortOrder: 0 })

async function load() {
  loading.value = true
  try {
    const data = await request('/admin/encouragements')
    list.value = data?.list || []
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

async function onAdd() {
  if (!form.value.content.trim()) {
    alert('请填写内容')
    return
  }
  saving.value = true
  try {
    await request('/admin/encouragements', {
      method: 'POST',
      body: JSON.stringify({
        content: form.value.content.trim(),
        sortOrder: form.value.sortOrder || 0
      })
    })
    form.value.content = ''
    form.value.sortOrder = 0
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row) {
  try {
    await request(`/admin/encouragements/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: row.status === 'active' ? 'disabled' : 'active'
      })
    })
    await load()
  } catch (e) {
    alert(e.message)
  }
}

async function onRemove(row) {
  if (!confirm(`确定删除这条鼓励语？\n${row.content}`)) return
  try {
    await request(`/admin/encouragements/${row.id}`, { method: 'DELETE' })
    await load()
  } catch (e) {
    alert(e.message)
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

.panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(79, 110, 247, 0.06);
}

.panel h3 {
  margin: 0 0 12px;
  font-size: 16px;
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

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  align-items: center;
}

.sort {
  width: 160px;
}

.content-cell {
  max-width: 420px;
  line-height: 1.5;
}

.actions {
  white-space: nowrap;
}

.actions .btn {
  margin-right: 6px;
}
</style>
