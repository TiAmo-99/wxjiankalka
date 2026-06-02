/** 运维调试工具所需最低权限：大于 2 即 >= 3 */
export const TOOLBOX_MIN_LEVEL = 3

/** 二维码工具：权限等级大于 0 */
export const QRCODE_MIN_LEVEL = 1

/** 最终管理员权限（可在小程序审核他人申请） */
export const FINAL_ADMIN_LEVEL = 10

/** 审核通过时可赋予的最高等级 */
export const GRANT_MAX_LEVEL = 9

export const PERM_OPTIONS = [
  { level: 1, label: '等级 1 · 基础扩展' },
  { level: 2, label: '等级 2 · 进阶功能' },
  { level: 3, label: '等级 3 · 工具箱权限' },
  { level: 4, label: '等级 4 · 运维调试' },
  { level: 5, label: '等级 5 · 高级运维' }
]

export function isFinalAdmin(permLevel) {
  return Number(permLevel) >= FINAL_ADMIN_LEVEL
}

export function canUseToolbox(permLevel) {
  return Number(permLevel) > 2
}

export function canUseQrcode(permLevel) {
  return Number(permLevel) > 0
}

export function permLabel(level) {
  const n = Number(level) || 0
  if (n === 0) return '普通学员'
  if (isFinalAdmin(n)) return 'L10 最终管理员'
  if (n >= 3) return `权限 L${n} · 工具箱可用`
  return `权限 L${n}`
}

export function requireToolbox(permLevel) {
  if (!canUseToolbox(permLevel)) {
    uni.showModal({
      title: '权限不足',
      content: '该功能需要权限等级大于 2，请先在「我的」中提交权限申请。',
      showCancel: false
    })
    return false
  }
  return true
}

export function requireQrcode(permLevel) {
  if (!canUseQrcode(permLevel)) {
    uni.showModal({
      title: '权限不足',
      content: '二维码功能需要权限等级大于 0，请先在「我的」中提交权限申请。',
      showCancel: false
    })
    return false
  }
  return true
}
