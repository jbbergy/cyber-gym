import { createRouter, createWebHistory } from 'vue-router'
import TodayView from './views/TodayView.vue'
import { auth, checkSession, setExpiredHandler } from './lib/auth'

// Écrans accessibles sans compte ; guest = réservé aux visiteurs non connectés
const open = (title, guest = true) => ({ title, nav: false, public: true, guest })

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView, meta: { title: "Aujourd'hui" } },
    { path: '/seance/:id', name: 'session', component: () => import('./views/SessionView.vue'), meta: { title: 'Séance en cours', nav: false } },
    { path: '/programmes', name: 'programs', component: () => import('./views/ProgramsView.vue'), meta: { title: 'Programmes' } },
    { path: '/programmes/nouveau', name: 'program-new', component: () => import('./views/ProgramEditView.vue'), meta: { title: 'Nouveau preset', nav: false } },
    { path: '/programmes/:id', name: 'program-edit', component: () => import('./views/ProgramEditView.vue'), meta: { title: 'Modifier le preset', nav: false } },
    { path: '/exercices', name: 'exercises', component: () => import('./views/ExercisesView.vue'), meta: { title: 'Exercices' } },
    { path: '/historique', name: 'history', component: () => import('./views/HistoryView.vue'), meta: { title: 'Historique' } },
    { path: '/historique/:id', name: 'history-detail', component: () => import('./views/HistoryDetailView.vue'), meta: { title: 'Détail de séance' } },
    { path: '/progression', name: 'progress', component: () => import('./views/ProgressView.vue'), meta: { title: 'Progression' } },
    { path: '/profil', name: 'profile', component: () => import('./views/ProfileView.vue'), meta: { title: 'Mon profil' } },
    { path: '/connexion', name: 'login', component: () => import('./views/LoginView.vue'), meta: open('Connexion') },
    { path: '/inscription', name: 'register', component: () => import('./views/RegisterView.vue'), meta: open('Créer un compte') },
    { path: '/mot-de-passe-oublie', name: 'forgot', component: () => import('./views/ForgotPasswordView.vue'), meta: open('Mot de passe oublié') },
    { path: '/mot-de-passe/nouveau', name: 'reset', component: () => import('./views/ResetPasswordView.vue'), meta: open('Nouveau mot de passe', false) },
    { path: '/design-system', name: 'design-system', component: () => import('./views/DesignSystemView.vue'), meta: { title: 'Design system' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  // Le défilement se fait dans #app-scroll (pas dans la fenêtre) : on gère sa position nous-mêmes
  scrollBehavior: (to, _from, saved) => {
    const el = document.getElementById('app-scroll')
    if (el) {
      const top = saved ? (positions.get(to.fullPath) ?? 0) : 0
      el.scrollTop = top
      // contenu chargé de façon asynchrone : seconde tentative une fois les données arrivées
      if (top) setTimeout(() => (el.scrollTop = top), 350)
    }
    return false
  },
})

const positions = new Map()
router.beforeEach((_to, from) => {
  const el = document.getElementById('app-scroll')
  if (el) positions.set(from.fullPath, el.scrollTop)
})

router.beforeEach(async (to) => {
  // utilisateur connu (éventuellement hors ligne) : on vérifie en arrière-plan sans bloquer l'affichage
  if (!auth.checked) {
    if (auth.user) checkSession()
    else await checkSession()
  }
  if (to.meta.public) return to.meta.guest && auth.user ? safeRedirect(to.query.redirect) : true
  if (!auth.user) return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
})

/** Retour après connexion : uniquement un chemin interne */
export function safeRedirect(target) {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

setExpiredHandler(() => {
  const current = router.currentRoute.value
  if (!current.meta.public) router.replace({ name: 'login', query: { redirect: current.fullPath } })
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Cyber Gym` : 'Cyber Gym'
})
