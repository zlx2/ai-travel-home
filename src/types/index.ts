export interface R<T> { code: number; message: string; data: T }
export interface PageResult<T> { list: T[]; total: number; pageNum: number; pageSize: number }
export interface UserInfo { id:number; username:string; nickname:string; email:string; avatarUrl?:string; role:number; status:number; createTime?:string }
export interface Destination { id:number; name:string; coverUrl:string; description:string; tags:string[]; heat:number; status?:number; province?:string; city?:string; createTime?:string }
export interface Requirement { departure:string; destination:string; days:number; budget:number; budgetType:string; peopleCount:number; preferences:string[]; pace:string; avoidances:string[]; travelDate?:string }
export interface Activity { time:string; title:string; description:string; tags:string[]; cost:number; costText?:string; suggestedDuration?:string; suggestedDurationSource?:string; transportSuggestion?:string; reason?:string; area?:string; address?:string; lng?:number; lat?:number; openingHours?:string; rating?:number; averageCost?:number; businessArea?:string; imageUrls?:string[] }
export interface DayEstimatedCost { tickets:number; food:number; transport:number; total:number; ticketSource?:string; foodSource?:string; transportSource?:string; excludesUnknownItems?:boolean }
export interface TripDay { day:number; title:string; activities:Activity[]; food:string[]; budget:number; estimatedCost?:DayEstimatedCost; intensity?:string; accommodation?:string; diningArea?:string; routeSummary?:string; tips?:string[] }
export interface TripPlan { title:string; destination:string; days:number; summary:string; dailyPlans:TripDay[]; accommodation:string; budgetSummary:{transport:number;hotel:number|null;food:number;tickets:number;total:number;excludesUnknownItems?:boolean}; tips:string[] }
export interface RentalStore { storeCode:string; displayName:string; address:string; lng?:string; lat?:string; distanceMeters?:number; amapPoiName?:string }
export interface TravelMode { mode:string; recommended:boolean; reason:string; tips:string[] }
export interface ScenicSpot { name:string; area:string; reason:string; suggestedDuration:string; suitableForSelfDrive:boolean }
export interface FoodSpot { name:string; area:string; specialty:string; reason:string }
export interface HotelArea { area:string; reason:string; priceRange:string }
export interface TransportPlan { travelMode:TravelMode; pickupStore?:RentalStore|null; returnStore?:RentalStore|null; tips:string[] }
export interface RecommendationContext { scenicSpots:ScenicSpot[]; foodSpots:FoodSpot[]; hotelAreas:HotelArea[]; transportPlan:TransportPlan }
export interface GenerateResult { conversationId:string; requirement:Requirement; recommendationContext?:RecommendationContext; tripPlan:TripPlan }
export interface GenerateProgressEvent { type:'start'|'progress'|'done'|'error'; node?:string; label?:string; progress?:number; data?:GenerateResult; message?:string }
export interface Trip { id:number; userId?:number; username?:string; title:string; destination:string; days:number; budget:number; preferences:string[]; summary:string; coverUrl?:string; requirementJson?:Requirement; tripPlanJson:TripPlan; status:number; createTime:string; updateTime?:string }
export interface Note { id:number; authorId:number; authorNickname:string; authorAvatarUrl?:string; title:string; coverUrl:string; destination:string; summary:string; content:string; tags:string[]; tagIds:number[]; viewCount?:number; likeCount:number; favoriteCount:number; commentCount:number; liked?:boolean; favorited?:boolean; status:number; createTime:string; updateTime?:string }
export interface Comment { id:number; noteId:number; noteTitle?:string; userId:number; nickname:string; avatarUrl?:string; content:string; createTime:string }
export type AnalyzeStatus='READY'|'NEED_MORE_INFO'|'CONFLICT'|'NEED_DESTINATION_CHOICE'
export interface AnalyzeQuestion { field:string; question:string; required:boolean }
export interface AnalyzeResult { conversationId:string; status:AnalyzeStatus; requirement?:Requirement; questions?:AnalyzeQuestion[]; destinationSuggestions?:Destination[]; conflicts?:{message:string;suggestion:string}[] }
