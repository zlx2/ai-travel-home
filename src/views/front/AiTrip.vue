<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading, MagicStick } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus/es/components/message/index'
import { ElMessageBox } from 'element-plus/es/components/message-box/index'
import { aiApi, rentalApi, tripApi } from '../../api'
import DayPlanCard from '../../components/trip-builder/DayPlanCard.vue'
import FinalReviewPanel from '../../components/trip-builder/FinalReviewPanel.vue'
import RentalQuoteDeck from '../../components/trip-builder/RentalQuoteDeck.vue'
import RequirementSummaryBar from '../../components/trip-builder/RequirementSummaryBar.vue'
import TripRouteMap, { type TripMapPlace } from '../../components/trip-builder/TripRouteMap.vue'
import type { BuilderDay, BuilderStep, DayMoment, RentalQuote } from '../../components/trip-builder/types'
import type { AnalyzeResult, RecommendationContext, Requirement, TripDay, TripPlan } from '../../types'
import { homeImage } from '../../utils/homeImages'
import { MAX_TRIP_DAYS, normalizeTripDays } from '../../utils/tripLimits'

const route=useRoute()
const userInput=ref('')
const showForm=ref(false)
const destEditing=ref(false)
const editingField=ref('')
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
const rentalOrderId=ref<number|null>(null)
const result=ref<AnalyzeResult|null>(null)
const followUpAnswers=reactive<Record<string,string>>({})
const plan=ref<TripPlan|null>(null)
const recommendation=ref<RecommendationContext|null>(null)
const generationSessionId=ref('')
const step=ref<BuilderStep>('INPUT')
const days=ref<BuilderDay[]>([])
const currentDayIndex=ref(0)
const selectedQuoteId=ref('comfort')
const quoteLoading=ref(false)
const quoteOptions=ref<RentalQuote[]>([])
const rentalContext=ref<any|null>(null)
const selectedBackendQuote=ref<any|null>(null)
const rentalTripForm=reactive({
  arrivalMode:'还不确定',
  arrivalTimeRange:'按到达时间安排',
  routeStructure:'城市+周边',
  dailyDrivingLimit:'近郊自驾（单日累计约2-4小时）',
  returnMode:'同城还车',
})
const reviseVisible=ref(false)
const reviseText=ref('')
const dayRevisionHints=reactive<Record<number,string[]>>({})
const dayOrderIssues=reactive<Record<number,string[]>>({})

const form=reactive<Requirement>({
  departure:'上海',
  destination:'',
  days:3,
  budget:4000,
  budgetType:'TOTAL',
  peopleCount:3,
  preferences:['自然风光','历史文化','美食体验'],
  pace:'LIGHT',
  avoidances:['不要太累'],
  travelDate:'',
})
const preferenceOptions=['美食体验','夜景','历史文化','自然风光','亲子','拍照打卡','自驾','轻松游']

onMounted(()=>{
  if(route.query.destination){
    form.destination=String(route.query.destination)
    setFormDays(route.query.days||3)
    form.preferences=String(route.query.preferences||'').split(',').filter(Boolean)
    userInput.value=`我想去${form.destination}玩${form.days}天，喜欢${form.preferences.join('和')}，行程轻松一点`
    showForm.value=true
  }
})

const ALL_DESTINATIONS=['杭州','成都','重庆','西安','厦门','北京','上海','南京','丽江','苏州','昆明','大理','丽江古城','香格里拉','西双版纳','腾冲','广州','深圳','珠海','三亚','海口','桂林','北海','武汉','长沙','张家界','凤凰古城','青岛','济南','泰安','烟台','威海','大连','沈阳','哈尔滨','长春','郑州','洛阳','开封','太原','大同','平遥','呼和浩特','乌鲁木齐','喀纳斯','拉萨','林芝','兰州','敦煌','西宁','青海湖','银川','贵阳','黄果树','遵义','南宁','南昌','九江','婺源','景德镇','福州','泉州','武夷山','合肥','黄山','宏村','无锡','扬州','镇江','周庄','乌镇','千岛湖','莫干山','安吉','舟山','普陀山','稻城','色达','九寨沟','都江堰','峨眉山','华山','太行山','恩施','神农架','长白山','阿尔山','呼伦贝尔','张掖','嘉峪关','中卫']

const pickDestination = (text: string) => {
  if (!text) return
  // 优先正则: 去/到/在 XX
  const m = text.match(/(?:去|到|在)([一-龥]{2,6})(?:玩|旅游|旅行|看|，|。|$|下车|出发|周边)/)
  if (m) { form.destination = m[1]; return }
  // 兜底遍历大列表
  for (const city of ALL_DESTINATIONS) {
    if (text.includes(city)) { form.destination = city; return }
  }
}
watch(userInput, pickDestination)
const fieldInput=ref<HTMLInputElement|null>(null)
watch(editingField, async v=>{ if(v){ await nextTick(); fieldInput.value?.focus(); fieldInput.value?.select() } })

const activeRequirement=computed(()=>result.value?.requirement||form)
const ready=computed(()=>result.value?.status==='READY'&&!!result.value.requirement)
const pendingQuestions=computed(()=>result.value?.status==='NEED_MORE_INFO'?(result.value.questions||[]):[])
const needsMoreInfo=computed(()=>step.value==='INPUT'&&pendingQuestions.value.length>0)
const landingMode=computed(()=>step.value==='INPUT'&&!needsMoreInfo.value)
const explicitNoRental=computed(()=>{
  const text=`${userInput.value} ${form.preferences.join(' ')}`
  return /不租车|不要租车|不用租车|非租车|公共交通|公交|地铁|打车|网约车|步行/.test(text)
})
const hasRental=computed(()=>{
  return !explicitNoRental.value
})
const routeMode=computed(()=>hasRental.value?(userInput.value.includes('落地')?'出行方式：落地租车':'路线模式：租车自驾'):'城市轻松游')
const selectedQuote=computed(()=>quoteOptions.value.find(item=>item.id===selectedQuoteId.value)||quoteOptions.value[0]||null)
const currentDay=computed(()=>days.value[currentDayIndex.value])
const dayOverlayVisible=computed(()=>currentDay.value?.status==='generating')
const pendingDayNo=ref<number|null>(null)
const dayBusy=computed(()=>dayOverlayVisible.value||confirming.value||pendingDayNo.value!==null)
const generationNoticeVisible=computed(()=>dayOverlayVisible.value||pendingDayNo.value!==null)
const generationNoticeDay=computed(()=>pendingDayNo.value||currentDay.value?.day||1)
const generationNoticeText=computed(()=>pendingDayNo.value?'正在生成下一天，当前已确认内容会保留。':'正在替换当前 Day，并避开已确认景点。')
const lockedCount=computed(()=>days.value.filter(day=>day.status==='locked').length)
const progressStyle=computed(()=>({background:`conic-gradient(#10b981 ${Math.round((lockedCount.value/Math.max(days.value.length,1))*360)}deg,#e5eaf0 0deg)`}))
const currentMapPlaces=computed<TripMapPlace[]>(()=>currentDay.value?currentDay.value.moments.filter((moment):moment is DayMoment&{lng:number;lat:number}=>hasMomentLocation(moment)).map((moment)=>({
  title:moment.title,
  time:moment.time.split('-')[0],
  desc:moment.description,
  lng:moment.lng,
  lat:moment.lat,
  type:moment.type,
})):[])

const promptDaysValue=()=>Number(userInput.value.match(/(\d+)\s*天/)?.[1]||0)
const showTripDaysLimitMessage=()=>ElMessage({
  message:`我先帮你整理成 ${MAX_TRIP_DAYS} 天精华版，长线旅行可以保存后继续分段规划。`,
  customClass:'trip-friendly-message',
  duration:4200,
})

const setFormDays=(value:unknown)=>{
  const original=Number(value)
  form.days=normalizeTripDays(original, form.days||3)
}

const normalizeRequirementDays=(requirement:Partial<Requirement>)=>{
  if(!requirement.days)return 0
  const original=Number(requirement.days)
  const days=normalizeTripDays(original)
  requirement.days=days
  return days
}

const updateRouteStats=(stats:{distanceKm:number;drivingMinutes:number})=>{
  const day=currentDay.value
  if(!day)return
  const visitMinutes=day.moments
    .filter(moment=>!isRouteOnlyMoment(moment))
    .reduce((sum,moment)=>sum+durationToMinutes(moment.suggestedDuration),0)
  const totalMinutes=Math.min(23*60+30,visitMinutes+stats.drivingMinutes)
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

const fallbackQuoteOptions=():RentalQuote[]=>{
  const req=activeRequirement.value
  const dayCount=Math.max(1,req.days||3)
  const pickup=req.destination?`${req.destination}站`:'目的地门店'
  const airport=req.destination?`${req.destination}萧山国际机场`:'机场门店'
  return [
    {id:'comfort',label:'推荐套餐',name:'舒适型轿车',subtitle:'大众朗逸或同级',seats:5,luggage:2,tags:['自动挡','空调'],pickup:airport,returnPlace:airport,pickupTime:'06-01 09:00',returnTime:`06-${String(dayCount).padStart(2,'0')} 18:00`,totalPrice:620,dayCount,serviceTags:['基本保险','24h 道路救援','免费取消','无限里程'],tone:'blue'},
    {id:'suv',label:'性价比优选',name:'SUV 经济型',subtitle:'哈弗 H6 或同级',seats:5,luggage:2,tags:['自动挡','山路友好'],pickup,returnPlace:pickup,pickupTime:'06-01 09:00',returnTime:`06-${String(dayCount).padStart(2,'0')} 18:00`,totalPrice:780,dayCount,serviceTags:['基本保险','24h 道路救援','免费取消'],tone:'teal'},
    {id:'business',label:'宽敞舒适',name:'7座商务车',subtitle:'别克 GL8 或同级',seats:7,luggage:4,tags:['自动挡','家庭多人'],pickup:airport,returnPlace:airport,pickupTime:'06-01 09:00',returnTime:`06-${String(dayCount).padStart(2,'0')} 18:00`,totalPrice:980,dayCount,serviceTags:['基本保险','24h 道路救援','免费取消','宽敞座舱'],tone:'gold'},
  ]
}

const yuan=(cent:number|undefined)=>Math.round((cent||0)/100)
const pickupTimeLabel=(requirement:Requirement)=>requirement.travelDate?`${requirement.travelDate} 10:00`:'到达后交车'
const returnTimeLabel=(requirement:Requirement,days:number)=>requirement.travelDate?`${requirement.travelDate} +${days}天`:`${days}天后还车`
const quoteTone=(index:number):RentalQuote['tone']=>(['blue','teal','gold'] as const)[index%3]
const quoteToView=(quote:any,index:number):RentalQuote=>{
  const dayCount=Number(quote.rentalDays||activeRequirement.value.days||1)
  const modelName=quote.seriesFullName||quote.displayName||quote.groupName||'租车套餐'
  const tags=String(quote.travelTags||quote.featureTags||'自动挡')
    .split(/[,，]/)
    .map(item=>item.trim())
    .filter(Boolean)
    .slice(0,3)
  return {
    id:String(quote.quoteId||quote.vehicleGroupId||index),
    label:index===0?'推荐套餐':index===1?'经济优选':'舒适升级',
    name:quote.groupName||quote.displayName||modelName,
    subtitle:modelName,
    seats:Number(quote.seats||quote.seatsMax||5),
    luggage:Number(String(quote.recommendedLuggage||'2').match(/\d+/)?.[0]||2),
    tags:tags.length?tags:['自动挡'],
    pickup:rentalContext.value?.matchedStore?.displayName||quote.pickupPoiName||rentalContext.value?.arrivalPoint?.name||'到达点交车',
    returnPlace:rentalContext.value?.matchedStore?.displayName||quote.returnPoiName||quote.pickupPoiName||'同城还车',
    pickupTime:pickupTimeLabel(activeRequirement.value),
    returnTime:returnTimeLabel(activeRequirement.value,dayCount),
    totalPrice:yuan(quote.feeBreakdown?.totalPriceCent),
    dayCount,
    serviceTags:['送车接人','基础保障','免费取消'],
    tone:quoteTone(index),
    raw:quote,
  }
}

const inferArrivalText=()=>{
  const req=activeRequirement.value
  const text=userInput.value
  const station=text.match(/([\u4e00-\u9fa5A-Za-z0-9]+(?:东站|西站|南站|北站|站|机场|酒店|宾馆|民宿))/)
  if(station)return station[1]
  if(text.includes('机场')||text.includes('飞机')||text.includes('航班')||text.includes('飞'))return `${req.destination}机场`
  if(text.includes('高铁')||text.includes('动车')||text.includes('火车')||text.includes('车站'))return `${req.destination}站`
  return `${req.destination}站`
}

const inferArrivalMode=()=>{
  const text=`${userInput.value} ${rentalContext.value?.arrivalPoint?.name||''}`
  if(/机场|飞机|航班|落地|下飞机/.test(text))return '机场到达'
  if(/高铁|动车|火车|车站|东站|西站|南站|北站|下车/.test(text))return '高铁/火车站到达'
  if(/酒店|宾馆|民宿/.test(text))return '酒店/住宿点出发'
  if(/地址|上门|送车/.test(text))return '指定地址交车'
  return '还不确定'
}

const inferArrivalTimeRange=()=>{
  const text=userInput.value
  if(/凌晨|早上|上午/.test(text))return '上午到达'
  if(/中午|午间/.test(text))return '中午到达'
  if(/下午|傍晚/.test(text))return '下午到达'
  if(/晚上|夜里|夜间/.test(text))return '晚上到达'
  return '按到达时间安排'
}

const syncRentalDetailDefaults=()=>{
  rentalTripForm.arrivalMode=inferArrivalMode()
  rentalTripForm.arrivalTimeRange=inferArrivalTimeRange()
  rentalTripForm.routeStructure=/多城|多个城市|串联|跨城|异地|环线/.test(userInput.value)?'多城市/跨城自驾':'城市及周边自驾'
  rentalTripForm.dailyDrivingLimit=/少开|不要太累|父母|老人|亲子/.test(userInput.value)?'城市短途（单日累计约1-2小时）':'近郊自驾（单日累计约2-4小时）'
  rentalTripForm.returnMode=/异地|跨城|多城市|多城/.test(userInput.value)?'异地还车':'同城还车'
}

const loadRentalContext=async()=>{
  if(!ready.value||!activeRequirement.value.destination)return
  quoteLoading.value=true
  try{
    const data=await rentalApi.previewContext({
      requirement:activeRequirement.value,
      arrivalText:inferArrivalText(),
    })
    rentalContext.value=data.rentalTripContext?{...data,...data.rentalTripContext}:data
    if(result.value&&data.requirement)result.value={...result.value,requirement:data.requirement}
    if(data.requirement)Object.assign(form,data.requirement)
    syncRentalDetailDefaults()
    const mapped=(data.quoteOptions||[]).map(quoteToView)
    quoteOptions.value=mapped
    selectedQuoteId.value=quoteOptions.value[0]?.id||''
    selectedBackendQuote.value=quoteOptions.value[0]?.raw||null
  }catch(error){
    rentalContext.value=null
    quoteOptions.value=[]
    selectedQuoteId.value=''
    selectedBackendQuote.value=null
    ElMessage.error(error instanceof Error?`租车套餐加载失败：${error.message}`:'租车套餐加载失败')
  }finally{
    quoteLoading.value=false
  }
}

const enterQuoteSelect=async()=>{
  step.value='QUOTE_SELECT'
  await loadRentalContext()
}

const selectQuote=(id:string)=>{
  selectedQuoteId.value=id
  selectedBackendQuote.value=quoteOptions.value.find(item=>item.id===id)?.raw||null
}

const buildRentalTripContext=()=>({
  arrivalPoint:rentalContext.value?.arrivalPoint,
  matchedStore:rentalContext.value?.matchedStore,
  pickupPlan:rentalContext.value?.pickupPlan,
  arrivalMode:rentalContext.value?.arrivalMode||rentalTripForm.arrivalMode,
  arrivalTimeRange:rentalContext.value?.arrivalTimeRange||rentalTripForm.arrivalTimeRange,
  routeStructure:rentalContext.value?.routeStructure||rentalTripForm.routeStructure,
  dailyDrivingLimit:rentalContext.value?.dailyDrivingLimit||rentalTripForm.dailyDrivingLimit,
  returnMode:rentalContext.value?.returnMode||rentalTripForm.returnMode,
  returnPoint:rentalContext.value?.returnPoint||rentalContext.value?.arrivalPoint?.name,
  withElderOrChildren:rentalContext.value?.withElderOrChildren??/父母|老人|亲子|孩子|小孩/.test(userInput.value),
  luggageLevel:rentalContext.value?.luggageLevel||'普通行李',
})

const continueToRentalDetails=()=>{
  if(!selectedBackendQuote.value)return ElMessage.warning('先选择一个租车套餐')
  step.value='RENTAL_DETAILS'
  setTimeout(()=>document.querySelector('.rental-detail-step')?.scrollIntoView({behavior:'smooth',block:'start'}),60)
}

const startRentalTripBuilding=()=>{
  if(!selectedBackendQuote.value)return ElMessage.warning('先选择一个租车套餐')
  startDayBuilding()
}

const applyExample=(value:string)=>{
  userInput.value=value
  if(value.includes('杭州')) form.destination='杭州'
  if(value.includes('成都')) form.destination='成都'
  if(value.includes('重庆')) form.destination='重庆'
  if(value.includes('苏州')) form.destination='苏州'
  if(value.includes('江浙沪')) form.destination='杭州'
  if(value.includes('上海出发')) form.departure='上海'
  if(value.includes('重庆出发')) form.departure='重庆'
  if(value.includes('成都出发')) form.departure='成都'
  if(value.includes('自驾')&&!form.preferences.includes('自驾')) form.preferences.push('自驾')
  for(const preference of preferenceOptions){
    if(value.includes(preference.replace('体验',''))&&!form.preferences.includes(preference))form.preferences.push(preference)
  }
  if(/父母|老人/.test(value)&&!form.preferences.includes('轻松游'))form.preferences.push('轻松游')
  const daysText=value.match(/(\d+)\s*天/)
  if(daysText) setFormDays(daysText[1])
  const budgetText=value.match(/预算(?:在)?\s*(\d+)/)
  if(budgetText)form.budget=Number(budgetText[1])
  if(/父母|老人/.test(value))form.peopleCount=3
  if(/1人|一个人|独自/.test(value))form.peopleCount=1
  if(/2人|两人|情侣/.test(value))form.peopleCount=2
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
  if(field==='days')setFormDays(value.match(/\d+/)?.[0]||form.days)
  if(field==='peopleCount')form.peopleCount=Number(value.match(/\d+/)?.[0]||form.peopleCount)
  if(field==='destination')form.destination=value
  if(field==='departure')form.departure=value
  if(field==='budget')form.budget=Number(value.match(/\d+/)?.[0]||form.budget)
}

const applyFollowUpAnswers=(target:any)=>{
  for(const [field,rawValue] of Object.entries(followUpAnswers)){
    const value=String(rawValue||'').trim()
    if(!value)continue
    if(field==='days'){
      const days=Number(value.match(/\d+/)?.[0]||0)
      if(days)target.days=days
      continue
    }
    if(field==='peopleCount'){
      const people=Number(value.match(/\d+/)?.[0]||0)
      if(people)target.peopleCount=people
      continue
    }
    if(field==='budget'){
      const budget=Number(value.match(/\d+/)?.[0]||0)
      if(budget)target.budget=budget
      continue
    }
    if(field==='departure')target.departure=value
    else if(field==='destination')target.destination=value
    else if(field==='pace')target.pace=/轻松|不要太累|不累/.test(value)?'LIGHT':/紧凑/.test(value)?'TIGHT':'NORMAL'
    else if(field==='transport'){
      if(/不租车|公交|地铁|打车|网约车|步行/.test(value)){
        target.transportMode='PUBLIC_TRANSIT'
        target.rentalIntent='NO_RENTAL'
        target.routeMode='DESTINATION_CITY_TRIP'
      }else if(/租车|自驾/.test(value)){
        target.transportMode='RENTAL_CAR'
        target.rentalIntent='USER_REQUIRED'
        target.routeMode='LANDING_RENTAL_TRIP'
      }
    }else{
      target[field]=value
    }
  }
  return target
}

const analyze=async()=>{
  if(!userInput.value.trim()&&!form.destination)return ElMessage.warning('先描述一下你想去哪里、怎么玩')
  analyzing.value=true
  plan.value=null
  recommendation.value=null
  days.value=[]
  orderCreated.value=false
  paid.value=false
  rentalOrderId.value=null
  try{
    const extraAnswers=Object.entries(followUpAnswers).filter(([,value])=>value.trim()).map(([field,value])=>`${field}：${value.trim()}`)
    const requirement=applyFollowUpAnswers({...(showForm.value?form:result.value?.requirement||form)})
    const promptDays=promptDaysValue()
    if(Number.isFinite(promptDays)&&promptDays>MAX_TRIP_DAYS)showTripDaysLimitMessage()
    if(requirement)normalizeRequirementDays(requirement)
    result.value=await aiApi.analyze({conversationId:result.value?.conversationId,userInput:userInput.value,extraAnswers,requirement})
    if(result.value.requirement){
      normalizeRequirementDays(result.value.requirement)
      Object.assign(form,result.value.requirement)
    }
    if(result.value.status==='NEED_MORE_INFO'){
      for(const question of result.value.questions||[]){
        if(!(question.field in followUpAnswers))followUpAnswers[question.field]=''
      }
      step.value='INPUT'
    }else{
      clearFollowUpAnswers()
    }
    if(result.value.status==='READY'){
      step.value='ANALYZED'
      if(hasRental.value){
        await enterQuoteSelect()
      }else{
        await startDayBuilding()
      }
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

const reopenPromptEditor=()=>{
  result.value=null
  plan.value=null
  recommendation.value=null
  days.value=[]
  orderCreated.value=false
  paid.value=false
  rentalOrderId.value=null
  clearFollowUpAnswers()
  showForm.value=true
  step.value='INPUT'
}

const chooseDestination=async(name:string)=>{
  form.destination=name
  userInput.value=`${userInput.value}，目的地选择${name}`
  await analyze()
}

const continueFromSummary=()=>{
  if(!ready.value)return
  if(hasRental.value){
    enterQuoteSelect()
  }else{
    step.value='DAY_BUILDING'
    startDayBuilding()
  }
}

const startDayBuilding=async()=>{
  if(!result.value?.requirement)return
  if(hasRental.value&&!selectedBackendQuote.value){
    ElMessage.warning('请先完成租车报价选择')
    step.value='QUOTE_SELECT'
    await loadRentalContext()
    return
  }
  normalizeRequirementDays(result.value.requirement)
  generating.value=true
  startGenerateTimer()
  step.value='DAY_BUILDING'
  try{
    const extras=hasRental.value?{selectedQuote:selectedBackendQuote.value,rentalTripContext:buildRentalTripContext()}:undefined
    const data=await aiApi.generateStream(result.value.conversationId,result.value.requirement,event=>{
      if(event.label)generateProgressLabel.value=event.label
      if(typeof event.progress==='number')generateProgress.value=event.progress
    },extras)
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
  const confirmedIndex=currentDayIndex.value
  confirming.value=true
  try{
    if(!currentDay.value.moments.length){
      await ensureDayGenerated(currentDayIndex.value)
    }
    days.value[confirmedIndex]={...currentDay.value,status:'locked'}
    const next=confirmedIndex+1
    if(next<days.value.length){
      // ★ 先切到下一天，立即停旋转
      currentDayIndex.value=next
      confirming.value=false
      // 后台预生成下一天（不阻塞按钮）
      pendingDayNo.value=days.value[next].day
      try{await ensureDayGenerated(next)}catch(e){
        ElMessage.error(e instanceof Error?e.message:'预生成下一天失败，可手动点击生成')
      }
      pendingDayNo.value=null
    }else{
      confirming.value=false
      step.value='FINAL_REVIEW'
    }
  }catch(error){
    if(step.value==='DAY_BUILDING'&&currentDayIndex.value===confirmedIndex&&days.value[confirmedIndex]?.status==='locked'){
      days.value[confirmedIndex]={...days.value[confirmedIndex],status:'active'}
    }
    ElMessage.error(error instanceof Error?error.message:'单日行程生成失败，请稍后重试')
    confirming.value=false
  }
}

const selectDay=async(index:number)=>{
  if(dayBusy.value||index<0||index>=days.value.length||index===currentDayIndex.value)return
  const target=days.value[index]
  if(!target)return
  try{
    if(!target.moments.length){
      pendingDayNo.value=target.day
      await ensureDayGenerated(index)
    }
    currentDayIndex.value=index
  }catch(error){
    ElMessage.error(error instanceof Error?error.message:'单日行程生成失败，请稍后重试')
  }finally{
    pendingDayNo.value=null
  }
}

const regenerateCurrentDay=async(revisionText='')=>{
  if(dayBusy.value||!currentDay.value)return
  const index=currentDayIndex.value
  days.value[index]={...days.value[index],status:'generating'}
  try{
    await ensureDayGenerated(index,true,revisionText)
    dayOrderIssues[days.value[index].day]=[]
    ElMessage.success(`Day ${String(days.value[index].day).padStart(2,'0')} 已重新生成`)
  }catch(error){
    days.value[index]={...days.value[index],status:'active'}
    ElMessage.error(error instanceof Error?error.message:'重新生成失败，请稍后重试')
  }
}

const submitRevision=()=>{
  if(!reviseText.value.trim())return ElMessage.warning('先写下你希望怎么调整')
  const conflict=detectRevisionConflict(reviseText.value)
  if(conflict){
    ElMessageBox.alert(conflict,'需求存在冲突',{type:'warning'})
    if(currentDay.value)dayOrderIssues[currentDay.value.day]=[conflict]
    return
  }
  if(currentDay.value){
    const dayNo=currentDay.value.day
    dayRevisionHints[dayNo]=[...(dayRevisionHints[dayNo]||[]),reviseText.value.trim()]
  }
  const revision=reviseText.value.trim()
  reviseVisible.value=false
  reviseText.value=''
  regenerateCurrentDay(revision)
}

function detectRevisionConflict(text:string){
  const input=text.trim()
  if(/不要太累|轻松|少开|少走/.test(input)&&/一天|当天/.test(input)&&/(乐山|峨眉|都江堰|青城山|跨城|三个城市|四个城市)/.test(input)){
    return '调整要求同时强调轻松/少走，又要求当天加入长距离跨城点，和当前轻松自驾设定冲突。'
  }
  if(/午餐|吃饭/.test(input)&&/(凌晨|早上|晚上|夜里)/.test(input)){
    return '用餐时间要求和正常饭点冲突，请改成午餐或晚餐附近的时间。'
  }
  return ''
}

const createOrder=async()=>{
  if(!plan.value||!result.value?.requirement)return
  saving.value=true
  try{
    if(hasRental.value&&selectedBackendQuote.value){
      const response=await rentalApi.createOrder({
        conversationId:result.value.conversationId,
        requirement:result.value.requirement,
        tripPlan:plan.value,
        selectedQuote:selectedBackendQuote.value,
        protectionPackageCode:'BASE',
        protectionPackageName:'基础保障',
        protectionFeeCent:0,
        contactName:'user',
        contactPhone:'13800000000',
        remark:`${selectedQuote.value?.name||'租车套餐'} 自驾行程订单`,
      })
      rentalOrderId.value=response.id
    }else{
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
    }
    orderCreated.value=true
    step.value='ORDER_CREATED'
    ElMessage.success(hasRental.value?'租车订单已创建':'行程已保存，订单已创建')
  }finally{
    saving.value=false
  }
}

const sandboxPay=async()=>{
  if(!orderCreated.value)return ElMessage.info('请先创建订单')
  if(rentalOrderId.value){
    const pay=await rentalApi.alipayPagePay(rentalOrderId.value)
    const payWindow=window.open('', '_blank')
    if(payWindow){
      payWindow.document.open()
      payWindow.document.write(pay.formHtml)
      payWindow.document.close()
    }else{
      const container=document.createElement('div')
      container.innerHTML=pay.formHtml
      document.body.appendChild(container)
      const formEl=container.querySelector('form') as HTMLFormElement|null
      formEl?.submit()
    }
    ElMessage.success('已打开支付宝沙箱收银台')
    return
  }
  paid.value=true
  step.value='PAID'
  ElMessage.success(rentalOrderId.value?'租车订单支付确认完成':'支付确认完成，行程已进入待出行状态')
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
  const dayCount=normalizeTripDays(requirement.days)
  const builtDays:BuilderDay[]=Array.from({length:dayCount},(_,index)=>{
    const day=byDay.get(index+1)||emptyTripDay(index+1,requirement)
    const timeline=day.timeline?.length?day.timeline:[]
    const activities=timeline||[]
    const route=activities.filter(item=>!isUtilityTimelineType(item.type)).map(item=>item.title.split('→')[0].trim()).filter(Boolean).slice(0,5)
    const tickets=day.estimatedCost?.tickets??Math.max(0,activities.filter(item=>!isUtilityTimelineType(item.type)).reduce((sum,item)=>sum+(item.cost||0),0)*requirement.peopleCount)
    const foodCost=day.estimatedCost?.food??activities.filter(item=>['LUNCH_AREA','DINNER_AREA'].includes(String(item.type||''))).reduce((sum,item)=>sum+Number(item.cost||0),0)
    const hotelCost=tripPlan.budgetSummary.hotel??0
    const traffic=day.estimatedCost?.transport??requirement.peopleCount*40
    const other=hotelCost
    const dayFood=Array.isArray(day.food)?day.food:[day.food].filter(Boolean)
    const moments=activities
      .slice()
      .sort((left:any,right:any)=>Number(left.order||0)-Number(right.order||0))
      .map((activity,activityIndex)=>buildMoment(`activity-${day.day}-${activity.order||activityIndex}`,periodForIndex(activityIndex),timeForIndex(activityIndex),normalizeRentalActivity(activity,rentalEnabled),image,rentalMomentTags(activity)))
    const travelPace=paceLabel(day.intensity||requirement.pace)
    return {
      day:day.day,
      title:polishDayTitle(day.title,day.day,requirement.destination,activities),
      subtitle:activities.length?daySubtitle(day,activities,travelPace,rentalEnabled):'行程时间线缺失，请重新生成这一日',
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
        total:tickets+foodCost+traffic+other,
        foodSource:day.estimatedCost?.foodSource,
        transportSource:day.estimatedCost?.transportSource,
        excludesUnknownItems:day.estimatedCost?.excludesUnknownItems,
      },
      rental:{enabled:rentalEnabled,departure:`${requirement.destination}核心范围`,duration:'地图计算中',mileage:0,fuelCost:traffic},
      tips:uniqueTips([
        activities.length?'':'当前返回缺少后端 timeline，请重新生成当天行程。',
        `今日节奏：${travelPace}`,
        day.diningArea||dayFood.length?`餐饮建议：${shortText(day.diningArea||dayFood.join('、'),18)}`:'',
        day.accommodation||tripPlan.accommodation?`住宿建议：${shortText(day.accommodation||tripPlan.accommodation,18)}`:'',
        ...(day.tips||[]).map(tip=>polishTip(tip)),
        rentalEnabled?'自驾当天请提前确认停车场与限行规则。':'夜间返程优先选择网约车或地铁主线。',
      ].filter(Boolean)).slice(0,3),
    }
  })
  return builtDays
}

function isUtilityTimelineType(type?:string){
  return ['RENTAL_PICKUP','CAR_RETURN_SERVICE','DAY_START','TRANSFER','LUNCH_AREA','DINNER_AREA','STAY_AREA'].includes(String(type||''))
}

function hasMomentLocation(moment:DayMoment){
  return typeof moment.lng==='number'&&typeof moment.lat==='number'
}

function isRouteOnlyMoment(moment:{type?:string}){
  return ['RENTAL_PICKUP','CAR_RETURN_SERVICE','TRANSFER'].includes(String(moment.type||''))
}

function normalizeRentalActivity(activity:any,rentalEnabled:boolean){
  if(!rentalEnabled||!activity?.transportSuggestion)return activity
  return {
    ...activity,
    transportSuggestion:String(activity.transportSuggestion)
      .replace(/打车约\s*¥?\d+/g,'自驾能耗/停车成本以实际为准')
      .replace(/建议打车衔接/g,'建议自驾衔接')
      .replace(/短途打车/g,'短途自驾')
      .replace(/步行或打车/g,'步行或自驾'),
  }
}

async function ensureDayGenerated(index:number,forceRegenerate=false,revisionText=''){
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
  const day=await aiApi.generateDay(generationSessionId.value,target.day,{requestMode:'USER',forceRegenerate,prefetchNext:!forceRegenerate,revisionText})
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
    city:activity?.city,
    lng:activity?.lng,
    lat:activity?.lat,
    openingHours:activity?.openingHours,
    rating:activity?.rating,
    averageCost:activity?.averageCost,
    businessArea:activity?.businessArea,
    imageUrls:activity?.imageUrls,
    type:activity?.type,
    compact:activity?.compact,
    order:activity?.order,
  }
}

function rentalMomentTags(activity:any){
  if(activity.type==='RENTAL_PICKUP')return ['接车','租车']
  if(activity.type==='TRANSFER')return ['路程','自驾']
  if(activity.type==='DAY_START')return ['从酒店出发','出发']
  if(activity.type==='CAR_RETURN_SERVICE')return ['上门取车','租车']
  return ['景点']
}

function normalizeDailyFoodCost(value:number|undefined,peopleCount:number){
  const people=Math.max(1,peopleCount||1)
  const fallback=people*70
  const amount=Number(value||fallback)
  return Math.min(Math.max(amount,people*45),people*110)
}

function visitSummary(activity:any){
  const title=activity?.title||activity?.name||'这里'
  if(activity?.description)return activity.description
  if(activity?.subtitle)return activity.subtitle
  const tags=(activity?.tags||[]).join(' ')
  const type=String(activity?.type||tags)
  if(activity?.type==='DAY_START')return '从酒店出发。'
  if(activity?.type==='TRANSFER')return '前往下一站。'
  if(activity?.type==='RENTAL_PICKUP')return '完成验车后开始行程。'
  if(activity?.type==='CAR_RETURN_SERVICE')return '工作人员将在住宿区域附近上门取车。'
  if(activity?.type==='LUNCH_AREA')return '午餐区域。'
  if(activity?.type==='DINNER_AREA')return '晚餐区域。'
  if(activity?.type==='STAY_AREA')return '住宿区域。'
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

</script>

<template>
  <div class="ai-workspace" :class="{ 'planning-landing': landingMode }">
    <section v-if="landingMode" class="trip-hero product-hero">
      <div class="studio-shell">
        <div class="studio-panel" :class="{ analyzing }">
          <header class="studio-head">
            <div>
              <p class="hero-kicker">PLANGO AI TRIP STUDIO</p>
              <h1>把一句旅行想法，整理成可确认的每日行程</h1>
            </div>
            <div class="studio-status">
              <span></span>
              <b>{{ analyzing ? 'AI 工作中' : 'Ready' }}</b>
            </div>
          </header>
          <p class="hero-lead">像和旅行策划师聊天一样写下目的地、天数、同行人、预算和偏好，PlanGo 会把模糊想法拆成可调整的路线草案。</p>

          <div class="hero-input-shell">
            <div class="prompt-toolbar">
              <span>Prompt</span>
              <span>智能识别目的地 / 天数 / 预算 / 偏好</span>
            </div>
            <textarea
              v-model="userInput"
              maxlength="300"
              placeholder="例如：带父母去杭州玩 3 天，杭州东站下车，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算 4000 以内。"
            />
            <div class="hero-input-actions">
              <div class="input-hint">
                <b>{{ userInput.length }}/300</b>
                <span>描述越具体，AI 越容易一次理解</span>
              </div>
              <button type="button" :disabled="analyzing" @click="analyze">
                <el-icon><Loading v-if="analyzing" class="is-loading"/><MagicStick v-else/></el-icon>
                {{ analyzing ? 'AI 正在理解需求' : '开始规划' }}
              </button>
            </div>
          </div>

          <div class="quick-fields">
            <button type="button" v-if="editingField!='dest'" @click="editingField='dest'"><b>目的地</b><span>{{ form.destination || '自动识别' }}</span></button>
            <label v-else class="quick-edit"><b>目的地</b><input v-model="form.destination" placeholder="输入城市名" @blur="editingField=''" @keyup.enter="editingField=''" ref="fieldInput"/></label>
            <button type="button" v-if="editingField!='days'" @click="editingField='days'"><b>天数</b><span>{{ form.days }} 天</span></button>
            <label v-else class="quick-edit"><b>天数</b><input v-model.number="form.days" type="number" min="1" max="7" @blur="editingField=''" @keyup.enter="editingField=''" ref="fieldInput"/></label>
            <button type="button" v-if="editingField!='people'" @click="editingField='people'"><b>人数</b><span>{{ form.peopleCount }} 人</span></button>
            <label v-else class="quick-edit"><b>人数</b><input v-model.number="form.peopleCount" type="number" min="1" max="20" @blur="editingField=''" @keyup.enter="editingField=''" ref="fieldInput"/></label>
            <button type="button" v-if="editingField!='budget'" @click="editingField='budget'"><b>预算</b><span>¥{{ form.budget }} 内</span></button>
            <label v-else class="quick-edit"><b>预算</b><input v-model.number="form.budget" type="number" min="0" step="500" @blur="editingField=''" @keyup.enter="editingField=''" ref="fieldInput"/></label>
          </div>

          <div v-if="analyzing" class="studio-running" aria-live="polite">
            <div class="running-orbit">
              <el-icon><MagicStick/></el-icon>
            </div>
            <div class="running-copy">
              <b>正在拆解你的旅行需求</b>
              <span>识别城市、天数、节奏和预算，准备进入下一步确认。</span>
            </div>
            <div class="running-steps">
              <span class="active">理解输入</span>
              <span>补全信息</span>
              <span>生成路线</span>
            </div>
            <i></i>
          </div>
        </div>

        <aside class="studio-preview">
          <img :src="homeImage('hangzhou.jpg', true)" alt="行程预览">
          <div class="preview-topline">
            <span>杭州</span>
            <span>3 天</span>
            <span>示例行程</span>
          </div>
          <div class="preview-card">
            <span>AI Preview</span>
            <b>杭州 3 日轻松慢游</b>
            <p>西湖漫步、历史街区、本地餐饮与舒适交通安排。</p>
          </div>
          <div class="preview-stats">
            <div><b>节奏轻松</b></div>
            <div><b>逐日确认</b></div>
            <div><b>路线联动</b></div>
          </div>
        </aside>
      </div>

      <section class="inspiration-block">
        <div class="section-head">
          <h3>旅行灵感</h3>
          <span>选一个模板，马上替换输入内容</span>
        </div>
        <div class="inspiration-grid">
          <button @click="applyExample('上海出发，带父母去杭州玩3天，杭州东站下车，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算在4000元以内。')"><span>高铁到达</span><b>杭州父母慢游</b><small>东站取车 · 同城还车</small></button>
          <button @click="applyExample('上海出发，飞到成都玩3天，成都双流机场下飞机，想租车自驾，喜欢自然风光、历史文化和美食，节奏轻松，预算在5000元以内。')"><span>机场落地</span><b>成都落地自驾</b><small>机场到达 · 近郊自驾</small></button>
          <button @click="applyExample('重庆出发，去成都和都江堰玩4天，成都东站下车，想租车自驾，多城市串联，喜欢美食和历史文化，预算在6000元以内。')"><span>跨城测试</span><b>成都周边串联</b><small>多城市 · 异地还车</small></button>
          <button @click="applyExample('上海出发，亲子去苏州玩2天，苏州站下车，想租车自驾，轻松一点，喜欢园林、古镇和本地美食，预算在3000元以内。')"><span>亲子短途</span><b>苏州周末自驾</b><small>车站到达 · 城市短途</small></button>
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
        <h1>确认出行基础信息，生成首日行程</h1>
        <p>PlanGo 已经整理出旅行轮廓，只需要确认会影响路线、交通和节奏的关键细节。</p>
      </div>

      <section class="planning-console" :class="{ processing: analyzing }">
        <header class="console-summary">
          <div>
            <span class="console-kicker">行程概要</span>
            <h2>{{ activeRequirement.destination || fieldValue('destination') || '目的地待确认' }} {{ activeRequirement.days || fieldValue('days') || 3 }} 日旅行</h2>
            <p>回答越明确，第一天路线越贴近真实出行；不确定也可以交给 PlanGo 做轻松安排。</p>
          </div>
          <button class="edit-summary-btn" :disabled="analyzing" @click="reopenPromptEditor">重新编辑</button>
        </header>

        <div class="followup-layout">
          <div class="followup-main">
            <div class="summary-strip">
              <div><span>目的地</span><b>{{ activeRequirement.destination || fieldValue('destination') || '待确认' }}</b></div>
              <div><span>天数</span><b>{{ activeRequirement.days || fieldValue('days') || '待确认' }}</b></div>
              <div><span>人数</span><b>{{ activeRequirement.peopleCount || fieldValue('peopleCount') || '待确认' }}</b></div>
              <div><span>预算</span><b>{{ activeRequirement.budget ? `¥${activeRequirement.budget}以内` : fieldValue('budget') || '待确认' }}</b></div>
            </div>

            <div class="followup-task">
              <div class="task-heading">
                <span>{{ pendingQuestions.length }} 项待确认</span>
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
                      :disabled="analyzing"
                      @click="chooseFollowUpOption(question.field, option)"
                    >
                      {{ option }}
                    </button>
                  </div>
                  <input
                    :value="followUpAnswers[question.field]"
                    :disabled="analyzing"
                    placeholder="也可以直接输入，例如：上海虹桥站"
                    @input="updateFollowUpAnswer(question.field, ($event.target as HTMLInputElement).value)"
                  >
                </article>
              </div>
            </div>
          </div>

          <aside class="followup-side">
            <div class="side-card ai-readiness">
              <span>AI 已理解</span>
              <b>{{ activeRequirement.preferences.join('、') || '偏好待确认' }}</b>
              <p>{{ userInput }}</p>
            </div>
            <div class="side-card generation-steps">
              <div :class="{ active: !analyzing }"><i></i><span>确认缺失信息</span></div>
              <div :class="{ active: analyzing }"><i></i><span>整理路线约束</span></div>
              <div :class="{ active: analyzing }"><i></i><span>生成首日行程草案</span></div>
            </div>
          </aside>
        </div>

        <footer class="console-actions">
          <span>{{ analyzing ? 'PlanGo 正在整理你的补充信息，请稍等。' : '不确定的内容可以交给 PlanGo 按轻松路线处理。' }}</span>
          <button class="generate-day-btn" :disabled="analyzing" @click="submitFollowUp">
            <el-icon><Loading v-if="analyzing" class="is-loading"/><MagicStick v-else/></el-icon>
            {{ analyzing ? '正在生成首日行程' : '确认并生成首日行程' }}
          </button>
        </footer>
      </section>
    </section>

    <div class="container builder-container">
      <RequirementSummaryBar
        v-if="ready&&(step==='ANALYZED'||step==='QUOTE_SELECT'||step==='RENTAL_DETAILS')"
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
        :loading="quoteLoading"
        :pickup-text="rentalContext?.pickupPlan?.displayText"
        @select="selectQuote"
        @continue="continueToRentalDetails"
      />

      <section v-if="step==='RENTAL_DETAILS'" class="rental-detail-step builder-card">
        <div class="rental-detail-head">
          <div>
            <span>SELF DRIVE DETAILS</span>
            <h2>补充一点自驾信息</h2>
            <p>回答这些内容，生成的自驾行程会更精准；不填也可以，PlanGo 会按轻松路线处理。</p>
          </div>
          <strong>{{ selectedQuote?.name }}</strong>
        </div>
        <div class="rental-detail-grid">
          <label>
            <span>到达方式</span>
            <select v-model="rentalTripForm.arrivalMode">
              <option>机场到达</option>
              <option>高铁/火车站到达</option>
              <option>酒店/住宿点出发</option>
              <option>指定地址交车</option>
              <option>还不确定</option>
            </select>
          </label>
          <label>
            <span>到达时间</span>
            <select v-model="rentalTripForm.arrivalTimeRange">
              <option>上午到达</option>
              <option>中午到达</option>
              <option>下午到达</option>
              <option>晚上到达</option>
              <option>按到达时间安排</option>
            </select>
          </label>
          <label>
            <span>游玩范围</span>
            <select v-model="rentalTripForm.routeStructure">
              <option>只玩本城</option>
              <option>城市及周边自驾</option>
              <option>多城市/跨城自驾</option>
              <option>环线自驾后回到起点</option>
              <option>还不确定</option>
            </select>
          </label>
          <label>
            <span>驾驶强度</span>
            <select v-model="rentalTripForm.dailyDrivingLimit">
              <option>城市短途（单日累计约1-2小时）</option>
              <option>近郊自驾（单日累计约2-4小时）</option>
              <option>跨城自驾（单日累计约4-6小时）</option>
              <option>长途自驾（单日累计6小时以上）</option>
            </select>
          </label>
          <label>
            <span>还车方式</span>
            <select v-model="rentalTripForm.returnMode">
              <option>同城还车</option>
              <option>异地还车</option>
            </select>
          </label>
        </div>
        <div class="rental-detail-pickup">
          <b>附加服务</b>
          <p>{{ rentalContext?.pickupPlan?.displayText || '将按你的到达点安排送车接人。' }}</p>
        </div>
        <footer>
          <button class="secondary-action" @click="step='QUOTE_SELECT'">返回换套餐</button>
          <button class="generate-day-btn" @click="startRentalTripBuilding">生成自驾行程</button>
        </footer>
      </section>

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

        <div v-if="generationNoticeVisible" class="day-generate-notice builder-card">
          <el-icon><Loading class="is-loading"/></el-icon>
          <div>
            <b>正在生成 Day {{ String(generationNoticeDay).padStart(2,'0') }}</b>
            <span>{{ generationNoticeText }}</span>
          </div>
        </div>

        <div class="builder-main">
          <DayPlanCard
            :day="currentDay"
            :selected-quote="hasRental ? selectedQuote : null"
            :confirming="confirming"
          />
          <div class="map-workbench">
            <TripRouteMap :places="currentMapPlaces" :tip="currentDay.tips[1]" @route-stats="updateRouteStats"/>
            <section class="map-control-panel builder-card">
              <div v-if="dayOrderIssues[currentDay.day]?.length" class="manual-order-alert conflict">
                <b>修改要求需要核查</b>
                <span>{{ dayOrderIssues[currentDay.day]?.[0] }}</span>
              </div>
              <div class="map-progress-dots" aria-label="行程进度">
                <template v-for="(day,index) in days" :key="day.day">
                  <button type="button" :disabled="dayBusy" :class="{ active: day.day===currentDay.day, locked: day.status==='locked', generating: day.status==='generating' }" @click="selectDay(index)">{{ String(day.day).padStart(2,'0') }}</button>
                  <i v-if="index<days.length-1"></i>
                </template>
              </div>
              <div class="map-actions">
                <button :disabled="dayBusy" @click="regenerateCurrentDay()">
                  <b>重新生成今天</b>
                  <small>只替换当前 Day</small>
                </button>
                <button :disabled="dayBusy" @click="reviseVisible=true">
                  <b>修改偏好</b>
                  <small>景点 / 餐饮 / 节奏</small>
                </button>
                <el-button class="confirm-btn" type="primary" :disabled="dayBusy" :loading="confirming" @click="confirmCurrentDay">确认 Day {{ String(currentDay.day).padStart(2,'0') }}</el-button>
              </div>
            </section>
          </div>
        </div>
      </section>

      <FinalReviewPanel
        v-if="step==='FINAL_REVIEW'||step==='ORDER_CREATED'||step==='PAID'"
        :data="{requirement:activeRequirement,days,selectedQuote:hasRental?selectedQuote:null,rentalContext,rentalTripContext:hasRental?buildRentalTripContext():null,hotelCost:plan?.budgetSummary.hotel??null}"
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
:global(.trip-friendly-message) {
  border: 1px solid rgba(14, 165, 166, .22)!important;
  border-radius: 12px!important;
  background: linear-gradient(135deg, #f0fdfa, #eff6ff)!important;
  box-shadow: 0 14px 36px rgba(15, 118, 110, .12)!important;
  color: #0f766e!important;
}

:global(.trip-friendly-message .el-message__content) {
  color: #0f766e!important;
  font-weight: 700;
}

:global(.trip-friendly-message .el-message__icon) {
  color: #14b8a6!important;
}

:global(.is-loading) {
  animation: spinLoading .9s linear infinite;
  transform-origin: center;
}

:global(.is-loading svg) {
  display: block;
}

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
  position: relative;
  display: grid;
  gap: 18px;
}

.day-generate-notice {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.day-generate-notice .el-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #0f9f8f;
  background: #ecfdf5;
  font-size: 24px;
}

.day-generate-notice b,
.day-generate-notice span {
  display: block;
}

.day-generate-notice b {
  color: #111827;
  font-size: 15px;
}

.day-generate-notice span {
  margin-top: 3px;
  color: #64748b;
  font-size: 13px;
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

.map-progress-dots button:disabled {
  cursor: not-allowed;
  opacity: .62;
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

.manual-order-alert{display:grid;grid-template-columns:120px minmax(0,1fr);gap:10px;align-items:center;padding:10px 12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#475569;font-size:13px}.manual-order-alert b{color:#1d4ed8}.manual-order-alert.conflict{border-color:#fed7aa;background:#fff7ed}.manual-order-alert.conflict b{color:#c2410c}

.map-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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

.map-actions button:disabled {
  cursor: not-allowed;
  opacity: .58;
}

.map-actions button.active {
  background:#eff6ff;
  color:#1d4ed8;
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
  min-width: 170px;
  height: 44px;
  border: 0!important;
  border-radius: 12px!important;
  background: linear-gradient(135deg,#0d9488,#10b981)!important;
  color: #fff!important;
  font-weight: 900!important;
}

.rental-detail-step{margin-top:24px;padding:24px}.rental-detail-head{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px}.rental-detail-head span{color:#2563eb;font-size:12px;font-weight:900}.rental-detail-head h2{margin:6px 0;color:#111827}.rental-detail-head p{margin:0;color:#64748b}.rental-detail-head strong{align-self:flex-start;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:8px 12px;white-space:nowrap}.rental-detail-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.rental-detail-grid label{display:grid;gap:7px}.rental-detail-grid span{color:#64748b;font-size:13px;font-weight:800}.rental-detail-grid select{width:100%;height:42px;border:1px solid #dbe7f0;border-radius:10px;background:#fff;color:#172033;padding:0 10px;outline:0}.rental-detail-pickup{margin-top:16px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;padding:14px 16px}.rental-detail-pickup b{color:#172033}.rental-detail-pickup p{margin:6px 0 0;color:#64748b}.rental-detail-step footer{display:flex;justify-content:flex-end;gap:12px;margin-top:18px}.secondary-action{height:44px;border:1px solid #dbe7f0;border-radius:12px;background:#fff;color:#172033;padding:0 18px;font-weight:900;cursor:pointer}

.product-hero {
  min-height: calc(100vh - 72px);
  display: block;
  padding: 38px 24px 58px;
  background:
    radial-gradient(circle at 14% 12%, rgba(15, 159, 143, .09), transparent 32%),
    radial-gradient(circle at 86% 10%, rgba(37, 99, 235, .08), transparent 34%),
    linear-gradient(180deg,#fbfdff 0%,#f5f8fb 58%,#f7fafc 100%);
  text-align: left;
}

.studio-shell {
  width: min(1360px, calc(100vw - 64px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0,1fr) 430px;
  gap: 24px;
  align-items: stretch;
}

.studio-panel {
  position: relative;
  overflow: hidden;
  padding: 26px;
  border: 1px solid rgba(203, 213, 225, .82);
  border-radius: 22px;
  background:
    linear-gradient(180deg,rgba(255,255,255,.96),rgba(250,253,255,.92)),
    rgba(255,255,255,.94);
  box-shadow: 0 22px 54px rgba(15,23,42,.09);
}

.studio-panel:before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg,rgba(15,159,143,.10),transparent 20%,transparent 82%,rgba(37,99,235,.09)),
    linear-gradient(180deg,rgba(255,255,255,.72),transparent 38%);
}

.studio-panel.analyzing:after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(110deg,transparent 0%,rgba(37,99,235,.10) 42%,rgba(15,159,143,.18) 50%,rgba(37,99,235,.10) 58%,transparent 100%);
  transform: translateX(-100%);
  animation: studioScan 1.8s ease-in-out infinite;
}

.studio-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.hero-kicker {
  margin: 0 0 12px;
  display: inline-flex;
  align-items: center;
  width: max-content;
  border: 1px solid rgba(15, 159, 143, .18);
  border-radius: 999px;
  padding: 7px 11px;
  color: #0f766e;
  background: rgba(236, 253, 245, .82);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1.4px;
  text-transform: uppercase;
}

.studio-panel h1 {
  max-width: 760px;
  margin: 0;
  color: #0f172a;
  font-size: 46px;
  line-height: 1.12;
  letter-spacing: 0;
}

.studio-status {
  flex: 0 0 auto;
  min-width: 92px;
  height: 36px;
  border: 1px solid rgba(15,159,143,.18);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #0f766e;
  background: rgba(236,253,245,.76);
  font-size: 12px;
}

.studio-status span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 5px rgba(16,185,129,.12);
}

.studio-panel.analyzing .studio-status span {
  animation: statusPulse 1s ease-in-out infinite;
}

.hero-lead {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 14px 0 22px;
  color: #64748b;
  font-size: 15px;
  line-height: 1.75;
}

.product-hero .hero-input-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 214px;
  grid-template-columns: 1fr;
  padding: 16px;
  border: 1px solid rgba(203,213,225,.92);
  border-radius: 18px;
  background:
    linear-gradient(180deg,#fff,#fbfdff);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7),0 18px 42px rgba(15,23,42,.08);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.product-hero .hero-input-shell:focus-within {
  border-color: rgba(37, 99, 235, .62);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .10),0 18px 42px rgba(15,23,42,.10);
  transform: translateY(-1px);
}

.prompt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #94a3b8;
  font-size: 12px;
}

.prompt-toolbar span:first-child {
  color: #0f766e;
  font-weight: 900;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.product-hero .hero-input-shell textarea {
  height: 116px;
  padding: 2px;
  border: 0;
  outline: 0;
  resize: none;
  color: #172033;
  background: transparent;
  font-size: 15px;
  line-height: 1.72;
}

.product-hero .hero-input-shell textarea::placeholder {
  color: #9aa8b8;
}

.hero-input-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #edf2f7;
  padding-top: 12px;
  gap: 16px;
}

.input-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.input-hint b {
  color: #334155;
  font-size: 12px;
}

.input-hint span {
  color: #7b8798;
  font-size: 12px;
}

.hero-input-actions button {
  position: relative;
  overflow: hidden;
  min-width: 182px;
  height: 48px;
  border: 0;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg,#0f9f8f,#2563eb);
  box-shadow: 0 16px 32px rgba(37, 99, 235, .24);
  font-weight: 900;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
}

.hero-input-actions button:before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);
  transform: translateX(-110%);
  transition: transform .45s ease;
}

.hero-input-actions button:hover:not(:disabled):before,
.hero-input-actions button:disabled:before {
  transform: translateX(110%);
}

.hero-input-actions button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(37, 99, 235, .30);
  filter: saturate(1.06);
}

.hero-input-actions button:active:not(:disabled) {
  transform: translateY(0) scale(.97);
}

.hero-input-actions button:disabled {
  cursor: not-allowed;
  opacity: .92;
  box-shadow: 0 12px 26px rgba(37, 99, 235, .20);
}

.product-hero .quick-fields {
  position: relative;
  z-index: 1;
  width: 100%;
  grid-template-columns: repeat(4,1fr);
  margin-top: 14px;
  gap: 12px;
}

.product-hero .quick-fields button {
  height: 72px;
  border-radius: 16px;
  background: #f8fafc;
  box-shadow: none;
  transition: border-color .18s ease, background .18s ease, transform .18s ease;
}

.product-hero .quick-fields button:hover {
  border-color: #cfe0ee;
  background: #fff;
  transform: translateY(-1px);
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
.quick-edit{height:72px;border:1px solid #e3eaf2;border-radius:16px;background:#f8fafc;display:flex;flex-direction:column;justify-content:center;padding:10px 14px;gap:4px}
.quick-edit b{font-size:13px;color:#687589}
.quick-edit input{width:100%;border:0;outline:0;background:transparent;font-size:16px;font-weight:900;color:#101827;padding:0}
.quick-edit input::placeholder{color:#94a3b8;font-weight:400}

.studio-running {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  border: 1px solid rgba(37,99,235,.16);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 48px minmax(0,1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  background: linear-gradient(135deg,rgba(239,246,255,.95),rgba(236,253,245,.90));
  box-shadow: 0 16px 36px rgba(37,99,235,.10);
}

.studio-running > i {
  grid-column: 1/-1;
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(203,213,225,.75);
}

.studio-running > i:before {
  content: "";
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg,#0f9f8f,#2563eb);
  animation: runningBar 1.25s ease-in-out infinite;
}

.running-orbit {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg,#0f9f8f,#2563eb);
  box-shadow: 0 14px 28px rgba(37,99,235,.22);
  animation: floatPulse 1.4s ease-in-out infinite;
}

.running-copy b,
.running-copy span {
  display: block;
}

.running-copy b {
  color: #0f172a;
  font-size: 15px;
}

.running-copy span {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.running-steps {
  grid-column: 1/-1;
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
}

.running-steps span {
  border-radius: 999px;
  background: rgba(255,255,255,.74);
  color: #64748b;
  padding: 7px 10px;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}

.running-steps span.active {
  color: #0f766e;
  background: #fff;
  box-shadow: 0 8px 18px rgba(15,159,143,.12);
}

.studio-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.70);
  border-radius: 22px;
  min-height: 504px;
  color: #fff;
  background: #10233f;
  box-shadow: 0 28px 70px rgba(15,23,42,.18);
}

.studio-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.06);
}

.studio-preview:after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg,rgba(7,16,30,.22) 0%,rgba(7,16,30,.20) 34%,rgba(7,16,30,.88) 100%),
    linear-gradient(90deg,rgba(7,16,30,.46),transparent 54%);
}

.preview-topline {
  position: absolute;
  z-index: 1;
  top: 18px;
  left: 18px;
  right: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-topline span,
.preview-card span {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(255,255,255,.20);
  border-radius: 999px;
  background: rgba(255,255,255,.16);
  backdrop-filter: blur(12px);
  padding: 6px 10px;
  color: rgba(255,255,255,.92);
  font-size: 12px;
  font-weight: 900;
}

.preview-card,
.preview-stats {
  position: absolute;
  z-index: 1;
  left: 20px;
  right: 20px;
}

.preview-card { bottom: 94px; }
.preview-card b { display:block;margin-top:10px;font-size:25px; }
.preview-card p { margin:8px 0 0;color:rgba(255,255,255,.78);line-height:1.55; }
.preview-stats { bottom:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
.preview-stats div {
  min-height: 44px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.14);
  padding: 10px;
  backdrop-filter: blur(10px);
}
.preview-stats b { color:#fff;font-size:13px; }

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
.product-hero .inspiration-grid button {
  position: relative;
  overflow: hidden;
  height:132px;
  border-radius:18px;
  padding:16px;
  background:linear-gradient(180deg,#fff,#fbfdff);
  box-shadow:0 14px 34px rgba(15,23,42,.07);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.product-hero .inspiration-grid button:hover {
  border-color: rgba(37,99,235,.22);
  transform: translateY(-5px);
  box-shadow:0 24px 52px rgba(15,23,42,.13);
}
.product-hero .inspiration-grid button:active {
  transform: translateY(-2px) scale(.99);
}
.product-hero .inspiration-grid span {
  border: 1px solid rgba(15, 159, 143, .16);
  background: linear-gradient(135deg,#ecfdf5,#eff6ff);
  color: #0f766e;
  box-shadow: 0 8px 18px rgba(15, 159, 143, .10);
}
.product-hero .inspiration-grid b { margin-top:28px;font-size:17px; }
.product-hero .inspiration-grid small { font-size:12px; }

@keyframes studioScan {
  0% { transform: translateX(-110%); }
  58%, 100% { transform: translateX(110%); }
}

@keyframes statusPulse {
  0%, 100% { box-shadow: 0 0 0 5px rgba(16,185,129,.12); transform: scale(1); }
  50% { box-shadow: 0 0 0 9px rgba(16,185,129,.18); transform: scale(1.16); }
}

@keyframes spinLoading {
  to { transform: rotate(360deg); }
}

@keyframes runningBar {
  0% { transform: translateX(-105%); }
  50% { transform: translateX(72%); }
  100% { transform: translateX(250%); }
}

@keyframes floatPulse {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(-4deg); }
}

.product-followup {
  min-height: calc(100vh - 72px);
  padding: 34px 48px 56px;
  background:
    radial-gradient(circle at 16% 16%, rgba(15,159,143,.10), transparent 30%),
    radial-gradient(circle at 88% 12%, rgba(37,99,235,.08), transparent 32%),
    linear-gradient(180deg,#fbfdff,#f4f8fb);
}

.followup-top {
  max-width: 1220px;
  margin: 0 auto 20px;
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
  font-size: 34px;
  line-height: 1.16;
  letter-spacing: 0;
}

.followup-top p {
  margin: 0;
  color: #64748b;
}

.planning-console {
  position: relative;
  overflow: hidden;
  max-width: 1220px;
  margin: 0 auto;
  border: 1px solid #e5edf5;
  border-radius: 24px;
  background: rgba(255,255,255,.94);
  box-shadow: 0 22px 58px rgba(15,23,42,.08);
  padding: 26px;
}

.planning-console.processing:before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  background: linear-gradient(90deg,#0f9f8f,#2563eb,#0f9f8f);
  background-size: 180% 100%;
  animation: followupSweep 1.3s ease-in-out infinite;
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

.console-summary p {
  max-width: 680px;
  margin: 8px 0 0;
  color: #64748b;
  line-height: 1.7;
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

.edit-summary-btn:hover:not(:disabled) {
  border-color: #bdd7ec;
  background: #f8fbff;
  color: #2563eb;
}

.edit-summary-btn:disabled {
  cursor: not-allowed;
  opacity: .6;
}

.followup-layout {
  display: grid;
  grid-template-columns: minmax(0,1fr) 320px;
  gap: 18px;
  margin-top: 22px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 10px;
  margin: 0 0 14px;
}

.summary-strip div {
  min-width: 0;
  border: 1px solid #edf2f7;
  border-radius: 14px;
  background: linear-gradient(180deg,#fff,#fbfdff);
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
  border: 1px solid #e4edf6;
  border-radius: 18px;
  background: linear-gradient(180deg,#fff,#fbfdff);
  padding: 20px;
}

.task-heading {
  display: flex;
  align-items: center;
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
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border-color: #e6edf5;
  background: linear-gradient(180deg,#fff,#fcfeff);
  padding: 18px 18px 18px 46px;
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}

.product-followup .question-list article:focus-within,
.product-followup .question-list article:hover {
  border-color: rgba(15,159,143,.28);
  box-shadow: 0 14px 34px rgba(15,23,42,.06);
  transform: translateY(-1px);
}

.product-followup .question-list i {
  left: 16px;
  top: 20px;
}

.product-followup .question-list input {
  height: 42px;
  margin-top: 12px;
}

.product-followup .question-list input:disabled,
.product-followup .question-list button:disabled {
  cursor: not-allowed;
  opacity: .72;
}

.followup-side {
  display: grid;
  gap: 12px;
  align-content: start;
}

.side-card {
  border: 1px solid #e4edf6;
  border-radius: 18px;
  background: linear-gradient(180deg,#fff,#fbfdff);
  padding: 18px;
}

.ai-readiness span {
  color: #0f766e;
  font-size: 12px;
  font-weight: 900;
}

.ai-readiness b {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
}

.ai-readiness p {
  margin: 12px 0 0;
  border-radius: 12px;
  background: #f7fafc;
  color: #64748b;
  padding: 12px;
  line-height: 1.7;
  font-size: 13px;
}

.generation-steps {
  display: grid;
  gap: 13px;
}

.generation-steps div {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 10px;
  align-items: center;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.generation-steps i {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
}

.generation-steps div.active {
  color: #0f766e;
}

.generation-steps div.active i {
  border-color: #10b981;
  background: #10b981;
  box-shadow: 0 0 0 6px rgba(16,185,129,.10);
  animation: statusPulse 1.2s ease-in-out infinite;
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
  width: 286px;
  height: 50px;
  border-radius: 14px;
  margin-top: 0;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
}

.product-followup .generate-day-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(16,185,129,.22);
}

.product-followup .generate-day-btn:disabled {
  cursor: wait;
  filter: saturate(.92);
  opacity: .9;
}

@keyframes followupSweep {
  0% { background-position: 0% 50%; }
  100% { background-position: 180% 50%; }
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
  .studio-shell {
    grid-template-columns: 1fr;
  }
  .studio-preview {
    min-height: 360px;
  }
  .followup-layout {
    grid-template-columns: 1fr;
  }
  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
  .product-hero {
    padding: 26px 16px 42px;
  }
  .studio-shell,
  .product-hero .inspiration-block {
    width: 100%;
  }
  .studio-panel {
    padding: 24px;
    border-radius: 20px;
  }
  .studio-panel h1 {
    font-size: 31px;
  }
  .hero-input-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .input-hint {
    justify-content: space-between;
  }
  .hero-input-actions button {
    width: 100%;
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
