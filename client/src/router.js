import { createRouter, createWebHistory } from 'vue-router'
import TodayView from './views/TodayView.vue'

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
    { path: '/design-system', name: 'design-system', component: () => import('./views/DesignSystemView.vue'), meta: { title: 'Design system' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Cyber Gym` : 'Cyber Gym'
})
