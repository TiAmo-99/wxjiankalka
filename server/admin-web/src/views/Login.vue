<template>
  <div class="login-page">
    <div class="card">
      <h1>考研学习记录</h1>
      <p class="sub">管理后台</p>
      <form @submit.prevent="onSubmit">
        <label>账号</label>
        <input v-model="username" class="input full" placeholder="管理员账号" />
        <label>密码</label>
        <input v-model="password" class="input full" type="password" placeholder="密码" />
        <button class="btn btn-primary full" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, setToken } from '@/api/request'

const router = useRouter()
const username = ref('admin')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    const data = await login(username.value.trim(), password.value)
    if (!data?.token) throw new Error('未返回登录凭证')
    setToken(data.token)
    router.push('/users')
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4f6ef7, #6b4ce6);
}

.card {
  width: 380px;
  background: #fff;
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

h1 {
  margin: 0;
  font-size: 22px;
}

.sub {
  margin: 8px 0 24px;
  color: #6b7280;
  font-size: 14px;
}

label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: #374151;
}

.input.full {
  width: 100%;
  margin-bottom: 16px;
}

.btn.full {
  width: 100%;
  height: 40px;
  margin-top: 8px;
}

.error {
  margin-top: 12px;
  color: #dc2626;
  font-size: 13px;
}
</style>
