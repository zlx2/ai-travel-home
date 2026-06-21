import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import VueMarkdownEditor from '@kangc/v-md-editor'
import '@kangc/v-md-editor/lib/style/base-editor.css'
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js'
import '@kangc/v-md-editor/lib/theme/style/github.css'
import App from './App.vue'
import router from './router'
import './style.css'

VueMarkdownEditor.use(githubTheme)
createApp(App).use(createPinia()).use(router).use(ElementPlus).use(VueMarkdownEditor).mount('#app')
