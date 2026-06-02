import App from './App'
import { createSSRApp } from 'vue'
import { applyThemeForCurrentPage } from '@/utils/theme.js'

export function createApp() {
  const app = createSSRApp(App)
  app.mixin({
    onLoad() {
      applyThemeForCurrentPage()
    },
    onShow() {
      applyThemeForCurrentPage()
    }
  })
  return {
    app
  }
}
