import { todayStr } from '@/utils/plan-store.js'

/** 跳转新增学习任务页（仅今天及以后） */
export function goAddTaskPage(dateStr) {
  const today = todayStr()
  const d = dateStr && dateStr >= today ? dateStr : today
  if (dateStr && dateStr < today) {
    uni.showToast({ title: '只能为今天及以后添加任务', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/plan-add/plan-add?date=${d}` })
}

export function goAddTaskWithAuth(loggedIn, dateStr) {
  if (!loggedIn) {
    uni.showToast({ title: '请先在「我的」登录或注册', icon: 'none' })
    return
  }
  goAddTaskPage(dateStr)
}
