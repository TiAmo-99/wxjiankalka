import { ref, computed } from 'vue'
import { request, setToken as saveToken, clearToken as removeToken, getToken } from '@/utils/request.js'

/** 驱动各页 computed 在登录态变化后刷新 */
const authTick = ref(0)

function bumpAuth() {
  authTick.value++
}

if (typeof uni !== 'undefined' && uni.$on) {
  uni.$on('auth-token-change', bumpAuth)
}

export function setToken(token) {
  if (!token) return
  saveToken(token)
  bumpAuth()
}

export function clearToken() {
  removeToken()
  bumpAuth()
}

export function isLoggedIn() {
  return !!getToken()
}

/** 响应式登录态（用于 template / computed） */
export function useLoggedIn() {
  return computed(() => {
    authTick.value
    return !!getToken()
  })
}

async function getWxCode() {
  const loginRes = await new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject
    })
  })
  const code = loginRes?.code
  if (!code) {
    const err = new Error('微信登录失败，请重试')
    err.code = 10002
    throw err
  }
  return code
}

function applyAuthResult(data, actionLabel) {
  if (!data?.token) {
    const err = new Error(`${actionLabel}失败：未返回登录凭证`)
    err.code = 50000
    throw err
  }
  setToken(data.token)
  return data
}

/**
 * 微信登录（已注册用户）
 */
export async function wxLogin() {
  const code = await getWxCode()
  const data = await request({
    url: '/auth/wx-login',
    method: 'POST',
    data: { code },
    showError: false
  })
  return applyAuthResult(data, '登录')
}

/**
 * 微信注册（新用户）
 */
export async function wxRegister(form) {
  const code = await getWxCode()
  const data = await request({
    url: '/auth/wx-register',
    method: 'POST',
    data: {
      code,
      nickname: form.nickname,
      phone: form.phone,
      realName: form.realName || '',
      avatarUrl: form.avatarUrl || ''
    },
    showError: false
  })
  return applyAuthResult(data, '注册')
}

/**
 * 手机号 + 密码登录（App 等）
 */
export async function phoneLogin(form) {
  const data = await request({
    url: '/auth/phone-login',
    method: 'POST',
    data: {
      phone: String(form.phone || '').trim(),
      password: form.password
    },
    showError: false
  })
  return applyAuthResult(data, '登录')
}

/**
 * 手机号 + 密码注册（App 等）
 */
export async function phoneRegister(form) {
  const data = await request({
    url: '/auth/phone-register',
    method: 'POST',
    data: {
      nickname: form.nickname,
      phone: String(form.phone || '').trim(),
      password: form.password,
      realName: form.realName || ''
    },
    showError: false
  })
  return applyAuthResult(data, '注册')
}

/** 微信小程序账号首次在 App 设置密码 */
export async function setInitialPassword(form) {
  const data = await request({
    url: '/auth/set-initial-password',
    method: 'POST',
    data: {
      phone: String(form.phone || '').trim(),
      nickname: String(form.nickname || '').trim(),
      password: form.password
    },
    showError: false
  })
  return applyAuthResult(data, '设置密码')
}

/** 已登录用户修改密码 */
export async function changePassword(form) {
  return request({
    url: '/auth/password',
    method: 'PATCH',
    data: {
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    },
    showError: false
  })
}

export async function updateProfile(form) {
  return request({
    url: '/auth/me',
    method: 'PATCH',
    data: form
  })
}

export function logout() {
  clearToken()
}
