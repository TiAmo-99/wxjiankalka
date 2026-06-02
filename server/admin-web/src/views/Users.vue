<template>
  <div>
    <div class="head">
      <h2>学员管理</h2>
      <p>
        查看小程序注册用户，为学员配置每日学习任务 ·
        <router-link to="/import">批量导入</router-link>
      </p>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="搜索昵称/手机/姓名" @keyup.enter="load" />
      <select v-model="status" class="select" @change="load">
        <option value="">全部状态</option>
        <option value="active">正常</option>
        <option value="disabled">已禁用</option>
      </select>
      <button class="btn btn-primary" @click="load">查询</button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>昵称</th>
            <th>姓名</th>
            <th>手机号</th>
            <th>权限</th>
            <th>微信</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9">加载中…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="9">暂无学员</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.nickname }}</td>
            <td>{{ row.realName || '—' }}</td>
            <td>{{ row.phone || '—' }}</td>
            <td>L{{ row.permLevel ?? 0 }}</td>
            <td>
              <span :class="row.hasWechat ? 'tag tag-ok' : 'tag tag-warn'">
                {{ row.hasWechat ? '已绑定' : '未绑定' }}
              </span>
            </td>
            <td>
              <span :class="row.status === 'active' ? 'tag tag-ok' : 'tag tag-off'">
                {{ row.status === 'active' ? '正常' : '禁用' }}
              </span>
            </td>
            <td>{{ row.createdAt || '—' }}</td>
            <td>
              <div class="actions">
                <router-link :to="`/users/${row.id}/plans`" class="btn btn-ghost">配置任务</router-link>
                <button class="btn btn-primary btn-sm" @click="openPermModal(row)">修改权限</button>
              </div>
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

    <div v-if="permModal" class="modal-mask" @click.self="permModal = false">
      <div class="modal">
        <h3>修改用户权限</h3>
        <p class="modal-meta">
          {{ permTarget?.nickname }} · 手机 {{ permTarget?.phone || '—' }} · 当前 L{{
            permTarget?.permLevel ?? 0
          }}
        </p>
        <label class="field-label">权限等级（0～9，工具箱需 &gt;2）</label>
        <input v-model.number="permInput" class="input" type="number" min="0" max="10" />
        <p class="modal-hint">0=普通学员 · 3 及以上可使用工具箱 · 10=最终管理员（可小程序审核）</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="permModal = false">取消</button>
          <button class="btn btn-primary" :disabled="permSaving" @click="savePermLevel">
            {{ permSaving ? '保存中…' : '保存' }}
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
const keyword = ref('')
const status = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const permModal = ref(false)
const permTarget = ref(null)
const permInput = ref(0)
const permSaving = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function load() {
  loading.value = true
  try {
    const data = await request(
      `/admin/users?page=${page.value}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword.value)}&status=${status.value}`
    )
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function openPermModal(row) {
  permTarget.value = row
  permInput.value = row.permLevel ?? 0
  permModal.value = true
}

async function savePermLevel() {
  if (!permTarget.value) return
  permSaving.value = true
  try {
    await request(`/admin/users/${permTarget.value.id}/perm-level`, {
      method: 'PATCH',
      body: JSON.stringify({ permLevel: permInput.value })
    })
    permModal.value = false
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    permSaving.value = false
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
  flex-wrap: wrap;
}

.pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
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
  width: min(420px, 92vw);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal h3 {
  margin: 0 0 8px;
}

.modal-meta {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #374151;
}

.modal-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #9ca3af;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
