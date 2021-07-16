import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import App from '@container/app.vue'

const app = createApp(App)

const routes = [
  {
    path: '/supplier/xx',
    component: () => import('@vue-mfe/supplier/src/pages/xx/index.vue')
  },
  {
    path: '/supplier/xx/detail',
    component: () => import('@vue-mfe/supplier/src/pages/xx/detail.vue')
  }
]

const router = createRouter(
  {
    history: createWebHistory(),
    routes
  }
)

app.use(router)

app.mount('#app')

export default app
