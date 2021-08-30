import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import moment from 'moment'
import 'moment/dist/locale/zh-cn'

import routes from '@mf/routes/v3'

import App from '@v3-container/app.vue'

const app = createApp(App)

const router = createRouter(
  {
    history: createWebHistory(),
    routes
  }
)

app.use(router)

app.mount('#app')
app.config.globalProperties.moment = moment

export default app
