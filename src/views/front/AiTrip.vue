<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { aiApi, tripApi } from '../../api'
import DayPlanCard from '../../components/trip-builder/DayPlanCard.vue'
import FinalReviewPanel from '../../components/trip-builder/FinalReviewPanel.vue'
import NaturalLanguageInputCard from '../../components/trip-builder/NaturalLanguageInputCard.vue'
import RentalQuoteDeck from '../../components/trip-builder/RentalQuoteDeck.vue'
import RequirementSummaryBar from '../../components/trip-builder/RequirementSummaryBar.vue'
import TripProgressRail from '../../components/trip-builder/TripProgressRail.vue'
import type { BuilderDay, BuilderStep, RentalQuote } from '../../components/trip-builder/types'
import type { AnalyzeResult, RecommendationContext, Requirement, TripPlan } from '../../types'

const route=useRoute()
const userInput=ref('带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算在4000元以内。')
const showForm=ref(false)
const analyzing=ref(false)
const generating=ref(false)
const saving=ref(false)
const confirming=ref(false)
const orderCreated=ref(false)
const paid=ref(false)
const result=ref<AnalyzeResult|null>(null)
const followUpAnswers=reactive<Record<string,string>>({})
const plan=ref<TripPlan|null>(null)
const recommendation=ref<RecommendationContext|null>(null)
const step=ref<BuilderStep>('INPUT')
const days=ref<BuilderDay[]>([])
const currentDayIndex=ref(0)
const selectedQuoteId=ref('comfort')
const reviseVisible=ref(false)
const reviseText=ref('')

const form=reactive<Requirement>({
  departure:'上海',
  destination:'杭州',
  days:3,
  budget:4000,
  budgetType:'TOTAL',
  peopleCount:2,
  preferences:['自然风光','历史文化','美食体验'],
  pace:'LIGHT',
  avoidances:['不要太累'],
  travelDate:'',
})
const preferenceOptions=['美食体验','夜景','历史文化','自然风光','亲子','拍照打卡','自驾','轻松游']

onMounted(()=>{
  if(route.query.destination){
    form.destination=String(route.query.destination)
    form.days=Number(route.query.days||3)
    form.preferences=String(route.query.preferences||'').split(',').filter(Boolean)
    userInput.value=`我想去${form.destination}玩${form.days}天，喜欢${form.preferences.join('和')}，行程轻松一点`
    showForm.value=true
  }
})

const activeRequirement=computed(()=>result.value?.requirement||form)
const ready=computed(()=>result.value?.status==='READY'&&!!result.value.requirement)
const pendingQuestions=computed(()=>result.value?.status==='NEED_MORE_INFO'?(result.value.questions||[]):[])
const hasRental=computed(()=>{
  const text=`${userInput.value} ${form.preferences.join(' ')}`
  return /自驾|租车|落地|取车|还车|多城市|江浙沪|周边/.test(text)
})
const routeMode=computed(()=>hasRental.value?(userInput.value.includes('落地')?'出行方式：落地租车':'路线模式：租车自驾'):'城市轻松游')
const selectedQuote=computed(()=>quoteOptions.value.find(item=>item.id===selectedQuoteId.value)||quoteOptions.value[0]||null)
const currentDay=computed(()=>days.value[currentDayIndex.value])
const lockedCount=computed(()=>days.value.filter(day=>day.status==='locked').length)
const progressStyle=computed(()=>({background:`conic-gradient(#10b981 ${Math.round((lockedCount.value/Math.max(days.value.length,1))*360)}deg,#e5eaf0 0deg)`}))

const quoteOptions=computed<RentalQuote[]>(()=>{
  const req=activeRequirement.value
  const dayCount=Math.max(1,req.days||3)
  const pickup=req.destination?`${req.destination}站`:'目的地门店'
  const airport=req.destination?`${req.destination}萧山国际机场`:'机场门店'
  return [
    {id:'comfort',label:'推荐套餐',name:'舒适型轿车',subtitle:'大众朗逸或同级',seats:5,luggage:2,tags:['自动挡','空调'],pickup:airport,returnPlace:airport,pickupTime:'06-01 09:00',returnTime:`06-${String(dayCount).padStart(2,'0')} 18:00`,totalPrice:620,dayCount,serviceTags:['基本保险','24h 道路救援','免费取消','无限里程'],tone:'blue'},
    {id:'suv',label:'性价比优选',name:'SUV 经济型',subtitle:'哈弗 H6 或同级',seats:5,luggage:2,tags:['自动挡','山路友好'],pickup,returnPlace:pickup,pickupTime:'06-01 09:00',returnTime:`06-${String(dayCount).padStart(2,'0')} 18:00`,totalPrice:780,dayCount,serviceTags:['基本保险','24h 道路救援','免费取消'],tone:'teal'},
    {id:'business',label:'宽敞舒适',name:'7座商务车',subtitle:'别克 GL8 或同级',seats:7,luggage:4,tags:['自动挡','家庭多人'],pickup:airport,returnPlace:airport,pickupTime:'06-01 09:00',returnTime:`06-${String(dayCount).padStart(2,'0')} 18:00`,totalPrice:980,dayCount,serviceTags:['基本保险','24h 道路救援','免费取消','宽敞座舱'],tone:'gold'},
  ]
})

const applyExample=(value:string)=>{
  userInput.value=value
  if(value.includes('杭州')) form.destination='杭州'
  if(value.includes('成都')) form.destination='成都'
  if(value.includes('江浙沪')) form.destination='杭州'
  if(value.includes('自驾')&&!form.preferences.includes('自驾')) form.preferences.push('自驾')
  const daysText=value.match(/(\d+)\s*天/)
  if(daysText) form.days=Number(daysText[1])
}

const analyze=async()=>{
  if(!userInput.value.trim()&&!form.destination)return ElMessage.warning('先告诉 AI 你想去哪里、怎么玩')
  analyzing.value=true
  plan.value=null
  recommendation.value=null
  days.value=[]
  orderCreated.value=false
  paid.value=false
  try{
    const extraAnswers=Object.entries(followUpAnswers).filter(([,value])=>value.trim()).map(([field,value])=>`${field}：${value.trim()}`)
    const requirement=showForm.value?form:result.value?.requirement
    result.value=await aiApi.analyze({conversationId:result.value?.conversationId,userInput:userInput.value,extraAnswers,requirement})
    if(result.value.requirement)Object.assign(form,result.value.requirement)
    if(result.value.status==='NEED_MORE_INFO'){
      for(const question of result.value.questions||[]){
        if(!(question.field in followUpAnswers))followUpAnswers[question.field]=''
      }
    }else{
      clearFollowUpAnswers()
    }
    step.value=ready.value?'ANALYZED':'INPUT'
  }finally{
    analyzing.value=false
  }
}

const updateFollowUpAnswer=(field:string,value:string)=>{
  followUpAnswers[field]=value
}

const submitFollowUp=async()=>{
  const missing=pendingQuestions.value.find(item=>item.required&&!followUpAnswers[item.field]?.trim())
  if(missing)return ElMessage.warning(missing.question)
  await analyze()
}

function clearFollowUpAnswers(){
  for(const key of Object.keys(followUpAnswers))delete followUpAnswers[key]
}

const chooseDestination=async(name:string)=>{
  form.destination=name
  userInput.value=`${userInput.value}，目的地选择${name}`
  await analyze()
}

const continueFromSummary=()=>{
  if(!ready.value)return
  step.value=hasRental.value?'QUOTE_SELECT':'DAY_BUILDING'
  if(!hasRental.value) startDayBuilding()
}

const startDayBuilding=async()=>{
  if(!result.value?.requirement)return
  generating.value=true
  step.value='DAY_BUILDING'
  try{
    const data=await aiApi.generate(result.value.conversationId,result.value.requirement)
    plan.value=data.tripPlan
    recommendation.value=data.recommendationContext||null
    days.value=createBuilderDays(data.tripPlan,result.value.requirement,!!selectedQuote.value)
    currentDayIndex.value=days.value.findIndex(day=>day.status==='active')
    if(currentDayIndex.value<0)currentDayIndex.value=0
    setTimeout(()=>document.querySelector('.day-builder-anchor')?.scrollIntoView({behavior:'smooth',block:'start'}),100)
  }finally{
    generating.value=false
  }
}

const confirmCurrentDay=()=>{
  if(!currentDay.value)return
  confirming.value=true
  setTimeout(()=>{
    days.value[currentDayIndex.value]={...currentDay.value,status:'locked'}
    const next=currentDayIndex.value+1
    if(next<days.value.length){
      days.value[next]={...days.value[next],status:'active'}
      currentDayIndex.value=next
    }else{
      step.value='FINAL_REVIEW'
    }
    confirming.value=false
  },420)
}

const regenerateCurrentDay=()=>{
  if(!currentDay.value)return
  const index=currentDayIndex.value
  days.value[index]={...days.value[index],status:'generating'}
  setTimeout(()=>{
    days.value[index]={...days.value[index],status:'active',subtitle:'已根据新的思路重新平衡节奏、交通和停留时间。'}
    ElMessage.success(`Day ${String(days.value[index].day).padStart(2,'0')} 已重新生成`)
  },650)
}

const submitRevision=()=>{
  if(!reviseText.value.trim())return ElMessage.warning('先告诉 AI 你希望怎么调整')
  reviseVisible.value=false
  reviseText.value=''
  regenerateCurrentDay()
}

const createOrder=async()=>{
  if(!plan.value||!result.value?.requirement)return
  saving.value=true
  try{
    await tripApi.save({
      title:plan.value.title,
      destination:plan.value.destination,
      days:plan.value.days,
      budget:plan.value.budgetSummary.total,
      preferences:result.value.requirement.preferences,
      summary:plan.value.summary,
      coverUrl:coverForDestination(plan.value.destination),
      requirementJson:result.value.requirement,
      tripPlanJson:plan.value,
      userId:1,
      username:'sora',
    })
    orderCreated.value=true
    step.value='ORDER_CREATED'
    ElMessage.success('行程已保存，订单演示态已创建')
  }finally{
    saving.value=false
  }
}

const sandboxPay=()=>{
  if(!orderCreated.value)return ElMessage.info('请先创建订单')
  paid.value=true
  step.value='PAID'
  ElMessage.success('已触发沙箱支付演示态，未伪造真实支付结果')
}

function coverForDestination(destination:string){
  if(destination.includes('杭州'))return'/assets/hq/hangzhou.jpg'
  if(destination.includes('成都'))return'/assets/hq/chengdu.jpg'
  if(destination.includes('厦门'))return'/assets/hq/xiamen.jpg'
  if(destination.includes('西安'))return'/assets/hq/xian.jpg'
  if(destination.includes('云南'))return'/assets/hq/yunnan.jpg'
  return'/assets/hq/chongqing.jpg'
}

function createBuilderDays(tripPlan:TripPlan,requirement:Requirement,rentalEnabled:boolean):BuilderDay[]{
  const image=coverForDestination(requirement.destination)
  const fallbackRoutes=['城市地标','本地餐厅','文化街区','夜间漫步']
  return tripPlan.dailyPlans.map((day,index)=>{
    const activities=day.activities.length?day.activities:[]
    const route=activities.map(item=>item.title.split('→')[0].trim()).filter(Boolean).slice(0,5)
    while(route.length<4)route.push(fallbackRoutes[route.length])
    const foodCost=Math.max(120,requirement.peopleCount*75)
    const tickets=Math.max(0,activities.reduce((sum,item)=>sum+(item.cost||0),0))
    const traffic=rentalEnabled?50:30
    const other=50
    return {
      day:day.day,
      title:day.title||`${requirement.destination}精选体验`,
      subtitle:index===0?'从城市核心印象开始，保留足够步行和休息时间。':'在自然、文化与本地烟火之间，感受更松弛的一天。',
      status:index===0?'active':'pending',
      route,
      moments:[
        buildMoment('morning','上午','09:00-12:00',activities[0],image,['景点','步行游览']),
        {key:'lunch',period:'中午',time:'12:00-13:30',title:day.food[0]||`${requirement.destination}本地餐厅`,description:'安排顺路餐厅，减少绕行，把体力留给下午体验。',tags:['本地风味','轻松用餐'],cost:foodCost,image:'/assets/map-card.jpg'},
        buildMoment('afternoon','下午','14:00-17:30',activities[1]||activities[0],image,['文化体验','慢游']),
        buildMoment('evening','晚上','18:00-21:00',activities[2]||activities[0],image,['夜间散步','烟火气']),
      ],
      foods:day.food,
      budget:{tickets,food:foodCost,traffic,other,total:tickets+foodCost+traffic+other},
      rental:{enabled:rentalEnabled,departure:`${requirement.destination}核心范围`,duration:rentalEnabled?'约 8 小时':'按需短途',mileage:rentalEnabled?68:18,fuelCost:traffic},
      tips:[
        '热门景点建议错峰出行，上午优先安排核心体验。',
        requirement.pace==='LIGHT'?'已按轻松节奏预留休息和交通缓冲。':'景点间预留交通缓冲，避免连续赶路。',
        rentalEnabled?'自驾当天请提前确认停车场与限行规则。':'夜间返程优先选择网约车或地铁主线。',
      ],
    }
  })
}

function buildMoment(key:string,period:string,time:string,activity:any,image:string,tags:string[]){
  return {
    key,
    period,
    time:activity?.time||time,
    title:activity?.title||'城市精选体验',
    description:activity?.description||'保留目的地代表性体验，同时控制步行和换乘压力。',
    tags:activity?.tags?.length?activity.tags:tags,
    cost:Number(activity?.cost||0),
    image,
  }
}
</script>

<template>
  <div class="ai-workspace">
    <div class="container builder-container">
      <NaturalLanguageInputCard
        v-if="step==='INPUT'||step==='ANALYZED'||step==='QUOTE_SELECT'"
        v-model="userInput"
        :form="form"
        :show-form="showForm"
        :loading="analyzing"
        :preference-options="preferenceOptions"
        :suggestions="result?.status==='NEED_DESTINATION_CHOICE'?result.destinationSuggestions:[]"
        :questions="pendingQuestions"
        :follow-up-answers="followUpAnswers"
        @update:show-form="showForm=$event"
        @update:follow-up-answer="updateFollowUpAnswer"
        @analyze="analyze"
        @submit-follow-up="submitFollowUp"
        @choose-destination="chooseDestination"
        @apply-example="applyExample"
      />

      <RequirementSummaryBar
        v-if="ready&&(step==='ANALYZED'||step==='QUOTE_SELECT')"
        :requirement="activeRequirement"
        :route-mode="routeMode"
        :has-rental="hasRental"
        @edit="step='INPUT';showForm=true"
        @continue="continueFromSummary"
      />

      <RentalQuoteDeck
        v-if="step==='QUOTE_SELECT'"
        :quotes="quoteOptions"
        :selected-id="selectedQuoteId"
        @select="selectedQuoteId=$event"
        @continue="startDayBuilding"
      />

      <section v-if="generating" class="builder-loading builder-card">
        <span><el-icon><Loading class="is-loading"/></el-icon></span>
        <h2>正在逐日生成行程</h2>
        <p>PlanGo 正在整理路线、餐饮、交通、预算和 AI 提醒。</p>
      </section>

      <div class="day-builder-anchor"></div>
      <section v-if="step==='DAY_BUILDING'&&!generating&&currentDay" class="day-builder">
        <header class="trip-summary builder-card">
          <img :src="coverForDestination(activeRequirement.destination)" alt="trip cover">
          <div class="summary-title">
            <h2>{{ activeRequirement.destination }} {{ activeRequirement.days }} 日漫游</h2>
            <p>{{ activeRequirement.preferences.join(' · ') || '自然人文与美食之旅' }}</p>
          </div>
          <div class="summary-cell"><small>目的地</small><b>{{ activeRequirement.destination }}</b></div>
          <div class="summary-cell"><small>行程路线</small><b>核心城区 → 周边 → 核心城区</b></div>
          <div class="summary-cell"><small>天数</small><b>{{ activeRequirement.days }} 天</b></div>
          <div class="summary-cell"><small>人数</small><b>{{ activeRequirement.peopleCount }} 人</b></div>
          <div class="summary-cell"><small>租车套餐</small><b>{{ selectedQuote?.name || '未选择' }}</b></div>
          <div class="progress-cell">
            <i :style="progressStyle"></i>
            <div><small>行程确认进度</small><b>已确认 {{ lockedCount }} / {{ days.length }} 天</b><span>继续完善，行程更完整</span></div>
          </div>
        </header>

        <div class="builder-main">
          <TripProgressRail :days="days" :current-day="currentDay.day"/>
          <DayPlanCard
            :day="currentDay"
            :selected-quote="selectedQuote"
            :confirming="confirming"
            @confirm="confirmCurrentDay"
            @regenerate="regenerateCurrentDay"
            @revise="reviseVisible=true"
          />
        </div>
      </section>

      <FinalReviewPanel
        v-if="step==='FINAL_REVIEW'||step==='ORDER_CREATED'||step==='PAID'"
        :data="{requirement:activeRequirement,days,selectedQuote}"
        :saving="saving"
        :order-created="orderCreated"
        :paid="paid"
        @create-order="createOrder"
        @sandbox-pay="sandboxPay"
        @back="step='DAY_BUILDING'"
      />

      <el-dialog v-model="reviseVisible" title="告诉 AI 怎么改" width="520px">
        <el-input v-model="reviseText" type="textarea" :rows="5" resize="none" placeholder="例如：下午太累了，换成轻松一点；午餐想吃本地老字号；减少步行距离。"/>
        <template #footer>
          <el-button @click="reviseVisible=false">取消</el-button>
          <el-button type="primary" @click="submitRevision">提交调整</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.ai-workspace{min-height:calc(100vh - 72px);position:relative;padding:26px 0 80px;background:radial-gradient(circle at 14% 0%,rgba(37,99,235,.055),transparent 30%),radial-gradient(circle at 86% 2%,rgba(5,150,105,.045),transparent 26%),linear-gradient(180deg,#fff 0%,#f7f9fc 42%,#f5f7fa 100%);overflow:hidden}.ai-workspace:before{content:"";position:fixed;inset:72px 0 0;pointer-events:none;opacity:.08;background-image:linear-gradient(rgba(100,116,139,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.18) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to bottom,#000 0%,transparent 70%)}.builder-container{position:relative;z-index:1;display:grid;gap:18px;max-width:1240px}.builder-card{background:#fff;border:1px solid rgba(230,234,240,.95);border-radius:24px;box-shadow:0 16px 48px rgba(15,23,42,.06)}.builder-loading{padding:42px;text-align:center}.builder-loading span{width:58px;height:58px;border-radius:18px;display:grid;place-items:center;margin:0 auto 16px;color:#2563eb;background:#eff6ff;font-size:28px}.builder-loading h2{margin:0;color:#172033}.builder-loading p{margin:8px 0 0;color:#64748b}.day-builder{display:grid;gap:18px}.trip-summary{display:grid;grid-template-columns:150px 1.35fr repeat(5,minmax(96px,.75fr)) 210px;gap:0;align-items:center;padding:16px;overflow:hidden}.trip-summary img{width:136px;height:82px;border-radius:16px;object-fit:cover}.summary-title{padding-right:22px;border-right:1px solid var(--line)}.summary-title h2{margin:0;color:#111827;font-size:25px}.summary-title p{margin:7px 0 0;color:#64748b}.summary-cell{height:64px;display:flex;flex-direction:column;justify-content:center;align-items:center;border-right:1px solid var(--line);padding:0 12px;text-align:center}.summary-cell small,.progress-cell small{color:#8a96a8}.summary-cell b,.progress-cell b{margin-top:6px;color:#182235}.progress-cell{display:flex;align-items:center;gap:12px;padding-left:20px}.progress-cell i{width:48px;height:48px;border-radius:50%;position:relative;flex:0 0 48px}.progress-cell i:after{content:"";position:absolute;inset:8px;border-radius:50%;background:#fff}.progress-cell div{display:flex;flex-direction:column}.progress-cell span{margin-top:5px;color:#8a96a8;font-size:12px}.builder-main{display:grid;grid-template-columns:280px minmax(0,1fr);gap:22px;align-items:start}@media(max-width:1180px){.trip-summary{grid-template-columns:120px 1fr 1fr 1fr}.summary-title{border-right:0}.summary-cell{border-right:0;align-items:flex-start}.progress-cell{grid-column:1/-1;padding:12px 0 0}.builder-main{grid-template-columns:1fr}}@media(max-width:760px){.ai-workspace{padding-top:16px}.trip-summary{grid-template-columns:1fr}.trip-summary img{width:100%;height:160px}.summary-title,.summary-cell,.progress-cell{padding:10px 0;align-items:flex-start;text-align:left}}
</style>
