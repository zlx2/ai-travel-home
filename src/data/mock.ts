import type { Comment, Destination, Note, Requirement, Trip, TripPlan, UserInfo } from '../types'

export const USE_MOCK=import.meta.env.VITE_USE_MOCK!=='false'
export const delay=(ms=350)=>new Promise(resolve=>setTimeout(resolve,ms))
const images=['/assets/hq/chongqing.jpg','/assets/hq/chengdu.jpg','/assets/hq/xian.jpg','/assets/hq/hangzhou.jpg','/assets/hq/xiamen.jpg','/assets/hq/yunnan.jpg']
const now='2026-06-20 10:00:00'
export const destinations:Destination[]=[
  {id:1,name:'重庆',coverUrl:images[0],description:'山城夜景与火锅美食目的地',tags:['美食','夜景'],heat:98,status:1,province:'重庆',city:'重庆',createTime:now},
  {id:2,name:'成都',coverUrl:images[1],description:'熊猫、茶馆与巴适慢生活',tags:['美食','休闲'],heat:95,status:1,province:'四川',city:'成都',createTime:now},
  {id:3,name:'西安',coverUrl:images[2],description:'穿越千年的古都文化之旅',tags:['历史','文化'],heat:92,status:1,province:'陕西',city:'西安',createTime:now},
  {id:4,name:'杭州',coverUrl:images[3],description:'湖光山色与江南人文',tags:['自然','轻松'],heat:90,status:1,province:'浙江',city:'杭州',createTime:now},
  {id:5,name:'厦门',coverUrl:images[4],description:'海风、岛屿与文艺街巷',tags:['海岛','拍照'],heat:89,status:1,province:'福建',city:'厦门',createTime:now},
  {id:6,name:'云南',coverUrl:images[5],description:'雪山湖泊与多彩民族风情',tags:['自然','摄影'],heat:88,status:1,province:'云南',city:'丽江',createTime:now},
]
export const tags=[{id:1,name:'美食',type:2,status:1,createTime:now},{id:2,name:'夜景',type:2,status:1,createTime:now},{id:3,name:'历史文化',type:1,status:1,createTime:now},{id:4,name:'轻松游',type:2,status:1,createTime:now},{id:5,name:'拍照打卡',type:1,status:1,createTime:now},{id:6,name:'亲子',type:2,status:1,createTime:now},{id:7,name:'海岛',type:3,status:1,createTime:now}]
export const users:UserInfo[]=[
  {id:1,username:'sora',nickname:'旅行者 Sora',email:'sora@example.com',avatarUrl:'https://api.dicebear.com/9.x/adventurer/svg?seed=Sora',role:1,status:1,createTime:now},
  {id:2,username:'admin',nickname:'系统管理员',email:'admin@example.com',avatarUrl:'https://api.dicebear.com/9.x/adventurer/svg?seed=Admin',role:2,status:1,createTime:now},
  {id:3,username:'xiaoyu',nickname:'小鱼在旅行',email:'fish@example.com',avatarUrl:'https://api.dicebear.com/9.x/adventurer/svg?seed=Fish',role:1,status:1,createTime:now},
]
export const buildPlan=(r:Requirement):TripPlan=>({
  title:`${r.destination} ${r.days} 日${r.preferences.join('·')}之旅`,destination:r.destination,days:r.days,
  summary:`用 ${r.days} 天感受${r.destination}的城市气质，在经典地标、地道美食和松弛体验之间取得平衡。`,
  dailyPlans:Array.from({length:r.days},(_,i)=>({day:i+1,title:['初见城市·地标漫游','城市深处·人文美食','慢享时光·山水告别'][i]||`自在探索第 ${i+1} 天`,activities:[
    {time:'09:30',title:['解放碑步行街','李子坝观景台','磁器口古镇'][i%3],description:'轻松抵达，预留充足游览和拍照时间。',tags:['城市地标','拍照'],cost:0},
    {time:'14:00',title:['山城巷','鹅岭二厂','长江索道'][i%3],description:'沿推荐路线感受城市肌理，途中安排休息。',tags:['人文','轻松'],cost:60},
    {time:'18:30',title:['洪崖洞夜景','南山一棵树','江畔夜游'][i%3],description:'享用当地美食后欣赏城市夜景。',tags:['美食','夜景'],cost:160},
  ],food:['重庆小面','老火锅','冰粉'],budget:420})),
  accommodation:'建议住在解放碑附近，交通方便且夜间餐饮选择丰富。',
  budgetSummary:{transport:300,hotel:600,food:600,tickets:260,total:r.budget||1760},
  tips:['重庆多坡路，建议穿舒适防滑的鞋。','热门景点尽量错峰，索道可提前预约。','饮食偏辣，可提前告知店家调整辣度。']
})
const seedReq:Requirement={departure:'上海',destination:'重庆',days:3,budget:2000,budgetType:'TOTAL',peopleCount:2,preferences:['美食','夜景'],pace:'LIGHT',avoidances:['不早起']}
export const trips:Trip[]=[{id:1,userId:1,username:'sora',title:'重庆 3 日美食夜景游',destination:'重庆',days:3,budget:2000,preferences:['美食','夜景'],summary:'山城地标、地道美食与璀璨夜景一次收齐。',coverUrl:images[0],requirementJson:seedReq,tripPlanJson:buildPlan(seedReq),status:1,createTime:now}]
export const notes:Note[]=[
  {id:1,authorId:3,authorNickname:'小鱼在旅行',authorAvatarUrl:users[2].avatarUrl,title:'重庆三天两夜：从清晨小面到洪崖洞夜色',coverUrl:images[0],destination:'重庆',summary:'一份不赶路、好吃又好拍的山城路线。',content:'# 山城，值得慢慢走\n\n重庆不是一座适合用“景点清单”丈量的城市。真正迷人的，是转过楼梯后突然出现的江景。\n\n## Day 1 解放碑与洪崖洞\n\n上午睡到自然醒，第一站从一碗小面开始。下午沿着山城巷慢慢走，晚上在洪崖洞看灯火亮起。\n\n> 旅行不是赶路，是换一种节奏生活。',tags:['美食','夜景'],tagIds:[1,2],likeCount:1268,favoriteCount:356,commentCount:2,liked:false,favorited:false,status:1,createTime:now},
  {id:2,authorId:1,authorNickname:'旅行者 Sora',authorAvatarUrl:users[0].avatarUrl,title:'成都慢旅行：把时间留给茶馆和巷子',coverUrl:images[1],destination:'成都',summary:'四天三夜的松弛感行程，熊猫、美食与老茶馆。',content:'# 成都的正确打开方式\n\n少排几个景点，多坐一会儿。人民公园的茶香，是这趟旅行最鲜活的记忆。',tags:['美食','轻松游'],tagIds:[1,4],likeCount:982,favoriteCount:214,commentCount:1,status:1,createTime:now},
  {id:3,authorId:3,authorNickname:'小鱼在旅行',authorAvatarUrl:users[2].avatarUrl,title:'西安历史文化打卡：穿越千年的古都',coverUrl:images[2],destination:'西安',summary:'兵马俑、城墙和大唐不夜城的文化浓度之旅。',content:'# 长安一片月\n\n城墙根下的风，把历史吹得很近。',tags:['历史文化','拍照打卡'],tagIds:[3,5],likeCount:1530,favoriteCount:428,commentCount:0,status:1,createTime:now},
  {id:4,authorId:1,authorNickname:'旅行者 Sora',authorAvatarUrl:users[0].avatarUrl,title:'厦门海边散步指南',coverUrl:images[4],destination:'厦门',summary:'不追网红店，只沿着海风走一走。',content:'# 海风自由\n\n从沙坡尾一路走到海边，慢慢看日落。',tags:['海岛','轻松游'],tagIds:[7,4],likeCount:628,favoriteCount:168,commentCount:0,status:1,createTime:now},
]
export const comments:Comment[]=[{id:1,noteId:1,noteTitle:notes[0].title,userId:1,nickname:'旅行者 Sora',avatarUrl:users[0].avatarUrl,content:'路线很舒服，已经收藏准备照着走！',createTime:'2026-06-20 12:20:00'},{id:2,noteId:1,noteTitle:notes[0].title,userId:3,nickname:'小鱼在旅行',avatarUrl:users[2].avatarUrl,content:'欢迎来重庆，记得穿舒服的鞋～',createTime:'2026-06-20 13:10:00'}]
export const persist=()=>{localStorage.setItem('plango-trips',JSON.stringify(trips));localStorage.setItem('plango-notes',JSON.stringify(notes));localStorage.setItem('plango-comments',JSON.stringify(comments))}
const restore=<T>(key:string,target:T[])=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(value))target.splice(0,target.length,...value)}catch{}}
restore('plango-trips',trips);restore('plango-notes',notes);restore('plango-comments',comments)
const highResCover=(destination:string)=>destinations.find(item=>item.name===destination)?.coverUrl
trips.forEach(item=>{item.coverUrl=highResCover(item.destination)||item.coverUrl})
notes.forEach(item=>{item.coverUrl=highResCover(item.destination)||item.coverUrl})
