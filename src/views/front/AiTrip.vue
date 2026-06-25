<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { aiApi, tripApi } from '../../api'
import DayPlanCard from '../../components/trip-builder/DayPlanCard.vue'
import FinalReviewPanel from '../../components/trip-builder/FinalReviewPanel.vue'
import RentalQuoteDeck from '../../components/trip-builder/RentalQuoteDeck.vue'
import RequirementSummaryBar from '../../components/trip-builder/RequirementSummaryBar.vue'
import TripRouteMap, { type TripMapPlace } from '../../components/trip-builder/TripRouteMap.vue'
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
const needsMoreInfo=computed(()=>step.value==='INPUT'&&pendingQuestions.value.length>0)
const landingMode=computed(()=>step.value==='INPUT'&&!needsMoreInfo.value)
const hasRental=computed(()=>{
  const text=`${userInput.value} ${form.preferences.join(' ')}`
  return /自驾|租车|落地|取车|还车|多城市|江浙沪|周边/.test(text)
})
const routeMode=computed(()=>hasRental.value?(userInput.value.includes('落地')?'出行方式：落地租车':'路线模式：租车自驾'):'城市轻松游')
const selectedQuote=computed(()=>quoteOptions.value.find(item=>item.id===selectedQuoteId.value)||quoteOptions.value[0]||null)
const currentDay=computed(()=>days.value[currentDayIndex.value])
const lockedCount=computed(()=>days.value.filter(day=>day.status==='locked').length)
const progressStyle=computed(()=>({background:`conic-gradient(#10b981 ${Math.round((lockedCount.value/Math.max(days.value.length,1))*360)}deg,#e5eaf0 0deg)`}))
const currentMapPlaces=computed<TripMapPlace[]>(()=>currentDay.value?currentDay.value.moments.map((moment,index)=>({
  title:moment.title,
  time:moment.time.split('-')[0],
  desc:moment.description,
  ...coordinateForPlace(moment.title,activeRequirement.value.destination,index),
})):[])

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

const fieldValue=(field:string)=>{
  if(followUpAnswers[field])return followUpAnswers[field]
  const value=(form as any)[field]
  return Array.isArray(value)?value.join('、'):value?String(value):''
}

const answerOptions=(field:string)=>{
  const options:Record<string,string[]>={
    departure:['上海','杭州','成都','还不确定'],
    destination:['杭州','成都','重庆','西安'],
    days:['2天','3天','4天','5天'],
    peopleCount:['1人','2人','3人','4人'],
    budget:['2000以内','4000以内','6000以内','还不确定'],
    pace:['轻松','适中','紧凑','不要太累'],
    travelDate:['上午到','中午到','下午到','晚上到'],
    transport:['打车 / 网约车','地铁 / 公交','租车自驾','AI 帮我安排'],
    accommodation:['市中心区域','景点附近','交通方便','还没确定'],
  }
  return options[field]||['还不确定','AI 帮我安排']
}

const chooseFollowUpOption=(field:string,value:string)=>{
  updateFollowUpAnswer(field,value)
  if(field==='days')form.days=Number(value.match(/\d+/)?.[0]||form.days)
  if(field==='peopleCount')form.peopleCount=Number(value.match(/\d+/)?.[0]||form.peopleCount)
  if(field==='destination')form.destination=value
  if(field==='departure')form.departure=value
  if(field==='budget')form.budget=Number(value.match(/\d+/)?.[0]||form.budget)
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
    if(ready.value){
      if(hasRental.value){
        step.value='QUOTE_SELECT'
      }else{
        await startDayBuilding()
      }
    }else{
      step.value='INPUT'
    }
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
  }catch(error){
    const fallbackPlan=createFallbackTripPlan(result.value.requirement)
    plan.value=fallbackPlan
    recommendation.value=null
    days.value=createBuilderDays(fallbackPlan,result.value.requirement,!!selectedQuote.value)
    ElMessage.warning('生成接口暂不可用，已先展示演示行程样式')
  }finally{
    currentDayIndex.value=days.value.findIndex(day=>day.status==='active')
    if(currentDayIndex.value<0)currentDayIndex.value=0
    setTimeout(()=>document.querySelector('.day-builder')?.scrollIntoView({behavior:'smooth',block:'start'}),100)
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

function coordinateForPlace(title:string,destination:string,index:number){
  const fallback:Record<string,{lng:number;lat:number}[]>={
    杭州:[
      {lng:120.1546,lat:30.2587},
      {lng:120.1719,lat:30.2425},
      {lng:120.1009,lat:30.2401},
      {lng:120.1691,lat:30.2453},
    ],
    成都:[
      {lng:104.0588,lat:30.6593},
      {lng:104.0562,lat:30.6721},
      {lng:104.0807,lat:30.6574},
      {lng:104.0496,lat:30.6426},
    ],
    西安:[
      {lng:108.946,lat:34.255},
      {lng:108.9402,lat:34.261},
      {lng:108.9398,lat:34.2655},
      {lng:108.9642,lat:34.2183},
    ],
    重庆:[
      {lng:106.5743,lat:29.5637},
      {lng:106.5845,lat:29.5566},
      {lng:106.5768,lat:29.5568},
      {lng:106.5494,lat:29.5569},
    ],
  }
  const named:Record<string,{lng:number;lat:number}>={
    西湖断桥:{lng:120.1546,lat:30.2587},
    河坊街:{lng:120.1719,lat:30.2425},
    灵隐寺:{lng:120.1009,lat:30.2401},
    南宋御街:{lng:120.1691,lat:30.2453},
    杭州城市地标:{lng:120.1546,lat:30.2587},
    杭州特色餐饮街区:{lng:120.1719,lat:30.2425},
    杭州历史文化街区:{lng:120.1691,lat:30.2453},
    夜间漫步:{lng:120.1691,lat:30.2453},
  }
  const match=Object.keys(named).find(key=>title.includes(key))
  if(match)return named[match]
  const city=Object.keys(fallback).find(key=>destination.includes(key))
  return (city?fallback[city]:fallback.重庆)[index%4]
}

function createFallbackTripPlan(requirement:Requirement):TripPlan{
  const titles=['抵达适应 + 城市初印象','自然风光 + 轻户外体验','城市慢生活 + 返程预留']
  const spots=[
    [`${requirement.destination}城市地标`,`${requirement.destination}特色餐饮街区`,`${requirement.destination}历史文化街区`,'夜间漫步'],
    ['湖山风景区','本地风味餐厅','博物馆 / 展览馆','江边夜景'],
    ['老街咖啡馆','伴手礼街区','城市公园','返程准备'],
  ]
  return {
    title:`${requirement.destination} ${requirement.days} 日漫游`,
    destination:requirement.destination,
    days:requirement.days,
    summary:'演示行程用于先确认页面效果，后续可替换为后端真实生成结果。',
    accommodation:`${requirement.destination}核心城区舒适酒店`,
    tips:['当前为前端演示数据。'],
    budgetSummary:{transport:360,hotel:1200,food:900,tickets:480,total:2940},
    dailyPlans:Array.from({length:Math.max(1,requirement.days)},(_,index)=>{
      const dayNo=index+1
      const route=spots[index%spots.length]
      return {
        day:dayNo,
        title:titles[index%titles.length],
        food:[route[1]],
        budget:980,
        activities:[
          {time:'09:00',title:route[0],description:'从轻松、有代表性的地点开始，先建立城市印象。',tags:['景点','慢游'],cost:0},
          {time:'14:30',title:route[2],description:'下午安排文化或自然体验，控制步行强度。',tags:['文化体验','轻松'],cost:80},
          {time:'19:00',title:route[3],description:'晚餐后散步看夜景，结束充实但不赶的一天。',tags:['夜景','散步'],cost:60},
        ],
      }
    }),
  }
}
</script>

<template>
  <div class="ai-workspace" :class="{ 'planning-landing': landingMode }">
    <section v-if="landingMode" class="trip-hero">
      <div class="hero-copy">
        <h1>下一段旅程，想怎么开始？</h1>
        <p>告诉我目的地、天数、预算和偏好，我来帮你规划完整行程</p>
      </div>

      <div class="hero-input-shell">
        <textarea
          v-model="userInput"
          maxlength="300"
          placeholder="例如：带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算4000以内。"
        />
        <span>{{ userInput.length }}/300</span>
        <button :disabled="analyzing" @click="analyze">
          <el-icon><Loading v-if="analyzing" class="is-loading"/><MagicStick v-else/></el-icon>
          {{ analyzing ? '分析中' : '帮我规划' }}
        </button>
      </div>

      <div class="quick-fields">
        <button><b>目的地</b><span>去哪儿?</span></button>
        <button><b>天数</b><span>玩几天?</span></button>
        <button><b>人数</b><span>几个人?</span></button>
        <button><b>预算</b><span>预算多少?</span></button>
        <button><b>出行方式</b><span>怎么出行?</span></button>
        <button><b>旅行节奏</b><span>轻松 / 适中 / 紧凑</span></button>
      </div>

      <section class="inspiration-block">
        <h3>灵感模板</h3>
        <div class="inspiration-grid">
          <button @click="applyExample('带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化')"><span>父母慢游</span><b>详实细致松弛</b><small>3-5天</small></button>
          <button @click="applyExample('想去成都玩4天，重点吃美食看夜景，节奏轻松一点')"><span>烟火气</span><b>浪漫周末游</b><small>2-3天</small></button>
          <button @click="applyExample('想在城市里玩3天，喜欢美食、历史和夜景')"><span>城市印象</span><b>城市转转乐</b><small>2-4天</small></button>
          <button @click="applyExample('亲子出游3天，想轻松、有趣、不要太赶')"><span>亲子时光</span><b>亲子家庭游</b><small>3-6天</small></button>
          <button @click="applyExample('想来一趟美食之旅，吃当地特色，顺便逛逛')"><span>美食探索</span><b>美食之旅</b><small>2-4天</small></button>
          <button @click="applyExample('周边自驾3天，想住舒服一点，适合拍照和放松')"><span>自驾游</span><b>自驾探索</b><small>3-7天</small></button>
        </div>
      </section>

      <div v-if="result?.status==='NEED_DESTINATION_CHOICE'" class="hero-followup destination-choice">
        <span>你可能想去</span>
        <button
          v-for="item in result.destinationSuggestions"
          :key="item.name"
          @click="chooseDestination(item.name)"
        >
          {{ item.name }}
        </button>
      </div>
    </section>

    <section v-if="needsMoreInfo" class="followup-workspace">
      <div class="progress-steps">
        <span>输入需求 ✓</span><span>AI 解析需求 ✓</span><b>3 完善信息</b><span>4 生成行程</span>
      </div>
      <div class="followup-grid">
        <section class="assistant-card">
          <div class="bot-avatar">AI</div>
          <h3>PlanGo AI 助手</h3>
          <p>我已经理解你的基本需求啦！还需要确认几个问题，帮你规划得更精准。</p>
          <div class="question-list">
            <article v-for="(question,index) in pendingQuestions" :key="question.field">
              <i>{{ index + 1 }}</i>
              <h4>{{ question.question }}</h4>
              <div>
                <button
                  v-for="option in answerOptions(question.field)"
                  :key="option"
                  :class="{ active: followUpAnswers[question.field]===option }"
                  @click="chooseFollowUpOption(question.field, option)"
                >
                  {{ option }}
                </button>
              </div>
              <input
                :value="followUpAnswers[question.field]"
                placeholder="也可以直接输入"
                @input="updateFollowUpAnswer(question.field, ($event.target as HTMLInputElement).value)"
              >
            </article>
          </div>
          <button class="skip-btn" @click="submitFollowUp">跳过这些问题，AI 默认安排</button>
        </section>
        <section class="requirement-card">
          <header><h3>需求总览</h3><button @click="step='INPUT'">编辑</button></header>
          <div class="requirement-grid">
            <div><span>目的地</span><b>{{ activeRequirement.destination || fieldValue('destination') || '待确认' }}</b></div>
            <div><span>出行天数</span><b>{{ activeRequirement.days || fieldValue('days') || '待确认' }}</b></div>
            <div><span>出行人数</span><b>{{ activeRequirement.peopleCount || fieldValue('peopleCount') || '待确认' }}</b></div>
            <div><span>预算范围</span><b>{{ activeRequirement.budget ? `¥${activeRequirement.budget}以内` : fieldValue('budget') || '待确认' }}</b></div>
            <div><span>旅行节奏</span><b>{{ activeRequirement.pace || fieldValue('pace') || '轻松' }}</b></div>
            <div><span>兴趣偏好</span><b>{{ activeRequirement.preferences.join('、') || '待确认' }}</b></div>
          </div>
          <p>AI 理解的需求</p>
          <blockquote>{{ userInput }}</blockquote>
          <button class="generate-day-btn" @click="submitFollowUp">信息够了，生成 Day 01 行程 →</button>
        </section>
      </div>
    </section>

    <div class="container builder-container">
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

      <section v-if="step==='DAY_BUILDING'&&!generating&&currentDay" class="day-builder">
        <header class="trip-summary builder-card">
          <img :src="coverForDestination(activeRequirement.destination)" alt="trip cover">
          <div class="summary-title">
            <h2>{{ activeRequirement.destination }} {{ activeRequirement.days }} 日漫游</h2>
            <p>{{ activeRequirement.preferences.join(' · ') || '自然人文与美食之旅' }}</p>
          </div>
          <div class="summary-cell"><small>目的地</small><b>{{ activeRequirement.destination }}</b></div>
          <div class="summary-cell route-cell"><small>行程路线</small><b>核心城区 → 周边</b></div>
          <div class="summary-cell"><small>天数</small><b>{{ activeRequirement.days }} 天</b></div>
          <div class="summary-cell"><small>人数</small><b>{{ activeRequirement.peopleCount }} 人</b></div>
          <div class="summary-cell"><small>租车套餐</small><b>{{ selectedQuote?.name || '未选择' }}</b></div>
          <div class="progress-cell">
            <i :style="progressStyle"></i>
            <div><small>行程确认进度</small><b>已确认 {{ lockedCount }} / {{ days.length }} 天</b><span>继续完善，行程更完整</span></div>
          </div>
        </header>

        <div class="builder-main">
          <DayPlanCard
            :day="currentDay"
            :selected-quote="selectedQuote"
            :confirming="confirming"
            @confirm="confirmCurrentDay"
            @regenerate="regenerateCurrentDay"
            @revise="reviseVisible=true"
          />
          <div class="map-workbench">
            <TripRouteMap :places="currentMapPlaces" :tip="currentDay.tips[1]"/>
            <section class="map-control-panel builder-card">
              <div class="map-progress-dots" aria-label="行程进度">
                <template v-for="(day,index) in days" :key="day.day">
                  <span :class="{ active: day.day===currentDay.day, locked: day.status==='locked' }">{{ String(day.day).padStart(2,'0') }}</span>
                  <i v-if="index<days.length-1"></i>
                </template>
              </div>
              <div class="map-actions">
                <button @click="regenerateCurrentDay">
                  <b>重新生成这一天</b>
                  <small>换个思路，重新规划</small>
                </button>
                <button @click="reviseVisible=true">
                  <b>告诉 AI 怎么改</b>
                  <small>调整景点 / 餐饮 / 节奏</small>
                </button>
                <el-button class="confirm-btn" type="primary" :loading="confirming" @click="confirmCurrentDay">确认 Day {{ String(currentDay.day).padStart(2,'0') }}</el-button>
              </div>
            </section>
          </div>
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
.ai-workspace {
  min-height: calc(100vh - 72px);
  position: relative;
  padding: 0 0 80px;
  overflow: hidden;
  background: #f5f7fa;
}

.ai-workspace.planning-landing{padding-top:0;background:radial-gradient(circle at 10% 45%,rgba(13,148,136,.08),transparent 24%),radial-gradient(circle at 88% 38%,rgba(37,99,235,.08),transparent 24%),linear-gradient(180deg,#f8fbff 0%,#eef6f8 100%)}

.trip-hero{min-height:calc(100vh - 72px);display:grid;justify-items:center;align-content:start;gap:18px;padding:34px 24px 58px;color:#172033;text-align:center}

.hero-copy {
  width: min(920px, 100%);
}

.hero-copy h1 {
  margin:0;
  font-size:34px;
  line-height:1.2;
  letter-spacing:0;
}

.hero-copy p {
  width: min(680px, 100%);
  margin: 16px auto 0;
  color:#607086;
  font-size:15px;
  line-height:1.7;
}

.hero-input-shell {
  width:min(920px,100%);
  min-height:128px;
  display: grid;
  grid-template-columns:minmax(0,1fr) 84px 120px;
  align-items:end;
  gap: 8px;
  padding:16px;
  border:1px solid #e3eaf2;
  border-radius:18px;
  background:#fff;
  box-shadow:0 18px 42px rgba(15,23,42,.08);
}

.hero-input-shell textarea {
  width: 100%;
  height: 94px;
  border: 0;
  outline: 0;
  padding:0;
  resize:none;
  color:#172033;
  background: transparent;
  font: inherit;
  font-size: 15px;
  line-height:1.65;
}

.hero-input-shell textarea::placeholder {
  color:#7b8798;
}

.hero-input-shell>span{color:#64748b;font-size:13px;align-self:center}
.hero-input-shell button,
.hero-examples button,
.hero-followup button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.hero-input-shell button {
  min-height: 42px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, rgba(0, 160, 150, .92), rgba(36, 116, 220, .92));
  box-shadow: 0 12px 26px rgba(3, 79, 121, .26);
  font-weight: 800;
  font-size: 14px;
}

.hero-input-shell button:disabled{cursor:wait;opacity:.72}
.quick-fields{width:min(940px,100%);display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:2px}.quick-fields button{border:1px solid #e7edf4;border-radius:12px;background:rgba(255,255,255,.76);box-shadow:0 10px 24px rgba(15,23,42,.05);height:58px;text-align:left;padding:10px 14px;color:#172033}.quick-fields b,.quick-fields span{display:block}.quick-fields b{font-size:14px}.quick-fields span{margin-top:4px;color:#7b8798;font-size:12px}.inspiration-block{width:min(1220px,100%);margin-top:14px;text-align:left}.inspiration-block h3{margin:0 0 12px;color:#172033}.inspiration-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.inspiration-grid button{height:150px;border:1px solid #e2e8f0;border-radius:10px;background:linear-gradient(180deg,#fff,#f8fafc);text-align:left;padding:14px;color:#172033;box-shadow:0 12px 30px rgba(15,23,42,.06);cursor:pointer}.inspiration-grid span{display:inline-block;border-radius:999px;background:#e6f7f3;color:#0f766e;padding:4px 8px;font-size:12px;font-weight:800}.inspiration-grid b{display:block;margin-top:42px;font-size:16px}.inspiration-grid small{display:block;margin-top:10px;color:#607086}

.followup-workspace{min-height:calc(100vh - 72px);padding:22px 48px 52px;background:linear-gradient(180deg,#f7fbff,#f5f7fa)}.progress-steps{display:flex;justify-content:center;gap:70px;color:#718096;font-size:13px;margin:0 0 18px}.progress-steps b{color:#0f766e}.followup-grid{display:grid;grid-template-columns:minmax(420px,1fr) minmax(460px,.95fr);gap:22px;max-width:1400px;margin:auto}.assistant-card,.requirement-card{border:1px solid #e6edf5;border-radius:18px;background:rgba(255,255,255,.92);box-shadow:0 18px 48px rgba(15,23,42,.07);padding:24px}.bot-avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#10233f;color:#fff;font-weight:900}.assistant-card h3,.requirement-card h3{margin:10px 0 6px;color:#172033}.assistant-card>p{margin:0 0 18px;color:#607086;line-height:1.7}.question-list{display:grid;gap:12px}.question-list article{position:relative;border:1px solid #edf1f5;border-radius:14px;background:#fff;padding:16px}.question-list i{position:absolute;left:-13px;top:18px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#0f9f8f;color:#fff;font-style:normal;font-weight:900}.question-list h4{margin:0 0 12px;color:#172033}.question-list article div{display:flex;gap:10px;flex-wrap:wrap}.question-list button{height:30px;border:1px solid #dce5ef;border-radius:999px;background:#fff;color:#526176;padding:0 17px;cursor:pointer}.question-list button.active{border-color:#0f9f8f;background:#ecfdf5;color:#0f766e}.question-list input{width:100%;height:36px;margin-top:10px;border:1px solid #e3eaf2;border-radius:10px;padding:0 12px;outline:0}.skip-btn,.generate-day-btn{width:100%;height:44px;border:0;border-radius:10px;background:linear-gradient(135deg,#0d9488,#10b981);color:#fff;font-weight:900;margin-top:16px;cursor:pointer}.requirement-card header{display:flex;justify-content:space-between;align-items:center}.requirement-card header button{border:1px solid #e3eaf2;background:#fff;border-radius:8px;height:30px;padding:0 12px;color:#475569}.requirement-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.requirement-grid div{border:1px solid #edf1f5;border-radius:12px;padding:12px;background:#fbfdff}.requirement-grid span,.requirement-grid b{display:block}.requirement-grid span{color:#7b8798;font-size:12px}.requirement-grid b{margin-top:6px;color:#172033}.requirement-card p{color:#607086}.requirement-card blockquote{margin:0;border:0;border-radius:12px;background:#f8fafc;padding:15px;color:#475569;line-height:1.7}

.hero-followup {
  width: min(720px, 100%);
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(12, 18, 24, .42);
  backdrop-filter: blur(16px);
}

.hero-followup label {
  display: grid;
  gap: 8px;
  text-align: left;
}

.hero-followup label span,
.destination-choice > span {
  color: rgba(255, 255, 255, .78);
  font-size: 14px;
}

.hero-followup input {
  height: 42px;
  border: 1px solid rgba(255, 255, 255, .24);
  border-radius: 6px;
  padding: 0 12px;
  outline: 0;
  color: #fff;
  background: rgba(255, 255, 255, .08);
}

.hero-followup button {
  height: 40px;
  border-radius: 6px;
  padding: 0 16px;
  color: #0f2824;
  background: rgba(255, 255, 255, .88);
  font-weight: 700;
}

.destination-choice {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.builder-container {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 18px;
  width: min(1760px, calc(100vw - 64px));
  max-width: none;
  padding-top: 20px;
}

.planning-landing .builder-container {
  margin-top: -58px;
}

.builder-card {
  background: #fff;
  border: 1px solid rgba(230, 234, 240, .95);
  border-radius: 18px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, .06);
}

.builder-loading {
  padding: 42px;
  text-align: center;
}

.builder-loading span {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 28px;
}

.builder-loading h2 {
  margin: 0;
  color: #172033;
}

.builder-loading p {
  margin: 8px 0 0;
  color: #64748b;
}

.day-builder {
  display: grid;
  gap: 18px;
}

.trip-summary {
  display: grid;
  grid-template-columns: 158px 1.55fr repeat(5, minmax(96px, .72fr)) 220px;
  gap: 0;
  align-items: center;
  padding: 14px 16px;
  overflow: hidden;
}

.trip-summary img {
  width: 136px;
  height: 82px;
  border-radius: 12px;
  object-fit: cover;
}

.summary-title {
  padding-right: 22px;
  border-right: 1px solid var(--line);
}

.summary-title h2 {
  margin: 0;
  color: #111827;
  font-size: 25px;
}

.summary-title p {
  margin: 7px 0 0;
  color: #64748b;
}

.summary-cell {
  height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-right: 1px solid var(--line);
  padding: 0 12px;
  text-align: center;
}

.summary-cell small,
.progress-cell small {
  color: #8a96a8;
}

.summary-cell b,
.progress-cell b {
  margin-top: 6px;
  color: #182235;
}

.progress-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 20px;
}

.progress-cell i {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  position: relative;
  flex: 0 0 48px;
}

.progress-cell i:after {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: #fff;
}

.progress-cell div {
  display: flex;
  flex-direction: column;
}

.progress-cell span {
  margin-top: 5px;
  color: #8a96a8;
  font-size: 12px;
}

.builder-main {
  display: grid;
  grid-template-columns: minmax(560px, 620px) minmax(640px, 1fr);
  gap: 16px;
  align-items: start;
}

.map-workbench {
  display: grid;
  gap: 14px;
}

.map-control-panel {
  padding: 14px 18px;
  display: grid;
  gap: 12px;
}

.map-progress-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 32px;
}

.map-progress-dots span {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #718096;
  background: #eef3f8;
  border: 1px solid #dce4ed;
  font-size: 12px;
  font-weight: 900;
}

.map-progress-dots span.active,
.map-progress-dots span.locked {
  color: #fff;
  border-color: #0f9f8f;
  background: #0f9f8f;
  box-shadow: 0 12px 24px rgba(15, 159, 143, .2);
}

.map-progress-dots i {
  width: 58px;
  height: 2px;
  border-radius: 99px;
  background: #cbd5e1;
  position: relative;
}

.map-progress-dots i:after {
  content: "";
  position: absolute;
  right: -2px;
  top: -4px;
  width: 9px;
  height: 9px;
  border-top: 2px solid #cbd5e1;
  border-right: 2px solid #cbd5e1;
  transform: rotate(45deg);
}

.map-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 180px;
  gap: 12px;
  align-items: center;
}

.map-actions button {
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: #f8fafc;
  color: #172033;
  text-align: left;
  padding: 0 14px;
  cursor: pointer;
}

.map-actions button:hover {
  background: #f1f5f9;
}

.map-actions b,
.map-actions small {
  display: block;
}

.map-actions b {
  font-size: 14px;
}

.map-actions small {
  margin-top: 2px;
  color: #7b8798;
  font-size: 12px;
}

.map-actions .confirm-btn {
  height: 44px;
  border: 0!important;
  border-radius: 12px!important;
  background: linear-gradient(135deg,#0d9488,#10b981)!important;
  color: #fff!important;
  font-weight: 900!important;
}

@media (max-width: 1180px) {
  .trip-summary {
    grid-template-columns: 120px 1fr 1fr 1fr;
  }

  .summary-title {
    border-right: 0;
  }

  .summary-cell {
    border-right: 0;
    align-items: flex-start;
  }

  .progress-cell {
    grid-column: 1/-1;
    padding: 12px 0 0;
  }

  .builder-main { grid-template-columns: 1fr; }
  .map-actions { grid-template-columns: 1fr; }
  .map-progress-dots i { width: 42px; }
}

@media (max-width: 760px) {
  .trip-hero {
    padding: 54px 16px 72px;
  }

  .hero-copy h1 {
    font-size: 42px;
    white-space: normal;
  }

  .hero-copy p {
    font-size: 15px;
  }

  .hero-input-shell {
    grid-template-columns: 1fr;
  }
  .quick-fields,.inspiration-grid,.followup-grid,.requirement-grid{grid-template-columns:1fr}

  .builder-container {
    width: calc(100vw - 32px);
    padding-top: 16px;
  }

  .trip-summary {
    grid-template-columns: 1fr;
  }

  .trip-summary img {
    width: 100%;
    height: 160px;
  }

  .summary-title,
  .summary-cell,
  .progress-cell {
    padding: 10px 0;
    align-items: flex-start;
    text-align: left;
  }
}
</style>
