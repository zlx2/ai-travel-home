<script setup lang="ts">
import { Calendar, EditPen, Location, Money, Promotion, User } from '@element-plus/icons-vue'
import type { Requirement } from '../../types'

defineProps<{ requirement:Requirement; routeMode:string; hasRental:boolean }>()
const emit=defineEmits<{ edit:[]; continue:[] }>()
</script>

<template>
  <section class="summary-bar builder-card">
    <div class="summary-state"><span></span><b>已理解需求</b></div>
    <div class="summary-item"><el-icon><Location/></el-icon><small>目的地</small><b>{{ requirement.destination || '待确认' }}</b></div>
    <div class="summary-item"><el-icon><Calendar/></el-icon><small>天数</small><b>{{ requirement.days }} 天</b></div>
    <div class="summary-item"><el-icon><User/></el-icon><small>出行人数</small><b>{{ requirement.peopleCount }} 人</b></div>
    <div class="summary-item wide"><el-icon><Promotion/></el-icon><small>偏好</small><b>{{ requirement.preferences.join(' · ') || '轻松探索' }}</b></div>
    <div class="summary-item"><el-icon><Money/></el-icon><small>预算</small><b>≤ ¥{{ requirement.budget }}</b></div>
    <div v-if="hasRental" class="mode-chip">{{ routeMode }}</div>
    <div class="summary-actions">
      <el-button text @click="emit('edit')"><el-icon><EditPen/></el-icon>调整需求</el-button>
      <el-button class="builder-primary" type="primary" @click="emit('continue')">继续生成</el-button>
    </div>
  </section>
</template>

<style scoped>
.summary-bar{display:flex;align-items:center;gap:0;padding:0 14px;min-height:78px;overflow:hidden}.summary-state{height:78px;display:flex;align-items:center;gap:9px;padding:0 20px 0 8px;color:#059669;font-weight:700;white-space:nowrap}.summary-state span{width:18px;height:18px;border-radius:50%;background:#d9f7ea;box-shadow:inset 0 0 0 5px #10b981}.summary-item{min-width:130px;padding:0 22px;border-left:1px solid var(--line);display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:center}.summary-item .el-icon{grid-row:span 2;color:#8a6a35}.summary-item small{color:#8290a3;font-size:12px}.summary-item b{font-size:14px;color:#1c2738}.summary-item.wide{min-width:250px}.mode-chip{margin-left:12px;border:1px solid #bfdbfe;border-radius:999px;padding:7px 11px;background:#eff6ff;color:#2563eb;font-size:12px;font-weight:700;white-space:nowrap}.summary-actions{margin-left:auto;display:flex;align-items:center;gap:8px;white-space:nowrap}.builder-primary{background:#2563eb!important;border-color:#2563eb!important;border-radius:10px!important}@media(max-width:1100px){.summary-bar{flex-wrap:wrap;padding:12px}.summary-state{height:auto}.summary-item{border-left:0;padding:8px 12px}.summary-actions{width:100%;justify-content:flex-end}}
</style>
