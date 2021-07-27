import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import routes from 'routes'

import App from '@container/app.vue'

const app = createApp(App)

const router = createRouter(
  {
    history: createWebHistory(),
    routes
  }
)

app.use(router)

app.mount('#app')

export default app
