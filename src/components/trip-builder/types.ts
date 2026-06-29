import type { Requirement } from '../../types'

export type BuilderStep='INPUT'|'ANALYZED'|'QUOTE_SELECT'|'RENTAL_DETAILS'|'DAY_BUILDING'|'FINAL_REVIEW'|'ORDER_CREATED'|'PAID'
export type DayStatus='locked'|'active'|'draft'|'generating'|'pending'

export interface RentalQuote{
  id:string
  label:string
  name:string
  subtitle:string
  seats:number
  luggage:number
  tags:string[]
  pickup:string
  returnPlace:string
  pickupTime:string
  returnTime:string
  totalPrice:number
  dayCount:number
  serviceTags:string[]
  tone:'blue'|'teal'|'gold'
  raw?:any
}

export interface DayMoment{
  key:string
  period:string
  time:string
  title:string
  description:string
  tags:string[]
  cost:number
  costText?:string
  image:string
  suggestedDuration?:string
  suggestedDurationSource?:string
  transportSuggestion?:string
  reason?:string
  area?:string
  address?:string
  lng?:number
  lat?:number
  openingHours?:string
  rating?:number
  averageCost?:number
  businessArea?:string
  imageUrls?:string[]
  type?:string
}

export interface BuilderDay{
  day:number
  title:string
  subtitle:string
  intensity?:string
  accommodation?:string
  diningArea?:string
  status:DayStatus
  route:string[]
  moments:DayMoment[]
  foods:string[]
  budget:{
    tickets:number
    food:number
    traffic:number
    other:number
    total:number
    foodSource?:string
    transportSource?:string
    excludesUnknownItems?:boolean
  }
  rental:{
    enabled:boolean
    departure:string
    duration:string
    mileage:number
    fuelCost:number
  }
  tips:string[]
}

export interface FinalReviewData{
  requirement:Requirement
  days:BuilderDay[]
  selectedQuote?:RentalQuote|null
  rentalContext?:any|null
  rentalTripContext?:any|null
  hotelCost:number|null
}
