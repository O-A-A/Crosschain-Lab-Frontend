import { createRouter, createWebHistory } from 'vue-router';

const ExperimentStart = () => import('../views/ExperimentStart.vue');
const Flow = () => import('../views/Flow.vue');
const Results = () => import('../views/Results.vue');
const Logs = () => import('../views/Logs.vue');



export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ExperimentStart },
    { path: '/flow', component: Flow },
    { path: '/results', component: Results },
    { path: '/logs', component: Logs },  
    
  ],
});
