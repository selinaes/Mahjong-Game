import Vue from 'vue'
import VueRouter from 'vue-router'
import App from '@/App.vue'
import Game from '@/views/Game.vue'
import Config from '@/views/Config.vue'

import { BootstrapVue, BootstrapVueIcons } from "bootstrap-vue"

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)
Vue.use(VueRouter)

const router = new VueRouter({
  mode: "history",
  routes: [
    {
      path: "/config",
      component: Config
    },
    {
      path: "/:playerIndex",
      component: Game,
      props (route) {
        return {
          playerIndex: route.params.playerIndex
        }
      }
    }
    
  ],
})

Vue.config.productionTip = false
Vue.config.devtools = true

/* eslint-disable no-new */
new Vue({
  router,
  el: '#app',
  render: h => h(App),
})
