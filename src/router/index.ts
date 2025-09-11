import { createRouter, createWebHistory } from 'vue-router';

const ExperimentStart = () => import('../views/ExperimentStart.vue');
const Flow = () => import('../views/Flow.vue');
const Results = () => import('../views/Results.vue');
const Logs = () => import('../views/Logs.vue');

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ExperimentStart },
    { path: '/flow', name: 'flow', component: Flow }, // 添加了 name 属性
    { path: '/results', component: Results },
    { path: '/logs', component: Logs },  
  ],
});
