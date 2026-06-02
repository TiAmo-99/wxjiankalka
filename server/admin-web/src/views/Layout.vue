<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">考研学习记录</div>
      <nav>
        <router-link to="/users" class="nav-item" active-class="active">学员管理</router-link>
        <router-link to="/import" class="nav-item" active-class="active">批量导入</router-link>
        <router-link to="/reports" class="nav-item" active-class="active">学习上报</router-link>
        <router-link to="/encouragements" class="nav-item" active-class="active">鼓励话语</router-link>
        <router-link to="/vocabulary" class="nav-item" active-class="active">英语词库</router-link>
        <router-link to="/memos" class="nav-item" active-class="active">学员备忘录</router-link>
        <router-link to="/permission-requests" class="nav-item" active-class="active">权限申请</router-link>
      </nav>
      <button class="logout" @click="logout">退出登录</button>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { clearToken } from '@/api/request'
import { useRouter } from 'vue-router'

const router = useRouter()

function logout() {
  clearToken()
  router.push('/login')
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: #1e293b;
  color: #e2e8f0;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}

.brand {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 28px;
  color: #fff;
}

.nav-item {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  color: #cbd5e1;
  margin-bottom: 4px;
}

.nav-item.active,
.nav-item:hover {
  background: rgba(79, 110, 247, 0.25);
  color: #fff;
}

.logout {
  margin-top: auto;
  background: transparent;
  border: 1px solid #475569;
  color: #cbd5e1;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.main {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
</style>
