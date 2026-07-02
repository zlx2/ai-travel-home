<script setup lang="ts">
import { Calendar, EditPen, Location, Money, Promotion, User } from '@element-plus/icons-vue'
import type { Requirement } from '../../types'

defineProps<{ requirement:Requirement; routeMode:string; hasRental:boolean }>()
const emit=defineEmits<{ edit:[]; continue:[] }>()
</script>

<template>
  <section class="summary-bar">
    <div class="summary-state">
      <span class="status-dot"></span>
      <span>已理解需求</span>
    </div>

    <div class="summary-body">
      <div class="info-chip">
        <el-icon><Location/></el-icon>
        <span>{{ requirement.destination || '待确认' }}</span>
      </div>
      <span class="chip-sep"></span>
      <div class="info-chip">
        <el-icon><Calendar/></el-icon>
        <span>{{ requirement.days }} 天</span>
      </div>
      <span class="chip-sep"></span>
      <div class="info-chip">
        <el-icon><User/></el-icon>
        <span>{{ requirement.peopleCount }} 人</span>
      </div>
      <span class="chip-sep"></span>
      <div class="info-chip wide">
        <el-icon><Promotion/></el-icon>
        <span>{{ requirement.preferences.join(' · ') || '轻松探索' }}</span>
      </div>
      <span class="chip-sep"></span>
      <div class="info-chip">
        <el-icon><Money/></el-icon>
        <span>≤ ¥{{ requirement.budget }}</span>
      </div>
    </div>

    <div v-if="hasRental" class="route-chip">{{ routeMode }}</div>

    <div class="summary-actions">
      <el-button class="action-edit" text @click="emit('edit')">
        <el-icon><EditPen/></el-icon>调整需求
      </el-button>
      <el-button class="action-primary" type="primary" @click="emit('continue')">继续生成</el-button>
    </div>
  </section>
</template>

<style scoped>
.summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 20px;
  min-height: 72px;
  background: #fff;
  border: 1px solid #eaf0f6;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.summary-bar:hover {
  box-shadow: 0 6px 28px rgba(15, 23, 42, 0.07);
}

/* ── 左侧状态 ── */
.summary-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 20px;
  color: #059669;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
  flex-shrink: 0;
}

/* ── 中间信息区域 ── */
.summary-body {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  overflow-x: auto;
  flex: 1;
  padding: 10px 0;
  scrollbar-width: none;
}
.summary-body::-webkit-scrollbar { display: none; }

.info-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease;
}

.info-chip:hover {
  background: #f1f5f9;
}

.info-chip .el-icon {
  width: 16px;
  height: 16px;
  color: #8a9bb0;
  flex-shrink: 0;
}

.info-chip span {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
}

.info-chip.wide span {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-sep {
  width: 1px;
  height: 20px;
  background: #e5edf5;
  flex-shrink: 0;
  margin: 0 2px;
}

/* ── 路线模式标签 ── */
.route-chip {
  flex-shrink: 0;
  margin: 0 8px 0 4px;
  padding: 5px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #eff6ff, #ecfdf5);
  color: #0d9488;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid rgba(13, 148, 136, 0.12);
}

/* ── 右侧按钮区 ── */
.summary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  padding-left: 16px;
  border-left: 1px solid #eef3f8;
}

.action-edit {
  color: #64748b !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  padding: 6px 12px !important;
  border-radius: 8px !important;
  transition: all 0.15s ease !important;
}

.action-edit:hover {
  color: #2563eb !important;
  background: #f1f5f9 !important;
}

.action-primary {
  height: 38px !important;
  padding: 0 22px !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, #0d9488, #0891b2) !important;
  border: none !important;
  font-weight: 700 !important;
  font-size: 14px !important;
  letter-spacing: 0.3px !important;
  transition: all 0.2s ease !important;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.25) !important;
}

.action-primary:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.32) !important;
  filter: brightness(1.06) !important;
}

.action-primary:active {
  transform: translateY(0) !important;
}

/* ── 响应式 ── */
@media (max-width: 1100px) {
  .summary-bar {
    flex-wrap: wrap;
    min-height: auto;
    padding: 12px 16px;
    gap: 10px;
  }

  .summary-state {
    padding-right: 12px;
  }

  .summary-body {
    flex: 1 1 auto;
    order: 2;
    width: 100%;
    padding: 0;
    gap: 4px;
    flex-wrap: wrap;
  }

  .chip-sep {
    display: none;
  }

  .info-chip {
    padding: 4px 8px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .route-chip {
    order: 3;
    margin: 0;
  }

  .summary-actions {
    order: 4;
    width: 100%;
    justify-content: flex-end;
    border-left: none;
    padding-left: 0;
    padding-top: 6px;
    border-top: 1px solid #eef3f8;
  }

  .action-primary {
    height: 36px !important;
    padding: 0 18px !important;
    font-size: 13px !important;
  }
}

@media (max-width: 480px) {
  .summary-bar {
    padding: 10px 12px;
    gap: 8px;
    border-radius: 12px;
  }

  .summary-state {
    font-size: 13px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
  }

  .info-chip span {
    font-size: 12px;
  }

  .info-chip.wide span {
    max-width: 120px;
  }
}
</style>
