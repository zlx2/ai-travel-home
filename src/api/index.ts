import requestClient from '../utils/request'
import { USE_MOCK, comments, delay, destinations, notes, persist, tags, trips, users, buildPlan } from '../data/mock'
import { TOKEN_KEY } from '../utils/auth'
import type { AnalyzeResult, Comment, GenerateProgressEvent, GenerateResult, Note, PageResult, RecommendationContext, Requirement, Trip, TripDay, TripPlan, UserInfo } from '../types'
import { homeImage } from '../utils/homeImages'
const request:any=requestClient
const AI_GENERATE_TIMEOUT_MS=240000
const HOME_TIMEOUT_MS=3000
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

const page=<T>(list:T[],pageNum=1,pageSize=10):PageResult<T>=>({list:list.slice((pageNum-1)*pageSize,pageNum*pageSize),total:list.length,pageNum,pageSize})
const mockHome=()=>({hotDestinations:destinations.slice(0,6),hotNotes:notes.filter(n=>n.status===1).slice(0,3),hotTags:tags,recommendedTrips:[{destination:'重庆',days:3,preferences:['美食','夜景']},{destination:'成都',days:4,preferences:['美食','轻松游']},{destination:'西安',days:3,preferences:['历史文化','拍照打卡']},{destination:'厦门',days:3,preferences:['海岛','轻松游']}]})
export interface ConnectionCheckResult { message:string; receivedAction:string; receivedAt:string }
export interface UserProfileStats { tripCount:number; noteCount:number; likeCount:number; favoriteCount:number }
export const connectionApi={
  check(action:string){return request.post('/debug/connect',{action}) as Promise<ConnectionCheckResult>},
}
export const authApi={
  login(payload:{account:string;password:string}){return request.post('/auth/login',payload) as Promise<{token:string;user:UserInfo}>},
  register(payload:{username:string;email:string;password:string;emailCode:string}){return request.post('/auth/register',payload) as Promise<{id:number}>},
  sendCode(email:string){return request.post('/auth/email-code',{email,scene:'register'}) as Promise<void>},
  logout(){return request.post('/auth/logout') as Promise<void>},
}
export const homeApi={async getHome(){if(!USE_MOCK){try{return await request.get('/home',{suppressError:true,timeout:HOME_TIMEOUT_MS})}catch{return mockHome()}}await delay();return mockHome()}}
export const aiApi={
  async analyze(payload:{conversationId?:string|null;userInput:string;extraAnswers?:string[];requirement?:Partial<Requirement>}):Promise<AnalyzeResult>{if(!USE_MOCK)return request.post('/ai/trips/analyze',payload);await delay(850);const text=[payload.userInput,...(payload.extraAnswers||[])].join(' ');const dest=payload.requirement?.destination||destinations.find(d=>text.includes(d.name))?.name||'';const departure=payload.requirement?.departure||text.match(/从([^去出发，, ]+)/)?.[1]||'';const days=Number(text.match(/(\d+)\s*天/)?.[1]||payload.requirement?.days||0);const questions=[];if(!departure)questions.push({field:'departure',question:'你准备从哪个城市出发？',required:true});if(!dest)questions.push({field:'destination',question:'你这次想去哪个目标城市？',required:true});if(!days)questions.push({field:'days',question:'这次旅行大概安排几天？',required:true});if(questions.length)return{conversationId:payload.conversationId||crypto.randomUUID(),status:'NEED_MORE_INFO',requirement:{...payload.requirement,departure,destination:dest,days} as Requirement,questions};const budget=Number(text.match(/预算\s*(\d+)/)?.[1]||payload.requirement?.budget||2000);const preferences=payload.requirement?.preferences?.length?payload.requirement.preferences:['美食','夜景'];return{conversationId:payload.conversationId||crypto.randomUUID(),status:'READY',requirement:{departure,destination:dest,days,budget,budgetType:'TOTAL',peopleCount:payload.requirement?.peopleCount||2,preferences,pace:payload.requirement?.pace||'LIGHT',avoidances:payload.requirement?.avoidances||['不早起'],travelDate:payload.requirement?.travelDate}}},
  async generate(conversationId:string,requirement:Requirement):Promise<GenerateResult>{if(!USE_MOCK){const data=await request.post('/ai/trips/generate',{conversationId,requirement},{timeout:AI_GENERATE_TIMEOUT_MS,suppressError:true});return normalizeGenerateResult(data)}await delay(1500);return{conversationId,requirement,recommendationContext:mockRecommendation(requirement),tripPlan:buildPlan(requirement)}},
  async generateDay(sessionId:string,dayNo:number,options?:{requestMode?:'USER'|'PREFETCH'|'ASYNC';forceRegenerate?:boolean;prefetchNext?:boolean}):Promise<TripDay>{if(USE_MOCK){await delay(900);return buildPlan({departure:'',destination:'杭州',days:dayNo,budget:0,budgetType:'TOTAL',peopleCount:2,preferences:[],pace:'LIGHT',avoidances:[]}).dailyPlans[dayNo-1]}const maxAttempts=60;for(let attempt=0;attempt<maxAttempts;attempt++){const data=await request.post(`/ai/trips/generate/session/${sessionId}/days/${dayNo}`,null,{params:{requestMode:options?.requestMode||'USER',forceRegenerate:attempt===0?options?.forceRegenerate??false:false,prefetchNext:attempt===0?options?.prefetchNext??true:false},timeout:AI_GENERATE_TIMEOUT_MS,suppressError:true});if(data.status==='FAILED')throw new Error(data.errorMessage||`第 ${dayNo} 天生成失败`);if(data.resultJson){const dayJson=typeof data.resultJson==='string'?JSON.parse(data.resultJson):data.resultJson;const normalized=normalizeTripDay(dayJson,dayNo-1);return{...normalized,day:dayNo}}if(['QUEUED','GENERATING','PENDING'].includes(data.status)){if(attempt<maxAttempts-1){await sleep(2000);continue}break}if(data.status==='GENERATED')throw new Error(`第 ${dayNo} 天生成完成但没有返回结果`);if(attempt<maxAttempts-1){await sleep(2000);continue}}throw new Error(`第 ${dayNo} 天生成超时，请稍后重试`)},
  async generateStream(conversationId:string,requirement:Requirement,onProgress:(event:GenerateProgressEvent)=>void):Promise<GenerateResult>{
    if(USE_MOCK){
      for(const label of ['正在规划每日主题','正在查询景点与路线数据','正在生成每日行程和推荐理由','正在合并最终行程']){
        onProgress({type:'progress',label})
        await delay(450)
      }
      const result={conversationId,requirement,recommendationContext:mockRecommendation(requirement),tripPlan:buildPlan(requirement)}
      onProgress({type:'done',data:result})
      return result
    }
    const token=localStorage.getItem(TOKEN_KEY)
    const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||'/api'}/ai/trips/generate/stream`,{
      method:'POST',
      headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
      body:JSON.stringify({conversationId,requirement}),
    })
    if(!response.ok||!response.body)throw new Error('无法连接行程生成进度流，请稍后重试')
    const reader=response.body.getReader()
    const decoder=new TextDecoder()
    let buffer=''
    let result:GenerateResult|undefined
    while(true){
      const {value,done}=await reader.read()
      if(done)break
      buffer+=decoder.decode(value,{stream:true})
      const chunks=buffer.split(/\r?\n\r?\n/)
      buffer=chunks.pop()||''
      for(const chunk of chunks){
        const dataText=chunk.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n')
        if(!dataText)continue
        const event=JSON.parse(dataText) as GenerateProgressEvent
        if(event.type==='done'&&event.data){
          result=normalizeGenerateResult(event.data)
          onProgress({...event,data:result})
        }else{
          onProgress(event)
          if(event.type==='error')throw new Error(event.message||'行程生成失败，请稍后重试')
        }
      }
    }
    if(!result)throw new Error('行程生成结束但没有返回结果，请稍后重试')
    return result
  },
  async chat(message:string,tripId:number){if(!USE_MOCK)return request.post('/ai/chat',{mode:'TRIP',tripId,message});await delay(650);return{conversationId:`trip-${tripId}`,reply:`结合当前行程，我建议：${message.includes('累')?'把第二天下午的两个景点合并，午后增加 1 小时休息，并优先选择轨道交通。':'保留核心体验，同时每天只安排 2—3 个重点地点，给交通和临时发现留出余量。'}`,suggestions:['帮我改得轻松一点','预算还能再低一点吗？','适合带父母去吗？']}},
}
function normalizeGenerateResult(data:any):GenerateResult{
  return{schemaVersion:data.schemaVersion,conversationId:data.conversationId,generationSessionId:data.generationSessionId||data.sessionId,requirement:data.requirement,recommendationContext:data.recommendationContext,tripPlan:normalizeTripPlan(data.tripPlan),dayStatuses:data.dayStatuses||[]}
}
function normalizeTripPlan(plan:any):TripPlan{
  const dailyPlans=plan.dailyPlans||plan.daysPlan||plan.itineraryDays||plan.dayPlans||[]
  return{title:plan.title,destination:plan.destination,days:plan.days||dailyPlans.length,summary:plan.summary,dailyPlans:dailyPlans.map((day:any,index:number)=>normalizeTripDay(day,index)),accommodation:plan.accommodation||[plan.accommodationSuggestion?.area,plan.accommodationSuggestion?.reason,plan.accommodationSuggestion?.priceRange].filter(Boolean).join(' · '),budgetSummary:{transport:plan.budgetSummary?.transport??plan.budgetSummary?.transportCost??0,hotel:plan.budgetSummary?.hotel??plan.budgetSummary?.hotelCost??null,food:plan.budgetSummary?.food??plan.budgetSummary?.foodCost??0,tickets:plan.budgetSummary?.tickets??plan.budgetSummary?.ticketCost??0,total:plan.budgetSummary?.total??plan.budgetSummary?.totalEstimatedCost??0,excludesUnknownItems:plan.budgetSummary?.excludesUnknownItems},tips:plan.tips||[]}
}
function normalizeTripDay(day:any,index:number){
  const activities=day.activities||day.items||day.spots||day.places||day.scenicSpots||[]
  const routeLegs=day.routeLegs||[]
  const estimated=day.estimatedCost||{}
  return{day:day.day||day.dayNo||index+1,title:day.title||day.theme||day.dailyTheme||`Day ${index+1}`,activities:activities.map((item:any,itemIndex:number)=>{const routeLeg=routeLegs.find((leg:any)=>Number(leg.fromOrder)===Number(item.order||itemIndex+1));return{time:item.time||item.startTime||item.arrivalTime||'',title:item.title||item.place||item.name||item.spotName||item.poiName||'',description:item.description||item.activity||item.summary||item.reason||item.recommendReason||'',tags:item.tags||[item.type,item.transport].filter(Boolean),cost:Number(item.cost??item.ticketCost??item.ticketPrice??item.estimatedCost??0),costText:item.costText||item.ticketCostText,suggestedDuration:item.suggestedDuration||item.suggestedDurationText||item.stayDuration||item.duration||item.recommendedStayTime||(item.suggestedDurationMinutes?`${item.suggestedDurationMinutes} 分钟`:undefined),suggestedDurationSource:item.suggestedDurationSource,transportSuggestion:cleanTransportSuggestion(item.transportSuggestion||routeLeg?.suggestion),reason:item.reason||item.recommendReason||item.recommendationReason||item.tips,area:item.area||item.region,address:item.address,lng:Number(item.entranceLng??item.lng??item.longitude)||undefined,lat:Number(item.entranceLat??item.lat??item.latitude)||undefined,openingHours:item.openingHours,rating:item.rating==null?undefined:Number(item.rating),averageCost:item.averageCost==null?undefined:Number(item.averageCost),businessArea:item.businessArea,imageUrls:item.imageUrls||[]}}),food:day.food||day.foodSuggestions||day.diningSuggestions||day.restaurantSuggestions||[],budget:Number(day.budget||estimated.total||0),estimatedCost:{tickets:Number(estimated.tickets||0),food:Number(estimated.food||0),transport:Number(estimated.transport||0),total:Number(estimated.total||0),ticketSource:estimated.ticketSource,foodSource:estimated.foodSource,transportSource:estimated.transportSource,excludesUnknownItems:estimated.excludesUnknownItems},intensity:day.intensity||day.pace||day.tripIntensity,accommodation:day.accommodation||day.accommodationArea||day.hotelArea,diningArea:day.diningArea||day.foodArea||day.restaurantArea,routeSummary:day.routeSummary||day.route,tips:day.tips||day.dayTips||[]}
}
function cleanTransportSuggestion(value?:string){
  if(!value)return undefined
  return value
    .replace('高德路线暂不可用，前端将重新计算。','建议打车衔接，出发前按实时路况调整。')
    .replace('坐标不足，路线待前端计算。','建议按当天实际位置灵活选择步行或打车。')
}
function mockRecommendation(requirement:Requirement):RecommendationContext{
  return{scenicSpots:[{name:`${requirement.destination}城市地标`,area:'核心城区',reason:'适合初到目的地建立城市印象',suggestedDuration:'2小时',suitableForSelfDrive:false}],foodSpots:[{name:`${requirement.destination}本地小吃集合`,area:'老城区域',specialty:'地方小吃',reason:'适合穿插在步行街区和夜间行程中'}],hotelAreas:[{area:`${requirement.destination}核心商圈`,reason:'餐饮、交通和夜间活动选择丰富',priceRange:'300-600元/晚'}],transportPlan:{travelMode:{mode:requirement.preferences?.some(p=>p.includes('自驾')||p.includes('租车'))?'SELF_DRIVE':'PUBLIC_TRANSIT',recommended:true,reason:'根据旅行偏好生成的演示推荐',tips:['当前为前端 mock 推荐上下文']},tips:['当前为前端 mock 推荐上下文']}}
}
export const tripApi={
  async list(params:{pageNum:number;pageSize:number;keyword?:string}){if(!USE_MOCK)return request.get('/trips/my',{params});await delay();let list=trips.filter(t=>!params.keyword||t.title.includes(params.keyword)||t.destination.includes(params.keyword));return page(list,params.pageNum,params.pageSize)},
  async detail(id:number){if(!USE_MOCK)return request.get(`/trips/${id}`) as Promise<Trip>;await delay();const item=trips.find(t=>t.id===id);if(!item)throw new Error('行程不存在');return item},
  async save(value:Omit<Trip,'id'|'createTime'|'status'>){if(!USE_MOCK)return request.post('/trips',value) as Promise<{id:number}>;await delay();const id=Math.max(0,...trips.map(t=>t.id))+1;trips.unshift({...value,id,status:1,createTime:new Date().toLocaleString()});persist();return{id}},
  async update(id:number,value:Partial<Trip>){if(!USE_MOCK)return request.put(`/trips/${id}`,value);await delay();Object.assign(trips.find(t=>t.id===id)||{},value);persist()},
  async remove(id:number){if(!USE_MOCK)return request.delete(`/trips/${id}`);await delay();const i=trips.findIndex(t=>t.id===id);if(i>=0)trips.splice(i,1);persist()},
}
export const noteApi={
  async list(params:{pageNum:number;pageSize:number;keyword?:string;tagId?:number;sort?:string}){if(!USE_MOCK)return request.get('/notes',{params}) as Promise<PageResult<Note>>;await delay();let list=notes.filter(n=>n.status===1&&(!params.keyword||n.title.includes(params.keyword)||n.destination.includes(params.keyword)));if(params.tagId)list=list.filter(n=>n.tagIds.includes(params.tagId!));if(params.sort==='hot')list.sort((a,b)=>b.likeCount-a.likeCount);return page(list,params.pageNum,params.pageSize)},
  async mine(params:{pageNum:number;pageSize:number;status?:number}){if(!USE_MOCK)return request.get('/notes/my',{params}) as Promise<PageResult<Note>>;await delay();let list=notes.filter(n=>params.status!=null?n.status===params.status:n.status!==2);return page(list,params.pageNum,params.pageSize)},
  async detail(id:number){if(!USE_MOCK)return request.get(`/notes/${id}`) as Promise<Note>;await delay();const n=notes.find(v=>v.id===id);if(!n)throw new Error('游记不存在');return n},
  async save(value:Partial<Note>,id?:number){if(!USE_MOCK)return id?request.put(`/notes/${id}`,value):request.post('/notes',value);await delay();if(id){Object.assign(notes.find(n=>n.id===id)||{},value);persist();return{id}}const next=Math.max(0,...notes.map(n=>n.id))+1;notes.unshift({id:next,authorId:1,authorNickname:'旅行者 Sora',title:'',coverUrl:homeImage('chongqing.jpg'),destination:'',summary:'',content:'',tags:[],tagIds:[],likeCount:0,favoriteCount:0,commentCount:0,status:1,createTime:new Date().toLocaleString(),...value} as Note);persist();return{id:next}},
  async remove(id:number){if(!USE_MOCK)return request.delete(`/notes/${id}`);await delay();const i=notes.findIndex(n=>n.id===id);if(i>=0)notes.splice(i,1);persist()},
  async toggleLike(id:number,value:boolean){if(!USE_MOCK)return value?request.post(`/notes/${id}/like`):request.delete(`/notes/${id}/like`);const n=notes.find(v=>v.id===id)!;n.liked=value;n.likeCount+=value?1:-1;persist()},
  async toggleFavorite(id:number,value:boolean){if(!USE_MOCK)return value?request.post(`/notes/${id}/favorite`):request.delete(`/notes/${id}/favorite`);const n=notes.find(v=>v.id===id)!;n.favorited=value;n.favoriteCount+=value?1:-1;persist()},
  async getComments(noteId:number,pageNum=1,pageSize=50){if(!USE_MOCK){const result=await request.get(`/notes/${noteId}/comments`,{params:{pageNum,pageSize}}) as PageResult<Comment>;return result.list}await delay(180);return comments.filter(c=>c.noteId===noteId)},
  async addComment(noteId:number,content:string){if(!USE_MOCK)return request.post(`/notes/${noteId}/comments`,{content});await delay();const item={id:Math.max(0,...comments.map(c=>c.id))+1,noteId,userId:1,nickname:'旅行者 Sora',content,createTime:new Date().toLocaleString()};comments.push(item);const note=notes.find(n=>n.id===noteId);if(note)note.commentCount++;persist();return item},
}
export const baseApi={async tags(){if(!USE_MOCK)return request.get('/tags');return tags},async destinations(){if(!USE_MOCK)return request.get('/destinations');return destinations}}
export interface RentalQuotePreviewRequest { requirement:any }
export interface RentalQuotePreviewResponse { routeMode?:string; rentalCity?:string; citycode?:string; quoteOptions:any[] }
export const rentalApi={
  previewQuotes(payload:RentalQuotePreviewRequest){return request.post('/rental/quotes/preview',payload,{suppressError:true}) as Promise<RentalQuotePreviewResponse>},
  createOrder(payload:any){return request.post('/rental/orders',payload) as Promise<{id:number}>},
  payOrder(id:number,payload?:{success?:boolean}){return request.post(`/rental/orders/${id}/pay`,payload||{}) as Promise<void>},
  listMyOrders(){return request.get('/rental/orders/my') as Promise<any[]>},
  getOrder(id:number){return request.get(`/rental/orders/${id}`) as Promise<any>},
  cancelOrder(id:number){return request.post(`/rental/orders/${id}/cancel`) as Promise<void>},
}
export const userApi={async me(){if(!USE_MOCK)return request.get('/users/me') as Promise<UserInfo>;await delay();return users[0]},async update(value:Partial<UserInfo>){if(!USE_MOCK)return request.put('/users/me',value);await delay();Object.assign(users[0],value);return users[0]},async stats(){if(!USE_MOCK)return request.get('/users/me/stats') as Promise<UserProfileStats>;await delay();const myNotes=notes.filter(n=>n.status===1);return{tripCount:trips.filter(t=>t.status===1).length,noteCount:myNotes.length,likeCount:myNotes.reduce((sum,n)=>sum+(n.likeCount||0),0),favoriteCount:myNotes.reduce((sum,n)=>sum+(n.favoriteCount||0),0)}},sendChangeEmailCode(newEmail:string){return request.post('/users/me/email-code',{newEmail}) as Promise<void>},updateEmail(payload:{newEmail:string;emailCode:string}){return request.put('/users/me/email',payload) as Promise<void>}}
export interface FileUploadResponse {url:string;objectKey:string;fileName:string;size:number}
export const fileApi={upload(file:File,bizType='avatar'){const fd=new FormData();fd.append('file',file);return request.post('/files/upload',fd,{params:{bizType}}) as Promise<FileUploadResponse>}}
