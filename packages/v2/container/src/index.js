import Vue from 'vue'
import VueRouter from 'vue-router'
import { Button } from 'element-ui'
import 'element-ui/lib/theme-chalk/button.css'

import routes from 'routes/v2'

import app from './app.vue'

const router = new VueRouter(
  {
    mode: 'history',
    routes
  }
)

Vue.use(VueRouter)
Vue.use(Button)

const vm = new Vue(
  {
    router,
    render: (h) => h(app)
  }
)

export default {
  mount () {
    vm.$mount('#app')
  },
  ummount () {
    vm.$destroy()
  }
}
