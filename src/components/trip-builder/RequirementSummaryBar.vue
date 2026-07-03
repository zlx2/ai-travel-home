<script setup lang="ts">
import { ArrowRight, Calendar, EditPen, Location, Money, Promotion, User } from '@element-plus/icons-vue'
import type { Requirement } from '../../types'

defineProps<{ requirement: Requirement; routeMode: string; hasRental: boolean }>()
const emit = defineEmits<{ edit: []; continue: [] }>()
const budgetText = (budget?: number | string) => budget ? `¥${budget} 内` : '待确认'
</script>

<template>
  <section class="summary-bar">
    <div class="summary-body">
      <article>
        <el-icon><Location /></el-icon>
        <span>目的地</span>
        <b>{{ requirement.destination || '待确认' }}</b>
      </article>
      <article>
        <el-icon><Calendar /></el-icon>
        <span>行程天数</span>
        <b>{{ requirement.days }} 天</b>
      </article>
      <article>
        <el-icon><User /></el-icon>
        <span>出行人数</span>
        <b>{{ requirement.peopleCount }} 人</b>
      </article>
      <article class="wide">
        <el-icon><Promotion /></el-icon>
        <span>出行偏好</span>
        <b>{{ requirement.preferences.join(' · ') || '轻松探索' }}</b>
      </article>
      <article>
        <el-icon><Money /></el-icon>
        <span>预算范围</span>
        <b>{{ budgetText(requirement.budget) }}</b>
      </article>
    </div>

    <div class="summary-actions">
      <button class="action-edit" type="button" @click="emit('edit')">
        <el-icon><EditPen /></el-icon>调整需求
      </button>
      <button class="action-primary" type="button" @click="emit('continue')">
        继续生成行程 <el-icon><ArrowRight /></el-icon>
      </button>
    </div>
  </section>
</template>

<style scoped>
.summary-bar {
  min-height: 96px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 362px;
  gap: 20px;
  align-items: center;
  padding: 0 22px 0 24px;
  border: 1px solid #e2ebf7;
  border-radius: 13px;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 16px 38px rgba(30, 69, 118, .11);
}

.summary-body {
  min-width: 0;
  display: grid;
  grid-template-columns: 140px 140px 140px minmax(260px, 1fr) 176px;
  align-items: center;
}

.summary-body article {
  min-width: 0;
  min-height: 56px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  grid-template-rows: 22px 28px;
  gap: 0 10px;
  align-items: center;
  padding: 0 22px;
  border-right: 1px solid #e2eaf5;
}

.summary-body article:first-child {
  padding-left: 0;
}

.summary-body article:last-child {
  border-right: 0;
}

.summary-body .el-icon {
  grid-row: 1 / span 2;
  color: #4c8cff;
  font-size: 22px;
}

.summary-body article:nth-child(4) .el-icon,
.summary-body article:nth-child(5) .el-icon {
  color: #1ba792;
}

.summary-body span {
  color: #6b7b92;
  font-size: 13px;
}

.summary-body b {
  min-width: 0;
  overflow: hidden;
  color: #10213b;
  font-size: 16px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-body article:last-child b {
  overflow: visible;
  text-overflow: clip;
}

.summary-actions {
  display: grid;
  grid-template-columns: 140px 190px;
  gap: 14px;
}

.summary-actions button {
  height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 9px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 900;
}

.action-edit {
  border: 1px solid #d5e0ee;
  background: #fff;
  color: #596a82;
}

.action-primary {
  border: 0;
  background: linear-gradient(135deg, #2f75ff, #176dff);
  color: #fff;
  box-shadow: 0 12px 24px rgba(47, 117, 255, .22);
}

@media (max-width: 1180px) {
  .summary-bar,
  .summary-body,
  .summary-actions {
    grid-template-columns: 1fr;
  }

  .summary-body article {
    padding: 12px 0;
    border-right: 0;
    border-bottom: 1px solid #e2eaf5;
  }

  .summary-actions {
    grid-template-columns: 1fr 1fr;
    padding-bottom: 16px;
  }
}
</style>
