/**
 * 全站路径配置
 */
window.SITE = {
  home: './index.html',
  manage: {
    login: './manage/login.html',
    users: './manage/users.html'
  },
  nav: [
    { label: '积成电子官网', href: 'https://www.ieslab.com.cn/', external: true },
    { label: '积成智通官网', href: 'https://www.iesztn.com/', external: true },
    { label: 'Steve OCPP 测试平台', href: 'https://steve.jiankalka.cn/', external: true },
    { label: '微信小程序管理后台', href: './manage/login.html' }
  ],
  tools: [
    { label: '二维码生成', href: './tools/qrcode.html' },
    { label: 'JSON 数据处理', href: './tools/json.html' },
    { label: '数据转换及长度计算', href: './tools/convert.html' }
  ],
  api: {
    admin: 'https://server.jiankalka.cn/api/v1'
  }
}
