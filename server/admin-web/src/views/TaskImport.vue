<template>
  <div>
    <div class="head">
      <h2>批量导入学习任务</h2>
      <p>先选择学员 → 下载模板 → 填写后上传（表格中不含手机号）</p>
    </div>

    <div class="panel select-panel">
      <h3>选择学员</h3>
      <div class="select-row">
        <select v-model="userId" class="select student-select" @change="onStudentChange">
          <option value="">请选择学员…</option>
          <option v-for="s in students" :key="s.id" :value="s.id">
            {{ s.nickname }}{{ s.realName ? `（${s.realName}）` : '' }} · ID {{ s.id }}
          </option>
        </select>
        <button class="btn btn-ghost" @click="loadStudents">刷新列表</button>
      </div>
      <p v-if="selectedStudent" class="selected-tip">
        当前学员：<strong>{{ selectedStudent.nickname }}</strong>
        <span v-if="selectedStudent.realName">（{{ selectedStudent.realName }}）</span>
      </p>
    </div>

    <div class="panel">
      <h3>第一步：下载模板</h3>
      <p class="hint">模板仅含：日期、科目、任务内容、目标分钟。学员以网页选择为准。</p>
      <button
        class="btn btn-primary"
        :disabled="!userId || downloading"
        @click="onDownload"
      >
        {{ downloading ? '下载中…' : '下载 Excel 模板' }}
      </button>
    </div>

    <div class="panel">
      <h3>第二步：上传已填写的表格</h3>
      <p class="hint">日期格式 2026-06-01；目标分钟可留空（默认 60）。</p>
      <div class="upload-row">
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls"
          :disabled="!userId"
          @change="onFileChange"
        />
        <button
          class="btn btn-primary"
          :disabled="!userId || !file || uploading"
          @click="onUpload"
        >
          {{ uploading ? '导入中…' : '开始导入' }}
        </button>
      </div>
      <p v-if="file" class="file-name">已选：{{ file.name }}</p>
    </div>

    <div v-if="result" class="panel result">
      <h3>导入结果（{{ result.studentName }}）</h3>
      <p class="summary">
        成功 <strong>{{ result.success }}</strong> 条，失败
        <strong>{{ result.failed }}</strong> 条
      </p>
      <div v-if="result.errors?.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>表格行号</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(err, i) in result.errors" :key="i">
              <td>第 {{ err.row }} 行</td>
              <td>{{ err.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { downloadFile, request, uploadFile } from '@/api/request'

const downloading = ref(false)
const uploading = ref(false)
const file = ref(null)
const fileInput = ref(null)
const result = ref(null)
const userId = ref('')
const students = ref([])

const selectedStudent = computed(() =>
  students.value.find((s) => String(s.id) === String(userId.value))
)

async function loadStudents() {
  try {
    const data = await request('/admin/users?page=1&pageSize=500&status=active')
    students.value = data?.list || []
  } catch (e) {
    alert(e.message)
  }
}

function onStudentChange() {
  result.value = null
  file.value = null
  if (fileInput.value) fileInput.value.value = ''
}

async function onDownload() {
  if (!userId.value) {
    alert('请先选择学员')
    return
  }
  downloading.value = true
  try {
    const q = `userId=${userId.value}`
    const name = `学习任务导入_${selectedStudent.value?.nickname || userId.value}.xlsx`
    await downloadFile(`/admin/plan-items/import-template?${q}`, name)
  } catch (e) {
    alert(e.message)
  } finally {
    downloading.value = false
  }
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  file.value = f || null
  result.value = null
}

async function onUpload() {
  if (!userId.value || !file.value) return
  uploading.value = true
  result.value = null
  try {
    result.value = await uploadFile('/admin/plan-items/import', file.value, {
      userId: userId.value
    })
  } catch (e) {
    alert(e.message)
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
    file.value = null
  }
}

onMounted(loadStudents)
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
  margin: 0 0 10px;
  font-size: 16px;
}

.select-row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.student-select {
  min-width: 280px;
  height: 38px;
}

.selected-tip {
  margin: 12px 0 0;
  font-size: 14px;
  color: #374151;
}

.selected-tip strong {
  color: #4f6ef7;
}

.hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
}

.upload-row {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.file-name {
  margin: 10px 0 0;
  font-size: 13px;
  color: #374151;
}

.summary {
  margin: 0 0 12px;
}

.summary strong {
  color: #4f6ef7;
}

.result .table-wrap {
  margin-top: 12px;
}
</style>
