import { createApp } from 'vue'
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-700-italic.css'
import '@fontsource/barlow-condensed/latin-800-italic.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'
import { router } from './router'
import { flushOutbox } from './lib/api'

createApp(App).use(router).mount('#app')
flushOutbox()
