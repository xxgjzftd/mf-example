import Vue from 'vue'
import VueRouter from 'vue-router'
import { Button } from 'element-ui'
import 'element-ui/lib/theme-chalk/button.css'

import routes from '@mf/routes/v2'

import app from './app.vue'

const router = new VueRouter(
  {
    routes
  }
)

Vue.use(Button)

new Vue(
  {
    el: '#app',
    router,
    render: (h) => h(app)
  }
)
