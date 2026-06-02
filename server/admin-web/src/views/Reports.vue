<template>
  <div>
    <div class="head">
      <h2>学习上报记录</h2>
      <p>查看学员已上报的学习记录，按时间段筛选并导出 Excel</p>
    </div>

    <div class="toolbar panel">
      <label>开始日期</label>
      <input v-model="from" type="date" class="input" />
      <label>结束日期</label>
      <input v-model="to" type="date" class="input" />
      <input v-model="keyword" class="input kw" placeholder="昵称/手机/姓名" @keyup.enter="search" />
      <button class="btn btn-primary" @click="search">查询</button>
      <button class="btn btn-ghost" @click="setRange(7)">近7天</button>
      <button class="btn btn-ghost" @click="setRange(30)">近30天</button>
      <button class="btn btn-ghost" :disabled="exporting" @click="onExport">
        {{ exporting ? '导出中…' : '导出 Excel' }}
      </button>
    </div>

    <div class="summary" v-if="total >= 0">
      共 <strong>{{ total }}</strong> 条（当前页 {{ list.length }} 条）
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>上报日期</th>
            <th>学员</th>
            <th>科目</th>
            <th>任务内容</th>
            <th>目标分</th>
            <th>实际分</th>
            <th>时段</th>
            <th>完成</th>
            <th>备注</th>
            <th>提交时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="10">加载中…</td>
          </tr>
          <tr v-else-if="!list.length">
            <td colspan="10">该时间段暂无上报</td>
          </tr>
          <tr v-for="row in list" :key="row.id">
            <td>{{ row.reportDate }}</td>
            <td>{{ row.nickname }}{{ row.realName ? `（${row.realName}）` : '' }}</td>
            <td>{{ row.subject }}</td>
            <td class="content-cell">{{ row.content || '—' }}</td>
            <td>{{ row.targetMinutes }}</td>
            <td>{{ row.actualMinutes }}</td>
            <td>
              <span v-if="row.startTime">{{ row.startTime }}–{{ row.endTime || '?' }}</span>
              <span v-else>—</span>
            </td>
            <td>
              <span :class="row.completed ? 'tag tag-ok' : 'tag tag-warn'">
                {{ row.completed ? '是' : '否' }}
              </span>
            </td>
            <td class="content-cell">{{ row.note || '—' }}</td>
            <td>{{ row.createdAt }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="total > pageSize" class="pager">
      <button class="btn btn-ghost" :disabled="page <= 1" @click="page--; load()">上一页</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { downloadFile, request } from '@/api/request'

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return { from: isoDate(from), to: isoDate(to) }
}

const { from: defFrom, to: defTo } = defaultRange()
const from = ref(defFrom)
const to = ref(defTo)
const keyword = ref('')
const list = ref([])
const loading = ref(false)
const exporting = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function setRange(days) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  from.value = isoDate(start)
  to.value = isoDate(end)
  search()
}

function search() {
  page.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const q = new URLSearchParams({
      from: from.value,
      to: to.value,
      keyword: keyword.value,
      page: String(page.value),
      pageSize: String(pageSize)
    })
    const data = await request(`/admin/reports?${q}`)
    list.value = data?.list || []
    total.value = data?.total ?? 0
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

async function onExport() {
  exporting.value = true
  try {
    const q = new URLSearchParams({
      from: from.value,
      to: to.value,
      keyword: keyword.value
    })
    const name = `学习上报_${from.value}_${to.value}.xlsx`
    await downloadFile(`/admin/reports/export?${q}`, name)
  } catch (e) {
    alert(e.message)
  } finally {
    exporting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.head h2 {
  margin: 0 0 6px;
}

.head p {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 14px;
}

.panel.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 4px 20px rgba(79, 110, 247, 0.06);
}

.panel.toolbar label {
  font-size: 13px;
  color: #6b7280;
}

.kw {
  min-width: 140px;
}

.summary {
  margin-bottom: 10px;
  font-size: 14px;
  color: #6b7280;
}

.summary strong {
  color: #4f6ef7;
}

.content-cell {
  max-width: 200px;
  word-break: break-all;
}

.pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
</style>
