<script setup lang="ts">
import { useRouter } from 'vue-router'
const router=useRouter()
</script>

<template>
  <div class="page trip-detail-placeholder">
    <div class="container">
      <section class="placeholder-card card">
        <span class="eyebrow">COMING SOON</span>
        <h1>行程详情页待完成</h1>
        <p>当前阶段已支持保存行程、我的行程列表、搜索和删除。详情页还在完善中，暂不开放。</p>
        <el-button type="primary" @click="router.push('/trips')">返回我的行程</el-button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.trip-detail-placeholder{display:grid;align-items:center;min-height:calc(100vh - 180px)}
.placeholder-card{max-width:640px;margin:0 auto;padding:42px;text-align:center}
.placeholder-card h1{margin:10px 0 12px;color:#172033;font-size:30px}
.placeholder-card p{margin:0 auto 24px;max-width:460px;color:#64748b;line-height:1.8}
</style>
