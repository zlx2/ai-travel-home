<script setup lang="ts">
import { Sunny } from '@element-plus/icons-vue'
import { ref } from 'vue'
import type { BuilderDay, RentalQuote } from './types'

defineProps<{ day:BuilderDay; selectedQuote?:RentalQuote|null; confirming:boolean }>()
const expandedKey=ref<string|null>(null)
const toggleDetail=(key:string)=>{
  expandedKey.value=expandedKey.value===key?null:key
}
</script>

<template>
  <article class="day-plan-card builder-card">
    <header class="day-hero">
      <div class="day-badge"><small>Day</small><b>{{ String(day.day).padStart(2,'0') }}</b></div>
      <div>
        <div class="title-row"><h2>{{ day.title }}</h2><span>{{ day.status==='generating'?'正在生成':'当前正在编辑' }}</span></div>
        <p>{{ day.subtitle }}</p>
      </div>
    </header>

    <section class="metric-strip">
      <div><span>总里程</span><b>{{ day.rental.mileage }} km</b></div>
      <div><span>预计时长</span><b>{{ day.rental.duration }}</b></div>
      <div class="cost-metric">
        <span>当天预计</span><b>¥ {{ day.budget.total }}</b>
        <small>门票 {{ day.budget.tickets }} · 餐饮 {{ day.budget.food }} · 交通 {{ day.budget.traffic }}</small>
        <small v-if="day.budget.excludesUnknownItems">不含待确认门票、住宿</small>
      </div>
      <div><span>推荐交通</span><b>{{ selectedQuote?.name || (day.rental.enabled ? '租车自驾' : '步行 + 打车') }}</b></div>
    </section>

    <section class="timeline-scroll">
      <div class="timeline-panel">
        <div v-for="(moment,index) in day.moments" :key="moment.key" class="moment-row" :class="{ expanded: expandedKey===moment.key }">
          <div class="moment-time">
            <b>{{ moment.time.split('-')[0] }}</b>
            <el-icon><Sunny/></el-icon>
          </div>
          <div class="moment-pin">{{ index + 1 }}</div>
          <div class="moment-main">
            <h4>{{ moment.title }}</h4>
            <p>{{ moment.description }}</p>
            <div class="moment-tags">
              <span v-for="tag in moment.tags.slice(0,2)" :key="tag">{{ tag }}</span>
              <em>{{ moment.costText || `预估 ¥${moment.cost}/人` }}</em>
            </div>
          </div>
          <button class="detail-toggle" type="button" @click="toggleDetail(moment.key)">
            {{ expandedKey===moment.key ? '收起' : '详情' }}
          </button>
          <div v-if="expandedKey===moment.key" class="moment-detail">
            <div><b>建议停留</b><span>{{ moment.suggestedDuration || '后端未返回' }}{{ moment.suggestedDurationSource==='RULE_ESTIMATED'?'（系统估算）':'' }}</span></div>
            <div v-if="moment.openingHours"><b>营业时间</b><span>{{ moment.openingHours }}（高德）</span></div>
            <div v-if="moment.rating"><b>高德评分</b><span>{{ moment.rating }}</span></div>
            <div v-if="moment.averageCost"><b>参考人均</b><span>¥{{ moment.averageCost }}（高德消费数据，非门票）</span></div>
            <div><b>交通建议</b><span>{{ moment.transportSuggestion || (day.rental.enabled ? '自驾或短途打车，提前确认停车点。' : '优先步行或短途打车，减少换乘。') }}</span></div>
            <div><b>推荐理由</b><span>{{ moment.reason || moment.description }}</span></div>
            <div v-if="moment.area || moment.address"><b>位置区域</b><span>{{ moment.area || moment.address }}</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="tips-line">
      <b>AI 提醒</b>
      <span>{{ day.tips.filter(Boolean).join('；') }}</span>
    </section>
  </article>
</template>

<style scoped>
.day-plan-card{overflow:hidden}.day-hero{display:grid;grid-template-columns:54px 1fr;gap:16px;align-items:center;padding:20px 24px 12px}.day-badge{width:54px;height:54px;border-radius:10px;background:linear-gradient(145deg,#0f8f81,#12b38e);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;box-shadow:0 14px 26px rgba(15,143,129,.22)}.day-badge small{font-size:12px;font-weight:800}.day-badge b{font-size:22px;line-height:1}.title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.title-row h2{margin:0;color:#111827;font-size:23px;line-height:1.25}.title-row span{border-radius:999px;background:#fff4df;color:#a16207;padding:5px 10px;font-size:12px;font-weight:800}.day-hero p{margin:7px 0 0;color:#667085;font-size:14px}.metric-strip{display:grid;grid-template-columns:repeat(4,1fr);margin:0 24px 14px;border:1px solid #e7edf3;border-radius:14px;background:#fff}.metric-strip div{min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid #e7edf3}.metric-strip div:last-child{border-right:0}.metric-strip span{color:#7b8798;font-size:12px}.metric-strip b{margin-top:5px;color:#172033;font-size:14px}.metric-strip .cost-metric{min-height:72px}.metric-strip .cost-metric small{margin-top:3px;color:#8a96a8;font-size:10px}.timeline-scroll{max-height:500px;margin:0 18px 18px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b8c6d7 transparent}.timeline-scroll::-webkit-scrollbar{width:8px}.timeline-scroll::-webkit-scrollbar-thumb{border-radius:999px;background:#c7d2e0}.timeline-panel{border:1px solid #e8edf3;border-radius:16px;overflow:hidden;background:#fff}.moment-row{position:relative;display:grid;grid-template-columns:54px 28px minmax(0,1fr) 48px;gap:12px;align-items:center;min-height:112px;padding:15px 16px;border-bottom:1px solid #edf1f5}.moment-row:last-child{border-bottom:0}.moment-row:before{content:"";position:absolute;left:96px;top:0;bottom:0;border-left:1px dashed #9bd8cf}.moment-row:first-child:before{top:50%}.moment-row:last-child:before{bottom:50%}.moment-row.expanded{align-items:start;background:#fbfdff}.moment-time{display:grid;gap:8px;justify-items:center;color:#f59e0b}.moment-time b{color:#111827;font-size:14px}.moment-time .el-icon{font-size:20px}.moment-pin{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#0f9f8f;color:#fff;font-size:13px;font-weight:900;z-index:1}.moment-main h4{margin:0;color:#172033;font-size:17px}.moment-main p{margin:6px 0 9px;color:#5f6f84;font-size:13px;line-height:1.5}.moment-tags{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.moment-tags span,.moment-tags em{height:24px;display:inline-flex;align-items:center;border-radius:999px;padding:0 10px;font-size:12px;font-style:normal}.moment-tags span{color:#0f766e;background:#eaf8f4}.moment-tags em{color:#6b7280;background:#f3f5f7}.detail-toggle{height:30px;border:1px solid #dbe7f0;border-radius:8px;background:#fff;color:#0f766e;font-size:12px;font-weight:800;cursor:pointer}.detail-toggle:hover{border-color:#0f9f8f;background:#f0fdfa}.moment-detail{grid-column:3 / -1;display:grid;gap:8px;margin-top:-2px;padding:12px 14px;border-radius:12px;background:#f8fafc;color:#5d6c80;font-size:13px;line-height:1.6}.moment-detail div{display:grid;grid-template-columns:74px minmax(0,1fr);gap:10px}.moment-detail b{color:#172033}.tips-line{display:flex;gap:10px;align-items:flex-start;margin:0 18px 18px;padding:13px 15px;border:1px solid #dcecff;border-radius:14px;background:#f5f9ff;color:#52657a;font-size:13px}.tips-line b{color:#172033;white-space:nowrap}@media(max-width:1180px){.metric-strip{grid-template-columns:repeat(2,1fr)}.metric-strip div:nth-child(2){border-right:0}.metric-strip div:nth-child(-n+2){border-bottom:1px solid #e7edf3}}@media(max-width:760px){.day-hero{grid-template-columns:1fr}.metric-strip{grid-template-columns:1fr}.metric-strip div{border-right:0;border-bottom:1px solid #e7edf3}.metric-strip div:last-child{border-bottom:0}.timeline-scroll{max-height:none}.moment-row{grid-template-columns:1fr}.moment-row:before{display:none}.moment-time{justify-items:start;grid-auto-flow:column;justify-content:start}.moment-detail{grid-column:auto}.moment-detail div{grid-template-columns:1fr}}
</style>
