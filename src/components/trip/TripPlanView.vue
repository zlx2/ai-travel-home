<script setup lang="ts">
import { Bowl, Coin, Food, House, Location, Sunny, Tickets } from '@element-plus/icons-vue'
import type { TripPlan } from '../../types'
defineProps<{plan:TripPlan}>()
</script>
<template>
  <div class="trip-plan-view">
    <div class="plan-overview card"><div><span class="eyebrow">AI GENERATED ITINERARY</span><h2>{{plan.title}}</h2><p>{{plan.summary}}</p></div><div class="overview-meta"><span><b>{{plan.days}}</b> 天</span><span><b>{{plan.dailyPlans.reduce((s,d)=>s+(d.activities?.length||0),0)}}</b> 个体验</span></div></div>
    <section v-for="day in plan.dailyPlans" :key="day.day" class="day-card card">
      <div class="day-index"><small>DAY</small><b>{{String(day.day).padStart(2,'0')}}</b></div>
      <div class="day-content"><h3>{{day.title}}</h3><div class="activity-list"><div v-for="(item, i) in day.activities" :key="item.time || i" class="activity"><time>{{item.time || '--:--'}}</time><span class="activity-dot"></span><div><b>{{item.title}}</b><p>{{item.description}}</p><el-tag v-for="tag in item.tags" :key="tag" size="small" effect="light">{{tag}}</el-tag></div></div></div></div>
    </section>
        <article class="card tips-card"><el-icon><Sunny/></el-icon><div><h3>旅行小贴士</h3><ul><li v-for="tip in plan.tips" :key="tip">{{tip}}</li></ul></div></article>
  </div>
</template>
