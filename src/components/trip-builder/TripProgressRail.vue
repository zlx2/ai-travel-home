<script setup lang="ts">
import { Check, Lock } from '@element-plus/icons-vue'
import type { BuilderDay } from './types'

defineProps<{ days:BuilderDay[]; currentDay:number }>()
</script>

<template>
  <aside class="progress-rail">
    <div class="rail-list">
      <div v-for="day in days" :key="day.day" class="rail-item" :class="day.status">
        <div class="rail-dot">
          <el-icon v-if="day.status==='locked'"><Check/></el-icon>
          <el-icon v-else-if="day.status==='pending'"><Lock/></el-icon>
          <span v-else>{{ String(day.day).padStart(2,'0') }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.progress-rail{position:sticky;top:92px;align-self:start;display:flex;justify-content:center;padding-top:12px}.rail-list{position:relative;display:grid;justify-items:center;gap:48px;padding:8px 0}.rail-list:before{content:"";position:absolute;left:50%;top:28px;bottom:28px;border-left:1px solid #dce4ed;transform:translateX(-50%)}.rail-item{position:relative;z-index:1}.rail-dot{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#eef3f8;border:1px solid #d8e0ea;color:#667085;font-weight:900;box-shadow:0 8px 18px rgba(15,23,42,.06)}.rail-item.locked .rail-dot{background:#0f9f8f;color:#fff;border-color:#0f9f8f}.rail-item.active .rail-dot,.rail-item.generating .rail-dot{background:linear-gradient(145deg,#0f8f81,#12b38e);color:#fff;border-color:#0f9f8f;box-shadow:0 12px 24px rgba(15,159,143,.22)}@media(max-width:1180px){.progress-rail{position:static}.rail-list{grid-template-columns:repeat(4,42px);gap:14px}.rail-list:before{display:none}}
</style>
