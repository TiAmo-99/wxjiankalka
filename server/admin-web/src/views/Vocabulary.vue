<template>
  <div>
    <div class="head">
      <h2>英语词库</h2>
      <p>
        管理小程序随机单词与学习页语料 · 导入：
        <code>npm run db:import-vocab:kaoyan</code>、
        <code>npm run db:import-phrases</code>
      </p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <span class="stat-label">总单词数</span>
        <span class="stat-value">{{ stats.totalWords }}</span>
      </div>
      <div class="stat-card ok">
        <span class="stat-label">单词启用</span>
        <span class="stat-value">{{ stats.activeWords }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">短语</span>
        <span class="stat-value">{{ stats.phraseKindCount }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">长句</span>
        <span class="stat-value">{{ stats.sentenceCount }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">阅读片段</span>
        <span class="stat-value">{{ stats.passageCount }}</span>
      </div>
    </div>

    <div class="tabs">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: tab === 'words' }"
        @click="switchTab('words')"
      >
        单词
      </button>
      <button
        type="button"
        class="tab-btn"
        :class="{ active: tab === 'phrases' }"
        @click="switchTab('phrases')"
      >
        语料（短语 / 长句 / 片段）
      </button>
    </div>

    <!-- 单词 -->
    <template v-if="tab === 'words'">
      <div class="toolbar">
        <input
          v-model="keyword"
          class="input search"
          placeholder="搜索单词 / 中文释义"
          @keyup.enter="onSearch"
        />
        <select v-model="status" class="select" @change="onSearch">
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">停用</option>
        </select>
        <button class="btn btn-primary" @click="onSearch">查询</button>
        <button class="btn btn-ghost" @click="openCreate">新增单词</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>单词</th>
              <th>音标</th>
              <th>中文释义</th>
              <th>标签</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7">加载中…</td>
            </tr>
            <tr v-else-if="!list.length">
              <td colspan="7">暂无单词，请新增或执行词库导入</td>
            </tr>
            <tr v-for="row in list" :key="row.id">
              <td>{{ row.id }}</td>
              <td class="word-cell">{{ row.word }}</td>
              <td>{{ row.phonetic || '—' }}</td>
              <td class="meaning-cell">{{ row.meaningZh }}</td>
              <td>{{ row.tags }}</td>
              <td>
                <span :class="row.status === 1 ? 'tag tag-ok' : 'tag tag-off'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" @click="openEdit(row)">编辑</button>
                <button class="btn btn-ghost btn-sm" @click="toggleStatus(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </button>
                <button class="btn btn-danger btn-sm" @click="onRemove(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 语料 -->
    <template v-else>
      <div class="toolbar">
        <input
          v-model="phraseKeyword"
          class="input search"
          placeholder="搜索英文 / 中文 / 标题"
          @keyup.enter="onPhraseSearch"
        />
        <select v-model="phraseKind" class="select" @change="onPhraseSearch">
          <option value="">全部类型</option>
          <option value="phrase">短语</option>
          <option value="sentence">长句</option>
          <option value="passage">阅读片段</option>
        </select>
        <select v-model="phraseStatus" class="select" @change="onPhraseSearch">
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">停用</option>
        </select>
        <button class="btn btn-primary" @click="onPhraseSearch">查询</button>
        <button class="btn btn-ghost" @click="openPhraseCreate">新增语料</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>标题</th>
              <th>英文内容</th>
              <th>中文释义</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="phraseLoading">
              <td colspan="7">加载中…</td>
            </tr>
            <tr v-else-if="!phraseList.length">
              <td colspan="7">暂无语料，请新增或执行 npm run db:import-phrases</td>
            </tr>
            <tr v-for="row in phraseList" :key="row.id">
              <td>{{ row.id }}</td>
              <td><span class="kind-tag">{{ kindLabel(row.kind) }}</span></td>
              <td>{{ row.title || '—' }}</td>
              <td class="meaning-cell clip">{{ row.phraseEn }}</td>
              <td class="meaning-cell clip">{{ row.meaningZh }}</td>
              <td>
                <span :class="row.status === 1 ? 'tag tag-ok' : 'tag tag-off'">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </span>
              </td>
              <td class="actions">
                <button class="btn btn-ghost btn-sm" @click="openPhraseEdit(row)">编辑</button>
                <button class="btn btn-ghost btn-sm" @click="togglePhraseStatus(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </button>
                <button class="btn btn-danger btn-sm" @click="onPhraseRemove(row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-if="currentTotal > pageSize" class="pager">
      <button class="btn btn-ghost" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">
        上一页
      </button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页 · 共 {{ currentTotal }} 条</span>
      <button
        class="btn btn-ghost"
        :disabled="currentPage >= totalPages"
        @click="goPage(currentPage + 1)"
      >
        下一页
      </button>
    </div>

    <!-- 单词弹窗 -->
    <div v-if="modal" class="modal-mask" @click.self="closeModal">
      <div class="modal modal-wide">
        <h3>{{ editingId ? '编辑单词' : '新增单词' }}</h3>
        <div class="form-grid">
          <label class="field">
            <span>英文单词 *</span>
            <input v-model="form.word" class="input" maxlength="64" placeholder="如 abandon" />
          </label>
          <label class="field">
            <span>音标</span>
            <input v-model="form.phonetic" class="input" maxlength="128" placeholder="可选" />
          </label>
          <label class="field full">
            <span>中文释义 *</span>
            <textarea v-model="form.meaningZh" class="textarea" rows="2" maxlength="512" />
          </label>
          <label class="field full">
            <span>英文例句</span>
            <input v-model="form.exampleEn" class="input" maxlength="512" />
          </label>
          <label class="field full">
            <span>例句中文</span>
            <input v-model="form.exampleZh" class="input" maxlength="512" />
          </label>
          <label class="field">
            <span>标签</span>
            <input v-model="form.tags" class="input" maxlength="128" placeholder="kaoyan" />
          </label>
          <label class="field">
            <span>状态</span>
            <select v-model.number="form.status" class="select">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closeModal">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 语料弹窗 -->
    <div v-if="phraseModal" class="modal-mask" @click.self="closePhraseModal">
      <div class="modal modal-wide modal-tall">
        <h3>{{ phraseEditingId ? '编辑语料' : '新增语料' }}</h3>
        <div class="form-grid">
          <label class="field">
            <span>类型 *</span>
            <select v-model="phraseForm.kind" class="select">
              <option value="phrase">短语</option>
              <option value="sentence">长句</option>
              <option value="passage">阅读片段</option>
            </select>
          </label>
          <label class="field">
            <span>标题</span>
            <input
              v-model="phraseForm.title"
              class="input"
              maxlength="120"
              placeholder="可选，如「阅读·教育」"
            />
          </label>
          <label class="field full">
            <span>英文内容 *</span>
            <textarea
              v-model="phraseForm.phraseEn"
              class="textarea"
              :rows="phraseForm.kind === 'passage' ? 8 : phraseForm.kind === 'sentence' ? 4 : 2"
              placeholder="短语、完整句子或阅读段落"
            />
          </label>
          <label class="field full">
            <span>中文释义 *</span>
            <textarea
              v-model="phraseForm.meaningZh"
              class="textarea"
              :rows="phraseForm.kind === 'passage' ? 6 : 3"
            />
          </label>
          <label class="field">
            <span>标签</span>
            <input v-model="phraseForm.tags" class="input" maxlength="128" placeholder="kaoyan" />
          </label>
          <label class="field">
            <span>状态</span>
            <select v-model.number="phraseForm.status" class="select">
              <option :value="1">启用</option>
              <option :value="0">停用</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="closePhraseModal">取消</button>
          <button class="btn btn-primary" :disabled="phraseSaving" @click="savePhrase">
            {{ phraseSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { request } from '@/api/request'

const tab = ref('words')

const stats = ref({
  totalWords: 0,
  activeWords: 0,
  disabledWords: 0,
  phraseCount: 0,
  phraseKindCount: 0,
  sentenceCount: 0,
  passageCount: 0
})

const list = ref([])
const loading = ref(false)
const keyword = ref('')
const status = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)

const phraseList = ref([])
const phraseLoading = ref(false)
const phraseKeyword = ref('')
const phraseStatus = ref('')
const phraseKind = ref('')
const phrasePage = ref(1)
const phraseTotal = ref(0)

const modal = ref(false)
const editingId = ref(null)
const saving = ref(false)
const form = ref(emptyForm())

const phraseModal = ref(false)
const phraseEditingId = ref(null)
const phraseSaving = ref(false)
const phraseForm = ref(emptyPhraseForm())

const currentPage = computed(() => (tab.value === 'words' ? page.value : phrasePage.value))
const currentTotal = computed(() => (tab.value === 'words' ? total.value : phraseTotal.value))
const totalPages = computed(() => Math.max(1, Math.ceil(currentTotal.value / pageSize)))

function kindLabel(kind) {
  if (kind === 'sentence') return '长句'
  if (kind === 'passage') return '阅读片段'
  return '短语'
}

function emptyForm() {
  return {
    word: '',
    phonetic: '',
    meaningZh: '',
    exampleEn: '',
    exampleZh: '',
    tags: 'kaoyan',
    status: 1
  }
}

function emptyPhraseForm() {
  return {
    kind: 'phrase',
    title: '',
    phraseEn: '',
    meaningZh: '',
    tags: 'kaoyan',
    status: 1
  }
}

async function loadStats() {
  try {
    const data = await request('/admin/vocab/stats')
    stats.value = {
      totalWords: data?.totalWords ?? 0,
      activeWords: data?.activeWords ?? 0,
      disabledWords: data?.disabledWords ?? 0,
      phraseCount: data?.phraseCount ?? 0,
      phraseKindCount: data?.phraseKindCount ?? 0,
      sentenceCount: data?.sentenceCount ?? 0,
      passageCount: data?.passageCount ?? 0
    }
  } catch (e) {
    console.warn(e)
  }
}

async function load() {
  loading.value = true
  try {
    const q = new URLSearchParams({
      page: String(page.value),
      pageSize: String(pageSize),
      keyword: keyword.value,
      status: status.value
    })
    const data = await request(`/admin/vocab/words?${q}`)
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

async function loadPhrases() {
  phraseLoading.value = true
  try {
    const q = new URLSearchParams({
      page: String(phrasePage.value),
      pageSize: String(pageSize),
      keyword: phraseKeyword.value,
      status: phraseStatus.value,
      kind: phraseKind.value
    })
    const data = await request(`/admin/vocab/phrases?${q}`)
    phraseList.value = data?.list || []
    phraseTotal.value = data?.total || 0
  } catch (e) {
    alert(e.message)
  } finally {
    phraseLoading.value = false
  }
}

function switchTab(t) {
  if (tab.value === t) return
  tab.value = t
  if (t === 'words') load()
  else loadPhrases()
}

function onSearch() {
  page.value = 1
  load()
}

function onPhraseSearch() {
  phrasePage.value = 1
  loadPhrases()
}

function goPage(p) {
  if (tab.value === 'words') {
    page.value = p
    load()
  } else {
    phrasePage.value = p
    loadPhrases()
  }
}

function openCreate() {
  editingId.value = null
  form.value = emptyForm()
  modal.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = {
    word: row.word,
    phonetic: row.phonetic || '',
    meaningZh: row.meaningZh,
    exampleEn: row.exampleEn || '',
    exampleZh: row.exampleZh || '',
    tags: row.tags || 'kaoyan',
    status: row.status
  }
  modal.value = true
}

function closeModal() {
  modal.value = false
  editingId.value = null
}

function openPhraseCreate() {
  phraseEditingId.value = null
  phraseForm.value = emptyPhraseForm()
  phraseModal.value = true
}

function openPhraseEdit(row) {
  phraseEditingId.value = row.id
  phraseForm.value = {
    kind: row.kind || 'phrase',
    title: row.title || '',
    phraseEn: row.phraseEn,
    meaningZh: row.meaningZh,
    tags: row.tags || 'kaoyan',
    status: row.status
  }
  phraseModal.value = true
}

function closePhraseModal() {
  phraseModal.value = false
  phraseEditingId.value = null
}

async function save() {
  if (!form.value.word.trim()) {
    alert('请填写英文单词')
    return
  }
  if (!form.value.meaningZh.trim()) {
    alert('请填写中文释义')
    return
  }
  saving.value = true
  try {
    const payload = {
      word: form.value.word.trim(),
      phonetic: form.value.phonetic.trim(),
      meaningZh: form.value.meaningZh.trim(),
      exampleEn: form.value.exampleEn.trim(),
      exampleZh: form.value.exampleZh.trim(),
      tags: form.value.tags.trim() || 'kaoyan',
      status: form.value.status
    }
    if (editingId.value) {
      await request(`/admin/vocab/words/${editingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    } else {
      await request('/admin/vocab/words', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    }
    closeModal()
    await Promise.all([load(), loadStats()])
  } catch (e) {
    alert(e.message)
  } finally {
    saving.value = false
  }
}

async function savePhrase() {
  if (!phraseForm.value.phraseEn.trim()) {
    alert('请填写英文内容')
    return
  }
  if (!phraseForm.value.meaningZh.trim()) {
    alert('请填写中文释义')
    return
  }
  phraseSaving.value = true
  try {
    const payload = {
      kind: phraseForm.value.kind,
      title: phraseForm.value.title.trim(),
      phraseEn: phraseForm.value.phraseEn.trim(),
      meaningZh: phraseForm.value.meaningZh.trim(),
      tags: phraseForm.value.tags.trim() || 'kaoyan',
      status: phraseForm.value.status
    }
    if (phraseEditingId.value) {
      await request(`/admin/vocab/phrases/${phraseEditingId.value}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    } else {
      await request('/admin/vocab/phrases', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    }
    closePhraseModal()
    await Promise.all([loadPhrases(), loadStats()])
  } catch (e) {
    alert(e.message)
  } finally {
    phraseSaving.value = false
  }
}

async function toggleStatus(row) {
  try {
    await request(`/admin/vocab/words/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: row.status === 1 ? 0 : 1 })
    })
    await Promise.all([load(), loadStats()])
  } catch (e) {
    alert(e.message)
  }
}

async function togglePhraseStatus(row) {
  try {
    await request(`/admin/vocab/phrases/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: row.status === 1 ? 0 : 1 })
    })
    await Promise.all([loadPhrases(), loadStats()])
  } catch (e) {
    alert(e.message)
  }
}

async function onRemove(row) {
  if (!confirm(`确定删除单词「${row.word}」？\n${row.meaningZh}`)) return
  try {
    await request(`/admin/vocab/words/${row.id}`, { method: 'DELETE' })
    await Promise.all([load(), loadStats()])
  } catch (e) {
    alert(e.message)
  }
}

async function onPhraseRemove(row) {
  const preview = row.phraseEn.length > 80 ? `${row.phraseEn.slice(0, 80)}…` : row.phraseEn
  if (!confirm(`确定删除该语料？\n${preview}`)) return
  try {
    await request(`/admin/vocab/phrases/${row.id}`, { method: 'DELETE' })
    await Promise.all([loadPhrases(), loadStats()])
  } catch (e) {
    alert(e.message)
  }
}

onMounted(async () => {
  await loadStats()
  await load()
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
  line-height: 1.5;
}

.head code {
  font-size: 12px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 4px 20px rgba(79, 110, 247, 0.06);
}

.stat-card.ok {
  border-left: 4px solid #22c55e;
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
  color: #1f2937;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-btn {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  color: #4b5563;
}

.tab-btn.active {
  background: #4f6ef7;
  border-color: #4f6ef7;
  color: #fff;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.search {
  min-width: 220px;
  flex: 1;
}

.word-cell {
  font-weight: 600;
}

.meaning-cell {
  max-width: 280px;
  line-height: 1.45;
}

.meaning-cell.clip {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.kind-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #eef2ff;
  color: #4338ca;
}

.actions {
  white-space: nowrap;
}

.actions .btn {
  margin-right: 4px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 14px;
  color: #6b7280;
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.modal {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: min(420px, 92vw);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal-wide {
  width: min(640px, 96vw);
}

.modal-tall {
  max-height: 92vh;
}

.modal h3 {
  margin: 0 0 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}

.field.full {
  grid-column: 1 / -1;
}

.field .input,
.field .select,
.field .textarea {
  width: 100%;
}

.textarea {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
</style>
