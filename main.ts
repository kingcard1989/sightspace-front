import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  app.use(Pinia.createPinia())

  // HBuilderX / uni-app 需要在返回值中暴露 Pinia
  return {
    app,
    Pinia,
  }
}
