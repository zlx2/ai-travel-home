<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown, Calendar, EditPen, HomeFilled, MapLocation, User } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
const route=useRoute(),router=useRouter(),store=useUserStore()
const go=(path:string)=>router.push(path)
const logout=async()=>{await store.logout();router.push('/')}
</script>
<template>
  <div class="app-shell">
    <header class="front-header">
      <div class="container nav-inner">
        <router-link class="logo" to="/"><span class="logo-symbol">✈</span><span>PlanGo</span></router-link>
        <nav class="main-nav">
          <router-link to="/">首页</router-link><router-link to="/ai-trip">AI 行程规划</router-link><router-link to="/trips">我的行程</router-link><router-link to="/car-rental">租车出行</router-link><router-link to="/notes">游记社区</router-link><router-link to="/map-playground">地图测试</router-link>
        </nav>
        <div class="nav-actions" v-if="!store.isLogin"><el-button text @click="go('/login')">登录</el-button><el-button type="primary" round @click="go('/register')">免费注册</el-button></div>
        <el-dropdown v-else trigger="click">
          <button class="user-trigger"><el-avatar :size="34" :src="store.user?.avatarUrl"><User /></el-avatar><span>{{store.user?.nickname}}</span><el-icon><ArrowDown/></el-icon></button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item :icon="User" @click="go('/profile')">个人中心</el-dropdown-item><el-dropdown-item :icon="Calendar" @click="go('/trips')">我的行程</el-dropdown-item><el-dropdown-item :icon="EditPen" @click="go('/notes/create')">发布游记</el-dropdown-item><el-dropdown-item divided @click="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </div>
    </header>
    <main><router-view /></main>
    <footer class="front-footer" :class="{compact:route.name==='home'}" v-if="route.name!=='ai-trip'">
      <div class="container footer-grid"><div><div class="logo"><span class="logo-symbol">✈</span><span>PlanGo</span></div><p>一句话，开启一段更懂你的旅程。</p></div><div><b>产品</b><router-link to="/ai-trip">AI 行程规划</router-link><router-link to="/trips">我的行程</router-link><router-link to="/car-rental">租车出行</router-link></div><div><b>发现</b><router-link to="/notes">游记社区</router-link><router-link to="/">热门目的地</router-link></div><div class="footer-slogan"><el-icon><MapLocation/></el-icon><span>探索世界，也发现自己</span></div></div>
      <div class="copyright">© 2026 PlanGo · 课程项目演示</div>
    </footer>
  </div>
</template>
