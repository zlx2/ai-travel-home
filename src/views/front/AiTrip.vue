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
import type { AnalyzeResult, RecommendationContext, Requirement, TripDay, TripPlan } from '../../types'
import { homeImage } from '../../utils/homeImages'

const route=useRoute()
const userInput=ref('带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算在4000元以内。')
const showForm=ref(false)
const analyzing=ref(false)
const generating=ref(false)
const generateElapsed=ref(0)
const generateProgress=ref(1)
const generateProgressLabel=ref('准备生成行程')
let generateTimer:number|undefined
const saving=ref(false)
const confirming=ref(false)
const orderCreated=ref(false)
const paid=ref(false)
const result=ref<AnalyzeResult|null>(null)
const followUpAnswers=reactive<Record<string,string>>({})
const plan=ref<TripPlan|null>(null)
const recommendation=ref<RecommendationContext|null>(null)
const generationSessionId=ref('')
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
  ...(moment.lng&&moment.lat?{lng:moment.lng,lat:moment.lat}:coordinateForPlace(moment.title,activeRequirement.value.destination,index)),
})):[])

const updateRouteStats=(stats:{distanceKm:number;drivingMinutes:number})=>{
  const day=currentDay.value
  if(!day)return
  const visitMinutes=day.moments.reduce((sum,moment)=>sum+durationToMinutes(moment.suggestedDuration),0)
  const totalMinutes=visitMinutes+stats.drivingMinutes
  day.rental.mileage=stats.distanceKm
  day.rental.duration=`约 ${Math.max(1,Math.round(totalMinutes/30)/2)} 小时`
}

function durationToMinutes(value?:string){
  if(!value)return 90
  const hour=value.match(/([\d.]+)\s*小时/)
  if(hour)return Number(hour[1])*60
  const minute=value.match(/(\d+)\s*分钟/)
  return minute?Number(minute[1]):90
}

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
  if(!userInput.value.trim()&&!form.destination)return ElMessage.warning('先描述一下你想去哪里、怎么玩')
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
  startGenerateTimer()
  step.value='DAY_BUILDING'
  try{
    const data=await aiApi.generateStream(result.value.conversationId,result.value.requirement,event=>{
      if(event.label)generateProgressLabel.value=event.label
      if(typeof event.progress==='number')generateProgress.value=event.progress
    })
    assertFirstDayGenerated(data.tripPlan)
    generationSessionId.value=data.generationSessionId||''
    plan.value=data.tripPlan
    recommendation.value=data.recommendationContext||null
    const firstDays=createBuilderDays(data.tripPlan,result.value.requirement,hasRental.value&&!!selectedQuote.value)
    days.value=buildInitialBuilderDays(firstDays,result.value.requirement,hasRental.value&&!!selectedQuote.value)
  }catch(error){
    plan.value=null
    recommendation.value=null
    days.value=[]
    step.value='INPUT'
    ElMessage.error(error instanceof Error?error.message:'行程生成失败，请稍后重试')
  }finally{
    stopGenerateTimer()
    currentDayIndex.value=days.value.findIndex(day=>day.status==='active')
    if(currentDayIndex.value<0)currentDayIndex.value=0
    setTimeout(()=>document.querySelector('.day-builder')?.scrollIntoView({behavior:'smooth',block:'start'}),100)
    generating.value=false
  }
}

function startGenerateTimer(){
  stopGenerateTimer()
  generateElapsed.value=0
  generateProgress.value=1
  generateProgressLabel.value='开始生成行程'
  generateTimer=window.setInterval(()=>{
    generateElapsed.value+=1
  },1000)
}

function stopGenerateTimer(){
  if(generateTimer){
    window.clearInterval(generateTimer)
    generateTimer=undefined
  }
}

function assertFirstDayGenerated(tripPlan:TripPlan){
  if(!tripPlan?.dailyPlans?.length){
    throw new Error('行程生成结束但没有返回第 1 天')
  }
  const first=tripPlan.dailyPlans[0]
  if(!first.activities?.length){
    throw new Error('第 1 天景点不足：至少需要 1 个')
  }
}

const confirmCurrentDay=async()=>{
  if(!currentDay.value)return
  confirming.value=true
  try{
    if(!currentDay.value.moments.length){
      await ensureDayGenerated(currentDayIndex.value)
    }
    days.value[currentDayIndex.value]={...currentDay.value,status:'locked'}
    const next=currentDayIndex.value+1
    if(next<days.value.length){
      currentDayIndex.value=next
      await ensureDayGenerated(next)
    }else{
      step.value='FINAL_REVIEW'
    }
  }catch(error){
    ElMessage.error(error instanceof Error?error.message:'单日行程生成失败，请稍后重试')
  }finally{
    confirming.value=false
  }
}

const selectDay=async(index:number)=>{
  if(index<0||index>=days.value.length||index===currentDayIndex.value)return
  currentDayIndex.value=index
  try{
    await ensureDayGenerated(index)
  }catch(error){
    ElMessage.error(error instanceof Error?error.message:'单日行程生成失败，请稍后重试')
  }
}

const regenerateCurrentDay=async()=>{
  if(!currentDay.value)return
  const index=currentDayIndex.value
  days.value[index]={...days.value[index],status:'generating'}
  try{
    await ensureDayGenerated(index,true)
    ElMessage.success(`Day ${String(days.value[index].day).padStart(2,'0')} 已重新生成`)
  }catch(error){
    days.value[index]={...days.value[index],status:'active'}
    ElMessage.error(error instanceof Error?error.message:'重新生成失败，请稍后重试')
  }
}

const submitRevision=()=>{
  if(!reviseText.value.trim())return ElMessage.warning('先写下你希望怎么调整')
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
      departure:result.value.requirement.departure,
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
    ElMessage.success('行程已保存，订单已创建')
  }finally{
    saving.value=false
  }
}

const sandboxPay=()=>{
  if(!orderCreated.value)return ElMessage.info('请先创建订单')
  paid.value=true
  step.value='PAID'
  ElMessage.success('支付确认完成，行程已进入待出行状态')
}

function coverForDestination(destination:string){
  if(destination.includes('杭州'))return homeImage('hangzhou.jpg', true)
  if(destination.includes('成都'))return homeImage('chengdu.jpg', true)
  if(destination.includes('厦门'))return homeImage('xiamen.jpg', true)
  if(destination.includes('西安'))return homeImage('xian.jpg', true)
  if(destination.includes('云南'))return homeImage('yunnan.jpg', true)
  return homeImage('chongqing.jpg', true)
}

function createBuilderDays(tripPlan:TripPlan,requirement:Requirement,rentalEnabled:boolean):BuilderDay[]{
  const image=coverForDestination(requirement.destination)
  const byDay=new Map(tripPlan.dailyPlans.map(day=>[day.day,day]))
  return Array.from({length:requirement.days},(_,index)=>{
    const day=byDay.get(index+1)||emptyTripDay(index+1,requirement)
    const activities=day.activities.length?day.activities:[]
    const route=activities.map(item=>item.title.split('→')[0].trim()).filter(Boolean).slice(0,5)
    const tickets=day.estimatedCost?.tickets??Math.max(0,activities.reduce((sum,item)=>sum+(item.cost||0),0)*requirement.peopleCount)
    const foodCost=normalizeDailyFoodCost(day.estimatedCost?.food,requirement.peopleCount)
    const traffic=day.estimatedCost?.transport??requirement.peopleCount*40
    const other=0
    const dayFood=Array.isArray(day.food)?day.food:[day.food].filter(Boolean)
    const moments=activities.map((activity,activityIndex)=>buildMoment(`activity-${activityIndex}`,periodForIndex(activityIndex),timeForIndex(activityIndex),activity,image,['景点']))
    const travelPace=paceLabel(day.intensity||requirement.pace)
    return {
      day:day.day,
      title:polishDayTitle(day.title,day.day,requirement.destination,activities),
      subtitle:daySubtitle(day,activities,travelPace,rentalEnabled),
      intensity:day.intensity||requirement.pace,
      accommodation:day.accommodation||tripPlan.accommodation,
      diningArea:day.diningArea||dayFood.join('、'),
      status:index===0?'active':'pending',
      route,
      moments,
      foods:dayFood,
      budget:{
        tickets,
        food:foodCost,
        traffic,
        other,
        total:tickets+foodCost+traffic,
        foodSource:day.estimatedCost?.foodSource,
        transportSource:day.estimatedCost?.transportSource,
        excludesUnknownItems:day.estimatedCost?.excludesUnknownItems,
      },
      rental:{enabled:rentalEnabled,departure:`${requirement.destination}核心范围`,duration:'地图计算中',mileage:0,fuelCost:traffic},
      tips:uniqueTips([
        `今日节奏：${travelPace}`,
        day.diningArea||dayFood.length?`餐饮建议：${shortText(day.diningArea||dayFood.join('、'),18)}`:'',
        day.accommodation||tripPlan.accommodation?`住宿建议：${shortText(day.accommodation||tripPlan.accommodation,18)}`:'',
        ...(day.tips||[]).map(tip=>polishTip(tip)),
        rentalEnabled?'自驾当天请提前确认停车场与限行规则。':'夜间返程优先选择网约车或地铁主线。',
      ].filter(Boolean)).slice(0,3),
    }
  })
}

async function ensureDayGenerated(index:number,forceRegenerate=false){
  const target=days.value[index]
  if(!target||!result.value?.requirement)return
  if(!forceRegenerate&&target.moments.length>0){
    days.value[index]={
      ...target,
      status:target.status==='locked'?'locked':'active'
    }
    return
  }
  if(!generationSessionId.value)throw new Error('缺少行程生成会话，请重新生成')
  days.value[index]={...target,status:'generating',subtitle:'正在生成这一天的行程...'}
  const day=await aiApi.generateDay(generationSessionId.value,target.day,{requestMode:'USER',forceRegenerate,prefetchNext:!forceRegenerate})
  const oneDayPlan={...(plan.value||emptyTripPlan(result.value.requirement)),dailyPlans:[day]}
  const builtDays=createBuilderDays(oneDayPlan,result.value.requirement,hasRental.value&&!!selectedQuote.value)
  const builderDay=builtDays.find(item=>Number(item.day)===Number(target.day))
    ||builtDays.find(item=>Number(item.day)===Number(day.day))
    ||builtDays[index]
  if(!builderDay){
    throw new Error(`第 ${target.day} 天生成完成但前端组装失败`)
  }
  days.value[index]={...builderDay,status:'active'}
  if(plan.value){
    const existing=plan.value.dailyPlans.filter(item=>Number(item.day)!==Number(day.day))
    const merged=[...existing,day].sort((a,b)=>Number(a.day)-Number(b.day))
    plan.value={
      ...plan.value,
      dailyPlans:merged,
      budgetSummary:rebuildBudgetSummary(merged,plan.value.budgetSummary),
    }
  }
}

function rebuildBudgetSummary(dailyPlans:TripDay[],current?:TripPlan['budgetSummary']):TripPlan['budgetSummary']{
  const summary=dailyPlans.reduce((acc,day)=>{
    const cost=day.estimatedCost
    acc.food+=Number(cost?.food||0)
    acc.tickets+=Number(cost?.tickets||0)
    acc.transport+=Number(cost?.transport||0)
    return acc
  },{food:0,tickets:0,transport:0})
  return{
    food:summary.food,
    tickets:summary.tickets,
    transport:summary.transport,
    hotel:current?.hotel??null,
    total:summary.food+summary.tickets+summary.transport+Number(current?.hotel||0),
    excludesUnknownItems:dailyPlans.some(day=>day.estimatedCost?.excludesUnknownItems),
  }
}

function buildInitialBuilderDays(generatedDays:BuilderDay[],requirement:Requirement,rentalEnabled:boolean):BuilderDay[]{
  const total=Math.max(1,requirement.days||generatedDays.length||1)
  const result:BuilderDay[]=[...generatedDays]
  for(let dayNo=result.length+1;dayNo<=total;dayNo++){
    result.push(createPendingBuilderDay(dayNo,requirement,rentalEnabled))
  }
  return result.map((day,index)=>({...day,status:index===0?'active':day.status}))
}

function createPendingBuilderDay(dayNo:number,requirement:Requirement,rentalEnabled:boolean):BuilderDay{
  const image=coverForDestination(requirement.destination)
  return {
    day:dayNo,
    title:`${requirement.destination}第 ${dayNo} 天行程`,
    subtitle:'确认上一天后生成这一日安排',
    intensity:requirement.pace,
    accommodation:'',
    diningArea:'',
    status:'pending',
    route:[],
    moments:[],
    foods:[],
    budget:{tickets:0,food:0,traffic:0,other:0,total:0},
    rental:{enabled:rentalEnabled,departure:`${requirement.destination}核心范围`,duration:'待生成',mileage:0,fuelCost:0},
    tips:['确认上一天后，系统会生成这一日行程。'],
  }
}

function emptyTripPlan(requirement:Requirement):TripPlan{
  return{title:`${requirement.destination}${requirement.days}日旅行方案`,destination:requirement.destination,days:requirement.days,summary:'按天生成中',dailyPlans:[],accommodation:'',budgetSummary:{transport:0,hotel:null,food:0,tickets:0,total:0},tips:[]}
}

function emptyTripDay(dayNo:number,requirement:Requirement):TripDay{
  return{day:dayNo,title:`Day ${dayNo} 待生成`,activities:[],food:[],budget:0,intensity:requirement.pace,tips:['点击确认上一天后生成这一天行程']}
}

function daySubtitle(day:TripDay,activities:any[],travelPace:string,rentalEnabled:boolean){
  const count=activities.length
  const first=activities[0]?.title
  const last=activities[count-1]?.title
  if(count>=2)return `${first}等 ${count} 个地点 · ${travelPace}游览 · ${rentalEnabled?'自驾衔接':'步行 + 打车'}`
  if(first)return `${first} · ${travelPace}游览`
  return `${travelPace}游览 · 城市精选路线`
}

function shortText(value:string,limit:number){
  const text=String(value||'').replace(/\s+/g,'').replace(/适合住宿.*$/,'适合住宿')
  return text.length>limit?`${text.slice(0,limit)}...`:text
}

function uniqueTips(tips:string[]){
  const seen=new Set<string>()
  return tips.filter(tip=>{
    const normalized=tip.replace(/。$/,'')
    if(!normalized||seen.has(normalized))return false
    seen.add(normalized)
    return true
  })
}

function buildMoment(key:string,period:string,time:string,activity:any,image:string,tags:string[]){
  return {
    key,
    period,
    time:activity?.time||time,
    title:activity?.title||'城市精选体验',
    description:visitSummary(activity),
    tags:(activity?.tags?.length?activity.tags:tags).map(prettyTag).filter(Boolean),
    cost:Number(activity?.cost||0),
    costText:activity?.costText,
    image,
    suggestedDuration:activity?.suggestedDuration,
    suggestedDurationSource:activity?.suggestedDurationSource,
    transportSuggestion:activity?.transportSuggestion,
    reason:guideReason(activity),
    area:activity?.area,
    address:activity?.address,
    lng:activity?.lng,
    lat:activity?.lat,
    openingHours:activity?.openingHours,
    rating:activity?.rating,
    averageCost:activity?.averageCost,
    businessArea:activity?.businessArea,
    imageUrls:activity?.imageUrls,
  }
}

function normalizeDailyFoodCost(value:number|undefined,peopleCount:number){
  const people=Math.max(1,peopleCount||1)
  const fallback=people*70
  const amount=Number(value||fallback)
  return Math.min(Math.max(amount,people*45),people*110)
}

function visitSummary(activity:any){
  const title=activity?.title||activity?.name||'这里'
  const tags=(activity?.tags||[]).join(' ')
  const type=String(activity?.type||tags)
  const duration=activity?.suggestedDuration||activity?.suggestedDurationText
  const stay=duration?`建议留${duration.replace(/^约/,'约')}，`:'建议放慢一点逛，'
  if(/博物|历史|文化/.test(`${title} ${type}`))return `${title}适合先看展陈和城市故事，${stay}重点看代表性展品和脉络，不用赶场。`
  if(/湖|山|公园|湿地|自然|景观|风景/.test(`${title} ${type}`))return `${title}适合看风景和拍照，${stay}把时间留给湖岸、步道或观景点。`
  if(/街|巷|坊|古镇|步行/.test(`${title} ${type}`))return `${title}适合边走边看本地生活，${stay}顺路找小吃和街角店铺。`
  if(/夜|市场|美食/.test(`${title} ${type}`))return `${title}适合放在傍晚后体验，${stay}把晚餐和夜景一起安排。`
  return `${title}是当天的重点停留，${stay}优先看最有辨识度的部分，再按体力决定是否加逛周边。`
}

function guideReason(activity:any){
  return String(activity?.reason||activity?.recommendReason||activity?.description||'').trim()
}

function polishDayTitle(title:string|undefined,day:number,destination:string,activities:any[]=[]){
  if(!title)return `${destination}精选慢游`
  const text=activities.map(item=>[item.title,item.description,...(item.tags||[])].join(' ')).join(' ')
  const hasNature=/公园|湖|山|湿地|自然|风景|绿道|花园/.test(text)
  const hasCulture=/寺|宫|博物|历史|文化|街区|步行街|古/.test(text)
  let polished=title
    .replace('抵达适应 + 城市初印象','地标漫游与城市开场')
    .replace('城市慢生活 + 返程预留','慢游收束与从容返程')
    .replace('城市文化 + 夜市夜景','人文街区与夜色漫游')
    .replace('自然风光 + 轻户外体验','自然风光与轻户外')
    .replace('城市文化 + 美食探索','老城烟火与美食探索')
    .replace('经典景点 + 顺路美食','经典景点与顺路美食')
    .replace(/^Day\s*\d+\s*[:：-]?/i,`第 ${day} 天 `)
  if(polished.includes('自然风光')&&hasCulture&&!hasNature)polished='人文街区与城市漫游'
  if(polished.includes('自然风光')&&hasCulture&&hasNature)polished='城市绿意与人文慢游'
  return polished
}

function paceLabel(value?:string){
  if(value==='LIGHT')return'轻松'
  if(value==='TIGHT')return'紧凑'
  if(value==='NORMAL')return'适中'
  return value||'适中'
}

function prettyTag(tag:string){
  if(tag==='LIGHT')return'轻松'
  if(tag==='NORMAL')return'适中'
  if(tag==='TIGHT')return'紧凑'
  if(tag==='LANDMARK')return'地标'
  if(tag==='SCENIC')return'风景'
  if(tag==='MUSEUM')return'人文'
  return tag
}

function polishTip(tip:string){
  return tip
    .replace('当天强度：LIGHT','今日节奏：轻松')
    .replace('当天强度：NORMAL','今日节奏：适中')
    .replace('当天强度：TIGHT','今日节奏：紧凑')
    .replace('部分景点为兜底数据，后续应替换为高德真实 POI。','部分地点建议出行前再确认开放信息。')
    .replace('后端未返回当天餐饮区域建议。','')
    .replace('后端未返回住宿区域建议。','')
}

function periodForIndex(index:number){
  return ['上午','中午','下午','晚上'][index]||`第 ${index+1} 站`
}

function timeForIndex(index:number){
  return ['09:00','11:30','14:30','18:30'][index]||''
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

</script>

<template>
  <div class="ai-workspace" :class="{ 'planning-landing': landingMode }">
    <section v-if="landingMode" class="trip-hero product-hero">
      <div class="hero-shell">
        <div class="hero-panel">
          <p class="hero-kicker">PlanGo AI Trip Studio</p>
          <h1>把一句旅行想法，整理成可确认的每日行程</h1>
          <p class="hero-lead">写下城市、天数、同行人、预算和偏好。PlanGo 会先理解需求，再逐日生成路线、景点、交通和花费参考。</p>

          <div class="hero-input-shell">
            <textarea
              v-model="userInput"
              maxlength="300"
              placeholder="例如：带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算4000以内。"
            />
            <div class="hero-input-actions">
              <span>{{ userInput.length }}/300</span>
              <button :disabled="analyzing" @click="analyze">
                <el-icon><Loading v-if="analyzing" class="is-loading"/><MagicStick v-else/></el-icon>
                {{ analyzing ? '正在整理' : '开始规划' }}
              </button>
            </div>
          </div>

          <div class="quick-fields">
            <button><b>目的地</b><span>{{ form.destination || '自动识别' }}</span></button>
            <button><b>天数</b><span>{{ form.days }} 天</span></button>
            <button><b>人数</b><span>{{ form.peopleCount }} 人</span></button>
            <button><b>预算</b><span>¥{{ form.budget }} 内</span></button>
          </div>
        </div>

        <aside class="hero-preview">
          <img :src="homeImage('hangzhou.jpg', true)" alt="行程预览">
          <div class="preview-card">
            <span>示例行程</span>
            <b>杭州 3 日轻松慢游</b>
            <p>西湖漫步、历史街区、本地餐饮与舒适交通安排。</p>
          </div>
          <div class="preview-stats">
            <div><small>节奏</small><b>轻松</b></div>
            <div><small>确认方式</small><b>逐日确认</b></div>
            <div><small>地图</small><b>路线联动</b></div>
          </div>
        </aside>
      </div>

      <section class="inspiration-block">
        <div class="section-head">
          <h3>旅行灵感</h3>
          <span>选一个模板，马上替换输入内容</span>
        </div>
        <div class="inspiration-grid">
          <button @click="applyExample('带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化')"><span>父母慢游</span><b>松弛人文线</b><small>3-5天 · 少换乘</small></button>
          <button @click="applyExample('想去成都玩4天，重点吃美食看夜景，节奏轻松一点')"><span>烟火气</span><b>城市夜色线</b><small>2-4天 · 美食优先</small></button>
          <button @click="applyExample('想在城市里玩3天，喜欢美食、历史和夜景')"><span>城市印象</span><b>地标漫游线</b><small>2-4天 · 拍照友好</small></button>
          <button @click="applyExample('亲子出游3天，想轻松、有趣、不要太赶')"><span>亲子时光</span><b>家庭舒适线</b><small>3-6天 · 留足休息</small></button>
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

    <section v-if="needsMoreInfo" class="followup-workspace product-followup">
      <div class="followup-top">
        <span>规划准备</span>
        <h1>确认出发信息，马上生成第一天行程</h1>
        <p>PlanGo 已经读懂你的旅行想法，只差少量会影响路线和交通的细节。</p>
      </div>

      <section class="planning-console">
        <header class="console-summary">
          <div>
            <span class="console-kicker">行程概要</span>
            <h2>{{ activeRequirement.destination || fieldValue('destination') || '目的地待确认' }} {{ activeRequirement.days || fieldValue('days') || 3 }} 日旅行</h2>
          </div>
          <button class="edit-summary-btn" @click="step='INPUT'">重新编辑</button>
        </header>

        <div class="summary-strip">
          <div><span>目的地</span><b>{{ activeRequirement.destination || fieldValue('destination') || '待确认' }}</b></div>
          <div><span>天数</span><b>{{ activeRequirement.days || fieldValue('days') || '待确认' }}</b></div>
          <div><span>人数</span><b>{{ activeRequirement.peopleCount || fieldValue('peopleCount') || '待确认' }}</b></div>
          <div><span>预算</span><b>{{ activeRequirement.budget ? `¥${activeRequirement.budget}以内` : fieldValue('budget') || '待确认' }}</b></div>
          <div><span>节奏</span><b>{{ paceLabel(activeRequirement.pace || fieldValue('pace')) }}</b></div>
          <div><span>偏好</span><b>{{ activeRequirement.preferences.join('、') || '待确认' }}</b></div>
        </div>

        <blockquote class="original-demand">{{ userInput }}</blockquote>

        <div class="followup-task">
          <div class="task-heading">
            <span>{{ pendingQuestions.length }} 项待确认</span>
            <h3>补齐后会直接进入 Day 01 行程</h3>
          </div>
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
        </div>

        <footer class="console-actions">
          <span>不确定的内容可以交给 PlanGo 按轻松路线处理。</span>
          <button class="generate-day-btn" @click="submitFollowUp">确认并生成 Day 01</button>
        </footer>
      </section>
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
        <p>{{ generateProgressLabel }}</p>
        <div class="generate-progress"><i :style="{width:`${generateProgress}%`}"></i></div>
        <small>{{ generateProgress }}% · 已用时 {{ generateElapsed }} 秒</small>
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
          <div class="summary-cell"><small>{{ hasRental ? '租车套餐' : '推荐交通' }}</small><b>{{ hasRental ? (selectedQuote?.name || '舒适型轿车') : '步行 + 打车' }}</b></div>
          <div class="progress-cell">
            <i :style="progressStyle"></i>
            <div><small>行程确认进度</small><b>已确认 {{ lockedCount }} / {{ days.length }} 天</b><span>继续完善，行程更完整</span></div>
          </div>
        </header>

        <div class="builder-main">
          <DayPlanCard
            :day="currentDay"
            :selected-quote="hasRental ? selectedQuote : null"
            :confirming="confirming"
            @confirm="confirmCurrentDay"
            @regenerate="regenerateCurrentDay"
            @revise="reviseVisible=true"
          />
          <div class="map-workbench">
            <TripRouteMap :places="currentMapPlaces" :tip="currentDay.tips[1]" @route-stats="updateRouteStats"/>
            <section class="map-control-panel builder-card">
              <div class="map-progress-dots" aria-label="行程进度">
                <template v-for="(day,index) in days" :key="day.day">
                  <button type="button" :class="{ active: day.day===currentDay.day, locked: day.status==='locked', generating: day.status==='generating' }" @click="selectDay(index)">{{ String(day.day).padStart(2,'0') }}</button>
                  <i v-if="index<days.length-1"></i>
                </template>
              </div>
              <div class="map-actions">
                <button @click="regenerateCurrentDay">
                  <b>调整路线</b>
                  <small>换个思路，重新规划</small>
                </button>
                <button @click="reviseVisible=true">
                  <b>修改偏好</b>
                  <small>景点 / 餐饮 / 节奏</small>
                </button>
                <el-button class="confirm-btn" type="primary" :loading="confirming" @click="confirmCurrentDay">确认 Day {{ String(currentDay.day).padStart(2,'0') }}</el-button>
              </div>
            </section>
          </div>
        </div>
      </section>

      <FinalReviewPanel
        v-if="step==='FINAL_REVIEW'||step==='ORDER_CREATED'||step==='PAID'"
        :data="{requirement:activeRequirement,days,selectedQuote:hasRental?selectedQuote:null,hotelCost:plan?.budgetSummary.hotel??null}"
        :saving="saving"
        :order-created="orderCreated"
        :paid="paid"
        @create-order="createOrder"
        @sandbox-pay="sandboxPay"
        @back="step='DAY_BUILDING'"
      />

      <el-dialog v-model="reviseVisible" title="修改这一天的偏好" width="520px">
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

.followup-workspace{min-height:calc(100vh - 72px);padding:22px 48px 52px;background:linear-gradient(180deg,#f7fbff,#f5f7fa)}.question-list{display:grid;gap:12px}.question-list article{position:relative;border:1px solid #edf1f5;border-radius:14px;background:#fff;padding:16px}.question-list i{position:absolute;left:-13px;top:18px;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#0f9f8f;color:#fff;font-style:normal;font-weight:900}.question-list h4{margin:0 0 12px;color:#172033}.question-list article div{display:flex;gap:10px;flex-wrap:wrap}.question-list button{height:30px;border:1px solid #dce5ef;border-radius:999px;background:#fff;color:#526176;padding:0 17px;cursor:pointer}.question-list button.active{border-color:#0f9f8f;background:#ecfdf5;color:#0f766e}.question-list input{width:100%;height:36px;margin-top:10px;border:1px solid #e3eaf2;border-radius:10px;padding:0 12px;outline:0}.generate-day-btn{width:100%;height:44px;border:0;border-radius:10px;background:linear-gradient(135deg,#0d9488,#10b981);color:#fff;font-weight:900;margin-top:16px;cursor:pointer}

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

.builder-loading small {
  display: block;
  margin-top: 10px;
  color: #94a3b8;
  font-size: 12px;
}

.generate-progress {
  width: min(360px, 80%);
  height: 8px;
  margin: 18px auto 0;
  overflow: hidden;
  border-radius: 999px;
  background: #e8eef6;
}

.generate-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #10b981);
  transition: width .28s ease;
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

.map-progress-dots button {
  width: 30px;
  height: 30px;
  border: 1px solid #dce4ed;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #718096;
  background: #eef3f8;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.map-progress-dots button.active,
.map-progress-dots button.locked {
  color: #fff;
  border-color: #0f9f8f;
  background: #0f9f8f;
  box-shadow: 0 12px 24px rgba(15, 159, 143, .2);
}

.map-progress-dots button.generating {
  color: #fff;
  border-color: #2563eb;
  background: #2563eb;
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

.product-hero {
  min-height: calc(100vh - 72px);
  display: block;
  padding: 42px 24px 58px;
  background: linear-gradient(180deg,#f8fbff 0%,#eef4f7 100%);
  text-align: left;
}

.hero-shell {
  width: min(1280px, calc(100vw - 64px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0,1.18fr) 390px;
  gap: 28px;
  align-items: stretch;
}

.hero-panel {
  padding: 34px;
  border: 1px solid #e3eaf2;
  border-radius: 24px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 22px 54px rgba(15,23,42,.08);
}

.hero-kicker {
  margin: 0 0 12px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.hero-panel h1 {
  max-width: 760px;
  margin: 0;
  color: #101827;
  font-size: 38px;
  line-height: 1.18;
  letter-spacing: 0;
}

.hero-lead {
  max-width: 720px;
  margin: 14px 0 24px;
  color: #5f6f84;
  font-size: 15px;
  line-height: 1.75;
}

.product-hero .hero-input-shell {
  width: 100%;
  min-height: 172px;
  grid-template-columns: 1fr;
  padding: 16px;
  border-radius: 18px;
  box-shadow: inset 0 0 0 1px #dfe7f0,0 14px 30px rgba(15,23,42,.06);
}

.product-hero .hero-input-shell textarea {
  height: 100px;
  padding: 4px;
  font-size: 15px;
}

.hero-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #edf2f7;
  padding-top: 12px;
}

.hero-input-actions span {
  color: #7b8798;
  font-size: 12px;
}

.hero-input-actions button {
  min-width: 132px;
  height: 42px;
}

.product-hero .quick-fields {
  width: 100%;
  grid-template-columns: repeat(4,1fr);
  margin-top: 18px;
  gap: 12px;
}

.product-hero .quick-fields button {
  height: 72px;
  border-radius: 16px;
  background: #f8fafc;
  box-shadow: none;
}

.product-hero .quick-fields b {
  font-size: 13px;
  color: #687589;
}

.product-hero .quick-fields span {
  font-size: 16px;
  color: #101827;
  font-weight: 900;
}

.hero-preview {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  min-height: 418px;
  color: #fff;
  background: #10233f;
  box-shadow: 0 22px 54px rgba(15,23,42,.14);
}

.hero-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.06);
}

.hero-preview:after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,rgba(8,17,32,.08),rgba(8,17,32,.74));
}

.preview-card,
.preview-stats {
  position: absolute;
  z-index: 1;
  left: 20px;
  right: 20px;
}

.preview-card { bottom: 94px; }
.preview-card span { display:inline-flex;border-radius:999px;background:rgba(255,255,255,.18);padding:6px 10px;font-size:12px;font-weight:800; }
.preview-card b { display:block;margin-top:10px;font-size:25px; }
.preview-card p { margin:8px 0 0;color:rgba(255,255,255,.78);line-height:1.55; }
.preview-stats { bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
.preview-stats div { border-radius:14px;background:rgba(255,255,255,.14);padding:10px;backdrop-filter:blur(10px); }
.preview-stats small,.preview-stats b { display:block; }
.preview-stats small { color:rgba(255,255,255,.66);font-size:11px; }
.preview-stats b { margin-top:4px;color:#fff;font-size:13px; }

.product-hero .inspiration-block {
  width: min(1280px, calc(100vw - 64px));
  margin: 24px auto 0;
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-head h3 { margin:0;color:#172033; }
.section-head span { color:#758195;font-size:13px; }
.product-hero .inspiration-grid { grid-template-columns: repeat(4,1fr); }
.product-hero .inspiration-grid button { height:132px;border-radius:18px;padding:16px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.06); }
.product-hero .inspiration-grid b { margin-top:28px;font-size:17px; }
.product-hero .inspiration-grid small { font-size:12px; }

.product-followup {
  min-height: calc(100vh - 72px);
  padding: 38px 48px 56px;
  background:
    radial-gradient(circle at 18% 18%, rgba(15,159,143,.08), transparent 30%),
    linear-gradient(180deg,#f8fbff,#f4f7fb);
}

.followup-top {
  max-width: 1120px;
  margin: 0 auto 18px;
}

.followup-top span {
  color: #0f766e;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 1px;
}

.followup-top h1 {
  margin: 8px 0 6px;
  color: #101827;
  font-size: 32px;
  letter-spacing: 0;
}

.followup-top p {
  margin: 0;
  color: #64748b;
}

.planning-console {
  max-width: 1120px;
  margin: 0 auto;
  border: 1px solid #e5edf5;
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 22px 58px rgba(15,23,42,.08);
  padding: 26px;
}

.console-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.console-kicker {
  display: inline-flex;
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
}

.console-summary h2 {
  margin: 7px 0 0;
  color: #111827;
  font-size: 28px;
  letter-spacing: 0;
}

.edit-summary-btn {
  height: 38px;
  border: 1px solid #dce6f0;
  border-radius: 12px;
  background: #fff;
  color: #526176;
  font-weight: 800;
  padding: 0 16px;
  cursor: pointer;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(6,1fr);
  gap: 10px;
  margin: 22px 0 14px;
}

.summary-strip div {
  min-width: 0;
  border: 1px solid #edf2f7;
  border-radius: 16px;
  background: #fbfdff;
  padding: 13px 14px;
}

.summary-strip span,
.summary-strip b {
  display: block;
}

.summary-strip span {
  color: #7b8798;
  font-size: 12px;
}

.summary-strip b {
  margin-top: 6px;
  color: #111827;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.original-demand {
  margin: 0;
  border: 0;
  border-radius: 16px;
  background: #f7fafc;
  color: #526176;
  line-height: 1.75;
  padding: 16px 18px;
}

.followup-task {
  margin-top: 18px;
  border: 1px solid #e4edf6;
  border-radius: 20px;
  background: linear-gradient(180deg,#fff,#fbfdff);
  padding: 20px;
}

.task-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.task-heading span {
  display: inline-flex;
  border-radius: 999px;
  background: #ecfdf5;
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
  padding: 7px 12px;
}

.task-heading h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
}

.product-followup .question-list {
  gap: 14px;
}

.product-followup .question-list article {
  border-radius: 18px;
  border-color: #e6edf5;
  background: #fff;
  padding: 18px 18px 18px 46px;
}

.product-followup .question-list i {
  left: 16px;
  top: 20px;
}

.product-followup .question-list input {
  height: 42px;
  margin-top: 12px;
}

.console-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 18px;
}

.console-actions span {
  color: #64748b;
  font-size: 13px;
}

.product-followup .generate-day-btn {
  width: 270px;
  height: 50px;
  border-radius: 14px;
  margin-top: 0;
  flex: 0 0 auto;
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
  .quick-fields,
  .inspiration-grid,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .product-followup {
    padding: 24px 16px 40px;
  }

  .followup-top h1 {
    font-size: 26px;
  }

  .planning-console {
    padding: 18px;
    border-radius: 18px;
  }

  .console-summary,
  .task-heading,
  .console-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .console-summary h2 {
    font-size: 23px;
  }

  .product-followup .generate-day-btn {
    width: 100%;
  }

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
