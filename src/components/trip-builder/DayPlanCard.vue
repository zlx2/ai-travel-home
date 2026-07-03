<script setup lang="ts">
import { Sunny } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import type { BuilderDay, DayMoment, RentalQuote } from './types'

const props=defineProps<{ day:BuilderDay; selectedQuote?:RentalQuote|null; confirming:boolean }>()
const expandedKey=ref<string|null>(null)
const ROUTE_HEALTH_RULES=[
  {level:'danger',max:180,title:'自驾距离较长',text:'这一天车程偏长，建议确认是否接受跨城或长距离驾驶。'},
  {level:'warn',max:90,title:'自驾时间较多',text:'建议预留休息、停车和路况缓冲时间。'},
]
const LIGHT_ROUTE_HEALTH_RULE={
  level:'warn',
  max:70,
  title:'轻松自驾偏满',
  text:'当前路线对轻松出游略满，建议减少一个跨区点或增加休息。',
}
const TIP_REPLACEMENTS=[
  [/·?适合住宿/g,''],
  [/今日节奏：LIGHT/g,'今日节奏：轻松'],
  [/今日节奏：NORMAL/g,'今日节奏：适中'],
]
const routeHealth=computed(()=>{
  const mileage=Number(props.day.rental.mileage||0)
  if(!props.day.rental.enabled&&props.day.intensity==='LIGHT'&&mileage>LIGHT_ROUTE_HEALTH_RULE.max)return LIGHT_ROUTE_HEALTH_RULE
  return ROUTE_HEALTH_RULES.find(rule=>mileage>rule.max)||null
})
const toggleDetail=(key:string)=>{
  expandedKey.value=expandedKey.value===key?null:key
}
const displayCost=(moment:{costText?:string;cost:number})=>{
  const text=moment.costText?.replace('门票待确认','门票以现场为准') || (moment.cost>0?`门票参考 ¥${moment.cost}/人`:'')
  return text.includes('门票以现场为准') ? '' : text
}
const budgetNote=computed(()=>props.day.budget.excludesUnknownItems?'不含住宿和未确认门票':'含已估餐饮、交通、门票')
const cleanTip=(value:string)=>{
  return TIP_REPLACEMENTS.reduce((text,[from,to])=>text.replace(from as RegExp,to as string),value).trim()
}
const displayTips=computed(()=>props.day.tips.filter(Boolean).map(cleanTip).filter(Boolean).slice(0,4))
const formatRating=(rating?:number)=>rating ? `${rating} 分` : ''
const cleanOpeningHours=(value?:string)=>{
  if(!value)return ''
  return Array.from(new Set(value.split(/\s+/).map(item=>item.trim()).filter(Boolean))).join(' ')
}
const isMealMoment=(moment:DayMoment)=>['LUNCH_AREA','DINNER_AREA'].includes(String(moment.type||''))
const isFixedMoment=(moment:DayMoment)=>['RENTAL_PICKUP','CAR_RETURN_SERVICE','DAY_START','TRANSFER','LUNCH_AREA','DINNER_AREA','STAY_AREA'].includes(String(moment.type||''))
const mealTitle=(moment:DayMoment)=>moment.type==='LUNCH_AREA'?'午餐推荐':'晚餐推荐'
const mealArea=(moment:DayMoment)=>moment.area||moment.businessArea||'就近区域'
const mealCost=(moment:DayMoment)=>displayCost(moment).replace('约¥','人均参考 ¥')||'人均参考待定'
const mealReason=(moment:DayMoment)=>{
  const area=mealArea(moment)
  return moment.type==='LUNCH_AREA'
    ? `建议在${area}附近安排午餐，衔接上午和下午行程更顺路。`
    : `建议在${area}附近安排晚餐，结束游览后休息更方便。`
}
</script>

<template>
  <article class="day-plan-card builder-card">
    <header class="day-hero">
      <div class="day-badge"><small>Day</small><b>{{ String(day.day).padStart(2,'0') }}</b></div>
      <div>
        <div class="title-row"><h2>{{ day.title }}</h2><span>{{ day.status==='generating'?'正在生成':'正在完善' }}</span></div>
        <p>{{ day.subtitle }}</p>
      </div>
    </header>

    <section class="metric-strip">
      <div><span>总里程</span><b>{{ day.rental.mileage }} km</b></div>
      <div><span>游玩时长</span><b>{{ day.rental.duration }}</b></div>
      <div class="cost-metric">
        <span>今日预算</span>
        <el-tooltip placement="top" effect="light" :show-after="120">
          <template #content>
            <div class="budget-tooltip">
              <p><span>餐饮</span><b>¥{{ day.budget.food }}</b></p>
              <p><span>交通</span><b>¥{{ day.budget.traffic }}</b></p>
              <p><span>门票</span><b>{{ day.budget.tickets>0 ? `¥${day.budget.tickets}` : '待确认' }}</b></p>
              <em>{{ budgetNote }}</em>
            </div>
          </template>
          <b class="budget-total">¥ {{ day.budget.total }}</b>
        </el-tooltip>
      </div>
      <div><span>推荐交通</span><b>{{ selectedQuote?.name || (day.rental.enabled ? '租车自驾' : '步行 + 打车') }}</b></div>
    </section>

    <section v-if="routeHealth" class="route-health" :class="routeHealth.level">
      <b>{{ routeHealth.title }}</b>
      <span>{{ routeHealth.text }}</span>
    </section>

    <section v-if="day.status==='pending'" class="day-empty-state">
      <b>等待生成</b>
      <span>{{ day.subtitle }}</span>
    </section>
    <section v-else class="timeline-scroll">
      <div class="timeline-panel">
        <div
          v-for="(moment,index) in day.moments"
          :key="moment.key"
          class="moment-row"
          :class="{ expanded: expandedKey===moment.key, rental: moment.type==='RENTAL_PICKUP'||moment.type==='CAR_RETURN_SERVICE'||moment.type==='DAY_START'||moment.type==='TRANSFER', meal: moment.type==='LUNCH_AREA'||moment.type==='DINNER_AREA', hotel: moment.type==='STAY_AREA', compact: moment.compact, fixed: isFixedMoment(moment) }"
        >
          <div class="moment-time">
            <b>{{ moment.time.split('-')[0] }}</b>
            <el-icon><Sunny/></el-icon>
          </div>
          <div class="moment-pin">{{ index + 1 }}</div>
          <div v-if="isMealMoment(moment)" class="meal-card">
            <div class="meal-card-head">
              <span class="meal-icon">餐</span>
              <div>
                <h4>{{ mealTitle(moment) }}</h4>
                <p>{{ mealArea(moment) }}附近</p>
              </div>
            </div>
            <div class="meal-card-meta">
              <span>{{ moment.suggestedDuration || '舒适用餐' }}</span>
              <span>{{ mealCost(moment) }}</span>
            </div>
          </div>
          <div v-else class="moment-main">
            <h4>{{ moment.title }}</h4>
            <div class="moment-tags">
              <span v-for="tag in moment.tags.slice(0,2)" :key="tag">{{ tag }}</span>
              <em v-if="displayCost(moment)">{{ displayCost(moment) }}</em>
            </div>
          </div>
          <button class="detail-toggle" type="button" @click="toggleDetail(moment.key)">
            {{ expandedKey===moment.key ? '收起' : '详情' }}
          </button>
          <div v-if="expandedKey===moment.key && moment.type==='STAY_AREA'" class="moment-detail">
            <div v-if="moment.address"><b>地址</b><span>{{ moment.address }}</span></div>
            <div v-if="moment.estimatedPrice || moment.nearbyHotels?.[0]?.estimatedPrice"><b>参考价</b><span>{{ moment.estimatedPrice || moment.nearbyHotels?.[0]?.estimatedPrice }}</span></div>
          </div>
          <div v-else-if="expandedKey===moment.key && (moment.type==='TRANSFER'||moment.type==='DAY_START') && moment.nearbyHotels?.length" class="moment-detail">
            <div v-if="moment.nearbyHotels[0].name"><b>住宿</b><span>{{ moment.nearbyHotels[0].name }}</span></div>
            <div v-if="moment.nearbyHotels[0].address"><b>地址</b><span>{{ moment.nearbyHotels[0].address }}</span></div>
            <div v-if="moment.nearbyHotels[0].estimatedPrice"><b>参考价</b><span>{{ moment.nearbyHotels[0].estimatedPrice }}</span></div>
          </div>
          <div v-else-if="expandedKey===moment.key" class="moment-detail" :class="{ meal: isMealMoment(moment) }">
            <template v-if="isMealMoment(moment)">
              <div><b>用餐区域</b><span>{{ mealArea(moment) }}附近</span></div>
              <div v-if="moment.suggestedDuration"><b>建议停留</b><span>{{ moment.suggestedDuration }}</span></div>
              <div v-if="displayCost(moment)"><b>人均参考</b><span>{{ displayCost(moment) }}</span></div>
              <div><b>推荐说明</b><span>{{ mealReason(moment) }}</span></div>
            </template>
            <template v-else>
              <div v-if="moment.address"><b>地址</b><span>{{ moment.address }}</span></div>
              <div v-if="moment.area || moment.businessArea"><b>区域</b><span>{{ [moment.area, moment.businessArea].filter(Boolean).join(' · ') }}</span></div>
              <div v-if="cleanOpeningHours(moment.openingHours)"><b>开放时间</b><span>{{ cleanOpeningHours(moment.openingHours) }}</span></div>
              <div v-if="formatRating(moment.rating)"><b>评分</b><span>{{ formatRating(moment.rating) }}</span></div>
              <div v-if="moment.suggestedDuration"><b>建议停留</b><span>{{ moment.suggestedDuration }}</span></div>
              <div v-if="moment.transportSuggestion"><b>交通建议</b><span>{{ moment.transportSuggestion }}</span></div>
              <div><b>推荐理由</b><span>{{ moment.reason || moment.description }}</span></div>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section class="tips-line">
      <b>出行小贴士</b>
      <div>
        <span v-for="tip in displayTips" :key="tip">{{ tip }}</span>
      </div>
    </section>
  </article>
</template>

<style scoped>
.day-plan-card{overflow:hidden}.day-hero{display:grid;grid-template-columns:54px 1fr;gap:16px;align-items:center;padding:20px 24px 12px}.day-badge{width:54px;height:54px;border-radius:10px;background:linear-gradient(145deg,#0f8f81,#12b38e);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;box-shadow:0 14px 26px rgba(15,143,129,.22)}.day-badge small{font-size:12px;font-weight:800}.day-badge b{font-size:22px;line-height:1}.title-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.title-row h2{margin:0;color:#111827;font-size:23px;line-height:1.25}.title-row span{border-radius:999px;background:#fff4df;color:#a16207;padding:5px 10px;font-size:12px;font-weight:800}.day-hero p{margin:7px 0 0;color:#667085;font-size:14px}.metric-strip{display:grid;grid-template-columns:repeat(4,1fr);margin:0 24px 14px;border:1px solid #e7edf3;border-radius:14px;background:#fff}.metric-strip div{min-width:0;min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-right:1px solid #e7edf3;padding:8px 10px;text-align:center}.metric-strip div:last-child{border-right:0}.metric-strip span{color:#7b8798;font-size:12px;line-height:1.2}.metric-strip b{margin-top:5px;color:#172033;font-size:14px;line-height:1.25}.metric-strip .cost-metric{min-height:64px}.budget-total{cursor:help}.budget-tooltip{min-width:168px;color:#52657a;font-size:12px}.budget-tooltip p{display:flex;justify-content:space-between;gap:18px;margin:0 0 6px}.budget-tooltip b{color:#172033}.budget-tooltip em{display:block;margin-top:8px;padding-top:8px;border-top:1px solid #e5eaf1;color:#7b8798;font-style:normal}.route-health{display:grid;grid-template-columns:118px 1fr;gap:10px;align-items:center;margin:0 24px 14px;padding:11px 13px;border-radius:13px;font-size:13px}.route-health b{color:#172033}.route-health span{color:#607086}.route-health.warn{border:1px solid #fde8bd;background:#fffbeb}.route-health.danger{border:1px solid #fecaca;background:#fff7f7}.timeline-scroll{max-height:500px;margin:0 18px 18px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#b8c6d7 transparent}.timeline-scroll::-webkit-scrollbar{width:8px}.timeline-scroll::-webkit-scrollbar-thumb{border-radius:999px;background:#c7d2e0}.timeline-panel{border:1px solid #e8edf3;border-radius:16px;overflow:hidden;background:#fff}.moment-row{position:relative;display:grid;grid-template-columns:54px 28px minmax(0,1fr) 48px;gap:12px;align-items:center;min-height:112px;padding:15px 16px;border-bottom:1px solid #edf1f5}.moment-row.rental{background:#f0fdfa}.moment-row.meal{min-height:86px;background:#fffdf8}.moment-row.hotel{background:#f8fafc}.moment-row.rental .moment-pin{background:#2563eb}.moment-row.meal .moment-pin{background:#f2cf8a;color:#7c4a03}.moment-row.hotel .moment-pin{background:#64748b}.moment-row.rental .moment-main h4{color:#0f3f8f}.moment-row.meal .moment-main h4{color:#7c4a03}.moment-row.hotel .moment-main h4{color:#334155}.moment-row:last-child{border-bottom:0}.moment-row:before{content:"";position:absolute;left:96px;top:0;bottom:0;border-left:1px dashed #9bd8cf}.moment-row:first-child:before{top:50%}.moment-row:last-child:before{bottom:50%}.moment-row.expanded{align-items:start;background:#fbfdff}.moment-row.rental.expanded{background:#ecfeff}.moment-row.meal.expanded{background:#fffdf8}.moment-row.hotel.expanded{background:#f8fafc}.moment-time{display:grid;gap:8px;justify-items:center;color:#f59e0b}.moment-time b{color:#111827;font-size:14px}.moment-time .el-icon{font-size:20px}.moment-pin{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#0f9f8f;color:#fff;font-size:13px;font-weight:900;z-index:1}.moment-main h4{margin:0;color:#172033;font-size:17px}.moment-main p{margin:6px 0 9px;color:#5f6f84;font-size:13px;line-height:1.5}.meal-card{min-width:0;border:0;border-left:3px solid #f0d7a4;background:transparent;box-shadow:none;padding:4px 0 4px 12px}.meal-card-head{display:flex;gap:8px;align-items:center}.meal-icon{width:auto;height:22px;border-radius:999px;display:inline-flex;align-items:center;color:#7c4a03;background:#fffbeb;border:1px solid #fdecc8;font-weight:900;font-size:12px;box-shadow:none;padding:0 8px}.meal-card h4{margin:0;color:#3d3325;font-size:16px;line-height:1.25}.meal-card-head p{margin:0;color:#667085;font-size:13px;line-height:1.35}.meal-card-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px}.meal-card-meta span{min-height:22px;display:inline-flex;align-items:center;border-radius:999px;padding:2px 9px;color:#52657a;background:#fff;border:1px solid #dfe9ef;font-size:12px;font-weight:800}.moment-tags{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.moment-tags span,.moment-tags em{height:24px;display:inline-flex;align-items:center;border-radius:999px;padding:0 10px;font-size:12px;font-style:normal}.moment-tags span{color:#0f766e;background:#eaf8f4}.moment-tags em{color:#6b7280;background:#f3f5f7}.detail-toggle{height:30px;border:1px solid #dbe7f0;border-radius:8px;background:#fff;color:#0f766e;font-size:12px;font-weight:800;cursor:pointer}.detail-toggle:hover{border-color:#0f9f8f;background:#f0fdfa}.moment-detail{grid-column:3 / -1;display:grid;gap:8px;margin-top:-2px;padding:12px 14px;border-radius:12px;background:#f8fafc;color:#5d6c80;font-size:13px;line-height:1.6}.moment-detail.meal{border:1px solid #f4e5c4;background:#fffdf8}.moment-detail div{display:grid;grid-template-columns:74px minmax(0,1fr);gap:10px}.moment-detail b{color:#172033}.tips-line{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;margin:0 18px 18px;padding:13px 15px;border:1px solid #dcecff;border-radius:14px;background:#f5f9ff;color:#52657a;font-size:13px}.tips-line b{color:#172033;white-space:nowrap;line-height:26px}.tips-line div{display:flex;gap:8px;flex-wrap:wrap}.tips-line span{display:inline-flex;align-items:center;max-width:100%;min-height:26px;border-radius:999px;background:#fff;color:#52657a;border:1px solid #e4edf7;padding:4px 10px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:1180px){.metric-strip{grid-template-columns:repeat(2,1fr)}.metric-strip div:nth-child(2){border-right:0}.metric-strip div:nth-child(-n+2){border-bottom:1px solid #e7edf3}}@media(max-width:760px){.day-hero{grid-template-columns:1fr}.metric-strip{grid-template-columns:1fr}.metric-strip div{border-right:0;border-bottom:1px solid #e7edf3}.metric-strip div:last-child{border-bottom:0}.route-health{grid-template-columns:1fr}.timeline-scroll{max-height:none}.moment-row{grid-template-columns:1fr}.moment-row:before{display:none}.moment-time{justify-items:start;grid-auto-flow:column;justify-content:start}.moment-detail{grid-column:auto}.moment-detail div{grid-template-columns:1fr}.tips-line{grid-template-columns:1fr}}
.moment-row.compact{min-height:82px}.moment-row.fixed{cursor:default}
</style>
