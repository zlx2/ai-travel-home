import requestClient from '../utils/request'
import { USE_MOCK, comments, delay, destinations, notes, persist, tags, trips, users, buildPlan } from '../data/mock'
import type { AnalyzeResult, Comment, GenerateResult, Note, PageResult, RecommendationContext, Requirement, Trip, TripPlan, UserInfo } from '../types'
const request:any=requestClient

const page=<T>(list:T[],pageNum=1,pageSize=10):PageResult<T>=>({list:list.slice((pageNum-1)*pageSize,pageNum*pageSize),total:list.length,pageNum,pageSize})
const mockHome=()=>({hotDestinations:destinations.slice(0,6),hotNotes:notes.filter(n=>n.status===1).slice(0,3),hotTags:tags,recommendedTrips:[{destination:'重庆',days:3,preferences:['美食','夜景']},{destination:'成都',days:4,preferences:['美食','轻松游']},{destination:'西安',days:3,preferences:['历史文化','拍照打卡']},{destination:'厦门',days:3,preferences:['海岛','轻松游']}]})
export interface ConnectionCheckResult { message:string; receivedAction:string; receivedAt:string }
export const connectionApi={
  check(action:string){return request.post('/debug/connect',{action}) as Promise<ConnectionCheckResult>},
}
export const authApi={
  login(payload:{account:string;password:string}){return request.post('/auth/login',payload) as Promise<{token:string;user:UserInfo}>},
  register(payload:{username:string;email:string;password:string;emailCode:string}){return request.post('/auth/register',payload) as Promise<{id:number}>},
  sendCode(email:string){return request.post('/auth/email-code',{email,scene:'register'}) as Promise<void>},
  logout(){return request.post('/auth/logout') as Promise<void>},
}
export const homeApi={async getHome(){if(!USE_MOCK){try{return await request.get('/home',{suppressError:true})}catch{return mockHome()}}await delay();return mockHome()}}
export const aiApi={
  async analyze(payload:{conversationId?:string|null;userInput:string;extraAnswers?:string[];requirement?:Partial<Requirement>}):Promise<AnalyzeResult>{if(!USE_MOCK)return request.post('/ai/trips/analyze',payload);await delay(850);const text=[payload.userInput,...(payload.extraAnswers||[])].join(' ');const dest=payload.requirement?.destination||destinations.find(d=>text.includes(d.name))?.name||'';const departure=payload.requirement?.departure||text.match(/从([^去出发，, ]+)/)?.[1]||'';const days=Number(text.match(/(\d+)\s*天/)?.[1]||payload.requirement?.days||0);const questions=[];if(!departure)questions.push({field:'departure',question:'你准备从哪个城市出发？',required:true});if(!dest)questions.push({field:'destination',question:'你这次想去哪个目标城市？',required:true});if(!days)questions.push({field:'days',question:'这次旅行大概安排几天？',required:true});if(questions.length)return{conversationId:payload.conversationId||crypto.randomUUID(),status:'NEED_MORE_INFO',requirement:{...payload.requirement,departure,destination:dest,days} as Requirement,questions};const budget=Number(text.match(/预算\s*(\d+)/)?.[1]||payload.requirement?.budget||2000);const preferences=payload.requirement?.preferences?.length?payload.requirement.preferences:['美食','夜景'];return{conversationId:payload.conversationId||crypto.randomUUID(),status:'READY',requirement:{departure,destination:dest,days,budget,budgetType:'TOTAL',peopleCount:payload.requirement?.peopleCount||2,preferences,pace:payload.requirement?.pace||'LIGHT',avoidances:payload.requirement?.avoidances||['不早起'],travelDate:payload.requirement?.travelDate}}},
  async generate(conversationId:string,requirement:Requirement):Promise<GenerateResult>{if(!USE_MOCK){const data=await request.post('/ai/trips/generate',{conversationId,requirement});return normalizeGenerateResult(data)}await delay(1500);return{conversationId,requirement,recommendationContext:mockRecommendation(requirement),tripPlan:buildPlan(requirement)}},
  async chat(message:string,tripId:number){if(!USE_MOCK)return request.post('/ai/chat',{mode:'TRIP',tripId,message});await delay(650);return{conversationId:`trip-${tripId}`,reply:`结合当前行程，我建议：${message.includes('累')?'把第二天下午的两个景点合并，午后增加 1 小时休息，并优先选择轨道交通。':'保留核心体验，同时每天只安排 2—3 个重点地点，给交通和临时发现留出余量。'}`,suggestions:['帮我改得轻松一点','预算还能再低一点吗？','适合带父母去吗？']}},
}
function normalizeGenerateResult(data:any):GenerateResult{
  return{conversationId:data.conversationId,requirement:data.requirement,recommendationContext:data.recommendationContext,tripPlan:normalizeTripPlan(data.tripPlan)}
}
function normalizeTripPlan(plan:any):TripPlan{
  return{title:plan.title,destination:plan.destination,days:plan.days,summary:plan.summary,dailyPlans:(plan.dailyPlans||[]).map((day:any)=>({day:day.day,title:day.title||day.theme,activities:(day.activities||day.items||[]).map((item:any)=>({time:item.time,title:item.title||item.place,description:item.description||item.activity,tags:item.tags||[item.transport].filter(Boolean),cost:item.cost||0})),food:day.food||day.foodSuggestions||[],budget:day.budget||day.estimatedCost||0})),accommodation:plan.accommodation||[plan.accommodationSuggestion?.area,plan.accommodationSuggestion?.reason,plan.accommodationSuggestion?.priceRange].filter(Boolean).join(' · '),budgetSummary:{transport:plan.budgetSummary?.transport||plan.budgetSummary?.transportCost||0,hotel:plan.budgetSummary?.hotel||plan.budgetSummary?.hotelCost||0,food:plan.budgetSummary?.food||plan.budgetSummary?.foodCost||0,tickets:plan.budgetSummary?.tickets||plan.budgetSummary?.ticketCost||0,total:plan.budgetSummary?.total||plan.budgetSummary?.totalEstimatedCost||0},tips:plan.tips||[]}
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
  async detail(id:number){if(!USE_MOCK)return request.get(`/notes/${id}`) as Promise<Note>;await delay();const n=notes.find(v=>v.id===id);if(!n)throw new Error('游记不存在');return n},
  async save(value:Partial<Note>,id?:number){if(!USE_MOCK)return id?request.put(`/notes/${id}`,value):request.post('/notes',value);await delay();if(id){Object.assign(notes.find(n=>n.id===id)||{},value);persist();return{id}}const next=Math.max(0,...notes.map(n=>n.id))+1;notes.unshift({id:next,authorId:1,authorNickname:'旅行者 Sora',title:'',coverUrl:'/assets/chongqing.jpg',destination:'',summary:'',content:'',tags:[],tagIds:[],likeCount:0,favoriteCount:0,commentCount:0,status:1,createTime:new Date().toLocaleString(),...value} as Note);persist();return{id:next}},
  async remove(id:number){if(!USE_MOCK)return request.delete(`/notes/${id}`);await delay();const i=notes.findIndex(n=>n.id===id);if(i>=0)notes.splice(i,1);persist()},
  async toggleLike(id:number,value:boolean){if(!USE_MOCK)return value?request.post(`/notes/${id}/like`):request.delete(`/notes/${id}/like`);const n=notes.find(v=>v.id===id)!;n.liked=value;n.likeCount+=value?1:-1;persist()},
  async toggleFavorite(id:number,value:boolean){if(!USE_MOCK)return value?request.post(`/notes/${id}/favorite`):request.delete(`/notes/${id}/favorite`);const n=notes.find(v=>v.id===id)!;n.favorited=value;n.favoriteCount+=value?1:-1;persist()},
  async getComments(noteId:number){if(!USE_MOCK)return request.get(`/notes/${noteId}/comments`) as Promise<Comment[]>;await delay(180);return comments.filter(c=>c.noteId===noteId)},
  async addComment(noteId:number,content:string){if(!USE_MOCK)return request.post(`/notes/${noteId}/comments`,{content});await delay();const item={id:Math.max(0,...comments.map(c=>c.id))+1,noteId,userId:1,nickname:'旅行者 Sora',content,createTime:new Date().toLocaleString()};comments.push(item);const note=notes.find(n=>n.id===noteId);if(note)note.commentCount++;persist();return item},
}
export const baseApi={async tags(){if(!USE_MOCK)return request.get('/tags');return tags},async destinations(){if(!USE_MOCK)return request.get('/destinations');return destinations}}
export const userApi={async me(){if(!USE_MOCK)return request.get('/users/me') as Promise<UserInfo>;await delay();return users[0]},async update(value:Partial<UserInfo>){if(!USE_MOCK)return request.put('/users/me',value);await delay();Object.assign(users[0],value);return users[0]}}
