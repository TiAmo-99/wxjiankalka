import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '@/api/request'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    children: [
      { path: '', redirect: '/users' },
      { path: 'users', name: 'users', component: () => import('@/views/Users.vue') },
      { path: 'import', name: 'import', component: () => import('@/views/TaskImport.vue') },
      { path: 'reports', name: 'reports', component: () => import('@/views/Reports.vue') },
      {
        path: 'encouragements',
        name: 'encouragements',
        component: () => import('@/views/Encouragements.vue')
      },
      {
        path: 'vocabulary',
        name: 'vocabulary',
        component: () => import('@/views/Vocabulary.vue')
      },
      {
        path: 'memos',
        name: 'memos',
        component: () => import('@/views/Memos.vue')
      },
      {
        path: 'permission-requests',
        name: 'permission-requests',
        component: () => import('@/views/PermissionRequests.vue')
      },
      { path: 'users/:id/plans', name: 'user-plans', component: () => import('@/views/UserPlans.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  if (!to.meta.public && !getToken()) {
    return { name: 'login' }
  }
})

export default router
