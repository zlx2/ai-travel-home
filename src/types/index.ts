export interface R<T> { code: number; message: string; data: T }
export interface PageResult<T> { list: T[]; total: number; pageNum: number; pageSize: number }
export interface UserInfo { id:number; username:string; nickname:string; email:string; avatarUrl?:string; role:number; status:number; createTime?:string }
export interface Destination { id:number; name:string; coverUrl:string; description:string; tags:string[]; heat:number; status?:number; province?:string; city?:string; createTime?:string }
export interface Requirement { departure:string; destination:string; days:number; budget:number; budgetType:string; peopleCount:number; preferences:string[]; pace:string; avoidances:string[]; travelDate?:string }
export interface Activity { time:string; title:string; description:string; tags:string[]; cost:number }
export interface TripDay { day:number; title:string; activities:Activity[]; food:string[]; budget:number }
export interface TripPlan { title:string; destination:string; days:number; summary:string; dailyPlans:TripDay[]; accommodation:string; budgetSummary:{transport:number;hotel:number;food:number;tickets:number;total:number}; tips:string[] }
export interface Trip { id:number; userId?:number; username?:string; title:string; destination:string; days:number; budget:number; preferences:string[]; summary:string; coverUrl?:string; requirementJson?:Requirement; tripPlanJson:TripPlan; status:number; createTime:string; updateTime?:string }
export interface Note { id:number; authorId:number; authorNickname:string; authorAvatarUrl?:string; title:string; coverUrl:string; destination:string; summary:string; content:string; tags:string[]; tagIds:number[]; likeCount:number; favoriteCount:number; commentCount:number; liked?:boolean; favorited?:boolean; status:number; createTime:string; updateTime?:string }
export interface Comment { id:number; noteId:number; noteTitle?:string; userId:number; nickname:string; avatarUrl?:string; content:string; createTime:string }
export type AnalyzeStatus='READY'|'NEED_MORE_INFO'|'CONFLICT'|'NEED_DESTINATION_CHOICE'
export interface AnalyzeResult { conversationId:string; status:AnalyzeStatus; requirement?:Requirement; questions?:string[]; destinationSuggestions?:Destination[]; conflicts?:{message:string;suggestion:string}[] }
