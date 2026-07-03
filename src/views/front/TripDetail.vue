<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { normalizeTripPlan, tripApi } from '../../api'
import type { Trip, TripPlan } from '../../types'
import TripPlanView from '../../components/trip/TripPlanView.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const trip = ref<Trip | null>(null)
const plan = computed<TripPlan | null>(() => trip.value?.tripPlanJson ? normalizeTripPlan(trip.value.tripPlanJson) : null)

const load = async () => {
  try {
    trip.value = await tripApi.detail(Number(route.params.id))
  } catch {
    ElMessage.error('行程不存在或已被删除')
    router.push('/trips')
  } finally {
    loading.value = false
  }
}

const fallbackPlan = computed(() => {
  if (!trip.value?.tripPlanJson) return null
  const raw = trip.value.tripPlanJson as any
  try { return normalizeTripPlan(raw) } catch {
    const dailyPlans = (raw.dailyPlans || []).map((d:any) => ({
      day: d.day, title: d.theme || d.title,
      activities: d.spots || d.activities || d.items || d.timeline || [],
      food: d.food || (d.foodSuggestions || []).map((f:any) => f?.name || f || '').filter(Boolean),
      budget: d.budget || d.estimatedCost?.total || 0,
      estimatedCost: d.estimatedCost, intensity: d.intensity,
      accommodation: d.accommodation, diningArea: d.diningArea,
      tips: d.tips || d.dayTips || [],
    }))
    return normalizeTripPlan({ ...raw, dailyPlans })
  }
})

const remove = async () => {
  if (!trip.value) return
  await ElMessageBox.confirm(`确定删除"${trip.value.title}"吗？`, '删除行程', { type: 'warning' })
  await tripApi.remove(trip.value.id)
  ElMessage.success('已删除')
  router.push('/trips')
}

onMounted(load)
</script>

<template>
  <div class="page trip-detail-page" v-loading="loading">
    <div class="container" v-if="trip">
      <div class="detail-header">
        <div>
          <span class="eyebrow">TRIP DETAIL</span>
          <h1>{{ trip.title }}</h1>
          <p>{{ trip.summary }}</p>
        </div>
        <div class="detail-actions">
          <el-button type="danger" plain :icon="Delete" @click="remove">删除行程</el-button>
        </div>
      </div>
      <TripPlanView v-if="plan || fallbackPlan" :plan="(plan || fallbackPlan)!" />
    </div>
    <div class="container" v-else-if="!loading">
      <el-empty description="行程数据为空" />
    </div>
  </div>
</template>

<style scoped>
.trip-detail-page { min-height: calc(100vh - 72px); padding: 28px 0 60px; }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.detail-header h1 { font-size: 32px; margin: 8px 0 6px; }
.detail-header p { color: #64748b; font-size: 15px; max-width: 680px; }
.detail-actions { flex-shrink: 0; padding-top: 8px; }
</style>
