<script setup lang="ts">
import { Check, Lock, MagicStick } from '@element-plus/icons-vue'
import type { BuilderDay } from './types'

defineProps<{ days:BuilderDay[]; currentDay:number }>()
</script>

<template>
  <aside class="progress-rail builder-card">
    <h3>行程进度</h3>
    <div class="rail-list">
      <div v-for="day in days" :key="day.day" class="rail-item" :class="day.status">
        <div class="rail-dot">
          <el-icon v-if="day.status==='locked'"><Check/></el-icon>
          <el-icon v-else-if="day.status==='pending'"><Lock/></el-icon>
          <span v-else>{{ String(day.day).padStart(2,'0') }}</span>
        </div>
        <div class="rail-card">
          <div><b>Day {{ String(day.day).padStart(2,'0') }}</b><em>{{ day.status==='locked'?'已锁定':day.status==='active'?'当前确认中':day.status==='generating'?'生成中':'未生成' }}</em></div>
          <p>{{ day.title }}</p>
        </div>
      </div>
    </div>
    <div class="ai-note">
      <el-icon><MagicStick/></el-icon>
      <b>行程由 AI 生成</b>
      <p>结合景点、美食、出行和预算为你定制，可随时调整与锁定每一天。</p>
    </div>
  </aside>
</template>

<style scoped>
.progress-rail{padding:22px;position:sticky;top:92px;align-self:start}.progress-rail h3{margin:0 0 18px;color:#111827;font-size:18px}.rail-list{position:relative;display:grid;gap:18px}.rail-list:before{content:"";position:absolute;left:17px;top:18px;bottom:18px;border-left:1px solid #d7dee8}.rail-item{display:grid;grid-template-columns:36px 1fr;gap:14px;position:relative}.rail-dot{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#eef2f7;border:1px solid #d6dde7;color:#6b7280;font-weight:800;z-index:1}.rail-item.locked .rail-dot{background:#10b981;color:#fff;border-color:#10b981;box-shadow:0 9px 18px rgba(16,185,129,.22)}.rail-item.active .rail-dot{background:#b98a44;color:#fff;border-color:#b98a44}.rail-card{padding:13px 14px;border-radius:16px;border:1px solid transparent}.rail-item.active .rail-card{border-color:#ead9bd;background:#fffaf2;box-shadow:0 12px 30px rgba(132,89,28,.08)}.rail-card div{display:flex;align-items:center;justify-content:space-between;gap:8px}.rail-card b{color:#1c2738}.rail-card em{font-style:normal;color:#059669;font-size:12px}.rail-item.active em{color:#d97706}.rail-item.pending em{color:#98a2b3}.rail-card p{margin:8px 0 0;color:#64748b;font-size:13px;line-height:1.5}.ai-note{margin-top:28px;border:1px solid #eadfce;border-radius:16px;background:#fffaf3;padding:16px;color:#6d5c46}.ai-note .el-icon{color:#d97706;font-size:20px}.ai-note b{display:block;margin:8px 0 5px;color:#3d3428}.ai-note p{margin:0;font-size:13px;line-height:1.7}@media(max-width:1050px){.progress-rail{position:static}.rail-list{grid-template-columns:repeat(2,1fr)}.rail-list:before{display:none}}@media(max-width:720px){.rail-list{grid-template-columns:1fr}}
</style>
