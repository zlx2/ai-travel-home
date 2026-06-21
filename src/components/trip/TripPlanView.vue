<script setup lang="ts">
import { Bowl, Coin, Food, House, Location, Sunny, Tickets } from '@element-plus/icons-vue'
import type { TripPlan } from '../../types'
defineProps<{plan:TripPlan}>()
</script>
<template>
  <div class="trip-plan-view">
    <div class="plan-overview card"><div><span class="eyebrow">AI GENERATED ITINERARY</span><h2>{{plan.title}}</h2><p>{{plan.summary}}</p></div><div class="overview-meta"><span><b>{{plan.days}}</b> 天</span><span><b>{{plan.dailyPlans.length*3}}</b> 个体验</span><span><b>¥{{plan.budgetSummary.total}}</b> 预算</span></div></div>
    <section v-for="day in plan.dailyPlans" :key="day.day" class="day-card card">
      <div class="day-index"><small>DAY</small><b>{{String(day.day).padStart(2,'0')}}</b></div>
      <div class="day-content"><h3>{{day.title}}</h3><div class="activity-list"><div v-for="item in day.activities" :key="item.time" class="activity"><time>{{item.time}}</time><span class="activity-dot"></span><div><b>{{item.title}}</b><p>{{item.description}}</p><el-tag v-for="tag in item.tags" :key="tag" size="small" effect="light">{{tag}}</el-tag></div><span class="cost">¥{{item.cost}}</span></div></div><div class="day-bottom"><span><el-icon><Food/></el-icon> 今日推荐：{{day.food.join(' · ')}}</span><span><el-icon><Coin/></el-icon> 预计 ¥{{day.budget}}</span></div></div>
    </section>
    <div class="plan-extras"><article class="card"><el-icon><House/></el-icon><div><h3>住宿建议</h3><p>{{plan.accommodation}}</p></div></article><article class="card budget-card"><el-icon><Coin/></el-icon><div><h3>预算汇总</h3><p>交通 ¥{{plan.budgetSummary.transport}} · 住宿 ¥{{plan.budgetSummary.hotel}} · 餐饮 ¥{{plan.budgetSummary.food}} · 门票 ¥{{plan.budgetSummary.tickets}}</p><strong>合计 ¥{{plan.budgetSummary.total}}</strong></div></article></div>
    <article class="card tips-card"><el-icon><Sunny/></el-icon><div><h3>旅行小贴士</h3><ul><li v-for="tip in plan.tips" :key="tip">{{tip}}</li></ul></div></article>
  </div>
</template>
