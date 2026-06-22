import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { TOKEN_KEY } from '../utils/auth'

const routes=[
  {path:'/login',component:()=>import('../views/front/Login.vue'),meta:{guest:true}},
  {path:'/register',component:()=>import('../views/front/Register.vue'),meta:{guest:true}},
  {path:'/',component:()=>import('../layouts/FrontLayout.vue'),children:[
    {path:'',name:'home',component:()=>import('../views/front/Home.vue')},
    {path:'ai-trip',name:'ai-trip',component:()=>import('../views/front/AiTrip.vue'),meta:{auth:true}},
    {path:'trips',name:'trips',component:()=>import('../views/front/TripList.vue'),meta:{auth:true}},
    {path:'trips/:id',name:'trip-detail',component:()=>import('../views/front/TripDetail.vue'),meta:{auth:true}},
    {path:'notes',name:'notes',component:()=>import('../views/front/NoteList.vue')},
    {path:'notes/create',name:'note-create',component:()=>import('../views/front/NoteEditor.vue'),meta:{auth:true}},
    {path:'notes/edit/:id',name:'note-edit',component:()=>import('../views/front/NoteEditor.vue'),meta:{auth:true}},
    {path:'notes/:id',name:'note-detail',component:()=>import('../views/front/NoteDetail.vue')},
    {path:'car-rental',name:'car-rental',component:()=>import('../views/front/CarRental.vue')},
    {path:'profile',name:'profile',component:()=>import('../views/front/Profile.vue'),meta:{auth:true}},
  ]},
  {path:'/:pathMatch(.*)*',redirect:'/'}
]
const router=createRouter({history:createWebHistory(),routes,scrollBehavior:()=>({top:0})})
router.beforeEach(to=>{const token=localStorage.getItem(TOKEN_KEY);if(to.meta.auth&&!token){ElMessage.info('请先登录');return{path:'/login',query:{redirect:to.fullPath}}}return true})
export default router
