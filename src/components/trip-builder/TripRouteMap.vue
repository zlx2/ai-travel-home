<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadAMap } from '../../utils/amapLoader'

export interface TripMapPlace {
  title: string
  time: string
  desc: string
  lng: number
  lat: number
  type?: string
  imageUrl?: string
  nearbyHotels?: { name: string; address: string; lng: number; lat: number; coordType?: string; distanceMeters?: number; tel?: string; rating?: string }[]
}

interface NearbyPoi {
  id: string
  name: string
  address: string
  distance: string
  lng: number
  lat: number
  anchorIndex?: number
  anchorTitle?: string
  rating?: string
  averageCost?: string
  typeName?: string
  imageUrl?: string
}

type NearbyType = 'food' | 'hotel'

const props=defineProps<{ places:TripMapPlace[]; tip?:string }>()
const emit=defineEmits<{ routeStats:[value:{distanceKm:number;drivingMinutes:number}] }>()

const nearbyLabels:Record<NearbyType,string>={food:'美食',hotel:'酒店'}
const nearbySearchConfig:Record<NearbyType,{keyword:string;type:string}>={
  food:{keyword:'美食',type:'050000'},
  hotel:{keyword:'酒店',type:'100000'},
}

const mapEl=ref<HTMLElement|null>(null)
const loading=ref(true)
const routeLoading=ref(false)
const nearbyLoading=ref(false)
const toolbarCollapsed=ref(false)
const activeIndex=ref(0)
const activeNearbyType=ref<NearbyType|''>('')
const routeMessage=ref('正在规划驾车路线...')
const mapError=ref('')
const nearbyPois=ref<NearbyPoi[]>([])

let AMap:any=null
let map:any=null
let driving:any=null
let infoWindow:any=null
let poiSearch:any=null
let markers:any[]=[]
let poiMarkers:any[]=[]
let routeLine:any=null

const activePlace=computed(()=>props.places[activeIndex.value]||props.places[0])
const markerTypeClass=(type?:string)=>{
  if(['LUNCH_AREA','DINNER_AREA'].includes(String(type||'')))return 'meal'
  if(['STAY_AREA'].includes(String(type||'')))return 'hotel'
  if(['RENTAL_PICKUP','CAR_RETURN_SERVICE'].includes(String(type||'')))return 'rental'
  if(['DAY_START','TRANSFER'].includes(String(type||'')))return 'transfer'
  return 'spot'
}
const markerHtml=(index:number,active:boolean,type?:string)=>`<div class="ai-route-marker ${markerTypeClass(type)} ${active?'active':''}"><span>${index+1}</span></div>`
const foodMarkerIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.1v7.2M10 3.1v7.2M4.4 3.1v7.2M4.4 10.3h5.6M7.2 10.3v10.6M16.5 3.4c2.1 1.5 3.2 3.7 3.2 6.7v2.3h-3.1v8.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"/></svg>'
const hotelMarkerIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14M3 13h18M7 9h4M7 17h4M13 9h4M13 17h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>'
const poiMarkerHtml=(type:NearbyType,index:number)=>`<div class="ai-poi-marker ${type}"><span>${type==='food'?foodMarkerIcon:type==='hotel'?hotelMarkerIcon:index+1}</span></div>`
const placeHasRealCover=(place:TripMapPlace)=>!!place.imageUrl
const placeCoverImage=(place:TripMapPlace)=>{
  if(!placeHasRealCover(place))return ''
  return `<div class="route-info-cover"><img src="${place.imageUrl}" alt="${place.title}"><span>${place.title}</span></div>`
}
const infoHtml=(place:TripMapPlace,index:number)=>`<div class="ai-info-shell route-info-shell ${placeHasRealCover(place)?'has-cover':'no-cover'}">
  <button class="ai-info-close" type="button" aria-label="关闭">×</button>
  ${placeCoverImage(place)}
  <div class="ai-route-info">
    <div class="route-info-badge">${String(index+1).padStart(2,'0')}</div>
    <div class="route-info-body">
      <strong>${place.title}</strong>
      <span>${place.time}</span>
      <p>${place.desc||'当前行程节点'}</p>
    </div>
  </div>
</div>`
const placePhotoCache=new Map<string,string>()
const nearbyCoverImage=(poi:NearbyPoi)=>{
  if(poi.imageUrl)return `<img src="${poi.imageUrl}" alt="${poi.name}">`
  const title=poi.name.slice(0,8)
  const subtitle=poi.typeName||'本地餐饮'
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f97316"/>
        <stop offset=".52" stop-color="#f59e0b"/>
        <stop offset="1" stop-color="#0f766e"/>
      </linearGradient>
      <radialGradient id="light" cx=".32" cy=".24" r=".72">
        <stop offset="0" stop-color="#fff7ed" stop-opacity=".62"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="640" height="320" rx="0" fill="url(#bg)"/>
    <rect width="640" height="320" fill="url(#light)"/>
    <circle cx="512" cy="66" r="88" fill="#ffffff" opacity=".12"/>
    <circle cx="96" cy="256" r="116" fill="#111827" opacity=".08"/>
    <g transform="translate(68 66)" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".84">
      <path d="M36 0v92M72 0v92M0 0v92M0 92h72M36 92v116"/>
      <path d="M180 4c44 32 66 80 66 144v26h-66v34"/>
    </g>
    <text x="330" y="134" text-anchor="middle" fill="#fff" font-family="Microsoft YaHei, PingFang SC, Arial, sans-serif" font-size="46" font-weight="800">${title}</text>
    <text x="330" y="184" text-anchor="middle" fill="#fff" opacity=".9" font-family="Microsoft YaHei, PingFang SC, Arial, sans-serif" font-size="25" font-weight="700">${subtitle}</text>
  </svg>`
  return `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}" alt="${poi.name}">`
}
const hotelCoverImage=(poi:NearbyPoi)=>{
  if(poi.imageUrl)return `<img src="${poi.imageUrl}" alt="${poi.name}">`
  const title=poi.name.slice(0,8)
  const subtitle=poi.typeName||'品质酒店'
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
    <defs>
      <linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1e40af"/>
        <stop offset=".52" stop-color="#3b82f6"/>
        <stop offset="1" stop-color="#0ea5e9"/>
      </linearGradient>
      <radialGradient id="hlight" cx=".68" cy=".28" r=".68">
        <stop offset="0" stop-color="#dbeafe" stop-opacity=".52"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="640" height="320" rx="0" fill="url(#hbg)"/>
    <rect width="640" height="320" fill="url(#hlight)"/>
    <circle cx="120" cy="260" r="100" fill="#ffffff" opacity=".07"/>
    <circle cx="540" cy="72" r="72" fill="#ffffff" opacity=".10"/>
    <g transform="translate(60 72)" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".78">
      <rect x="0" y="24" width="96" height="68" rx="8"/>
      <path d="M0 56h96"/>
      <path d="M24 24V0h48v24"/>
      <circle cx="48" cy="40" r="8" fill="#fff" opacity=".6"/>
    </g>
    <text x="340" y="134" text-anchor="middle" fill="#fff" font-family="Microsoft YaHei, PingFang SC, Arial, sans-serif" font-size="44" font-weight="800">${title}</text>
    <text x="340" y="182" text-anchor="middle" fill="#fff" opacity=".88" font-family="Microsoft YaHei, PingFang SC, Arial, sans-serif" font-size="24" font-weight="700">${subtitle}</text>
  </svg>`
  return `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}" alt="${poi.name}">`
}
const poiInfoHtml=(poi:NearbyPoi,type:NearbyType)=>{
  if(type==='hotel')return `<div class="ai-info-shell poi-info-shell"><button class="ai-info-close" type="button" aria-label="关闭">×</button><div class="ai-hotel-card">
    <div class="hotel-cover">${hotelCoverImage(poi)}<span>${poi.anchorTitle?`${poi.anchorTitle}周边`:'住宿推荐'}</span></div>
    <div class="hotel-body">
      <strong>${poi.name}</strong>
      <p class="hotel-meta"><b>${poi.rating||'4.5'}分</b><span>${poi.typeName||'酒店'}</span></p>
      <p class="hotel-address">📍 ${poi.address||'暂无地址'} · 距${poi.anchorTitle||'当前点'}${poi.distance?`${poi.distance}米`:'较近'}</p>
    </div>
  </div></div>`
  return `<div class="ai-info-shell poi-info-shell"><button class="ai-info-close" type="button" aria-label="关闭">×</button><div class="ai-food-card">
    <div class="food-cover">${nearbyCoverImage(poi)}<span>${poi.anchorTitle?`${poi.anchorTitle}周边`:'美食推荐'}</span></div>
    <div class="food-body">
      <strong>${poi.name}</strong>
      <p class="food-meta"><b>${poi.rating||'4.6'}分</b><span>${poi.typeName||'本地餐饮'}</span><span>${poi.averageCost?`￥${poi.averageCost}/人`:'人均待查'}</span></p>
      <p class="food-address">📍 ${poi.address||'暂无地址'} · 距${poi.anchorTitle||'当前点'}${poi.distance?`${poi.distance}米`:'较近'}</p>
    </div>
  </div></div>`
}

const clearRouteLine=()=>{
  if(!map||!routeLine)return
  map.remove(routeLine)
  routeLine=null
}

const clearNearby=()=>{
  if(!map)return
  if(poiSearch?.clear)poiSearch.clear()
  poiSearch=null
  if(poiMarkers.length)map.remove(poiMarkers)
  poiMarkers=[]
  nearbyPois.value=[]
  activeNearbyType.value=''
}

const clearMap=()=>{
  if(!map)return
  clearRouteLine()
  clearNearby()
  if(markers.length)map.remove(markers)
  markers=[]
}

const refreshMarkerState=()=>{
  markers.forEach((marker,index)=>marker.setContent(markerHtml(index,activeIndex.value===index,props.places[index]?.type)))
}

const findPlacePhoto=async(place:TripMapPlace)=>{
  const cacheKey=`${place.title}:${place.lng},${place.lat}`
  if(place.imageUrl)return place.imageUrl
  if(placePhotoCache.has(cacheKey))return placePhotoCache.get(cacheKey)||''
  if(!AMap)return ''
  return new Promise<string>(resolve=>{
    const searcher=new AMap.PlaceSearch({pageSize:5,pageIndex:1,extensions:'all'})
    searcher.searchNearBy(place.title,new AMap.LngLat(place.lng,place.lat),1200,(status:string,result:any)=>{
      if(status!=='complete'||!result.poiList?.pois?.length){
        placePhotoCache.set(cacheKey,'')
        resolve('')
        return
      }
      const normalized=result.poiList.pois
        .map((poi:any)=>({name:String(poi.name||''),photos:Array.isArray(poi.photos)?poi.photos:[],distance:Number(poi.distance||9999)}))
        .sort((left:any,right:any)=>{
          const leftExact=left.name.includes(place.title)||place.title.includes(left.name)
          const rightExact=right.name.includes(place.title)||place.title.includes(right.name)
          if(leftExact!==rightExact)return leftExact?-1:1
          return left.distance-right.distance
        })
      const photo=normalized.flatMap((poi:any)=>poi.photos).find((item:any)=>item?.url)?.url||''
      placePhotoCache.set(cacheKey,photo)
      resolve(photo)
    })
  })
}

const openInfoWindow=async(index:number)=>{
  if(!map||!infoWindow||!props.places[index])return
  const place=props.places[index]
  infoWindow.setContent(infoHtml(place,index))
  infoWindow.open(map,[place.lng,place.lat])
  bindInfoClose()
  const imageUrl=await findPlacePhoto(place)
  if(imageUrl&&props.places[index]===place){
    infoWindow.setContent(infoHtml({...place,imageUrl},index))
    bindInfoClose()
  }
}

const openPoiInfoWindow=(poi:NearbyPoi,type:NearbyType)=>{
  if(!map||!infoWindow)return
  infoWindow.setContent(poiInfoHtml(poi,type))
  infoWindow.open(map,[poi.lng,poi.lat])
  bindInfoClose()
  if(type==='food'||type==='hotel'){
    map.panTo([poi.lng,poi.lat])
    window.setTimeout(()=>map?.panBy?.(0,140),80)
  }
}

function bindInfoClose(){
  window.setTimeout(()=>{
    const closeButton=mapEl.value?.querySelector('.ai-info-close') as HTMLButtonElement|null
    closeButton?.addEventListener('click',()=>infoWindow?.close(),{once:true})
  },0)
}

const focusPlace=(index:number,showInfo=false)=>{
  if(!map||!markers[index])return
  activeIndex.value=index
  refreshMarkerState()
  map.panTo([props.places[index].lng,props.places[index].lat])
  if(showInfo)openInfoWindow(index)
}

const fitView=()=>{
  if(!map)return
  const overlays=[...markers]
  if(routeLine)overlays.push(routeLine)
  if(poiMarkers.length)overlays.push(...poiMarkers)
  if(overlays.length)map.setFitView(overlays,false,[76,44,44,44])
}

const placePoiMarkerAroundAnchor=(poi:NearbyPoi,index:number,place:TripMapPlace,placeIndex:number):NearbyPoi=>{
  const angleGroups=[
    [-156,-84,-18],
    [36,108,174],
    [-126,-36,72],
    [8,126,-162],
  ]
  const angle=(angleGroups[placeIndex%angleGroups.length][index%3])*(Math.PI/180)
  const meters=260+(index%3)*60+(placeIndex%2)*28
  const lngOffset=(Math.cos(angle)*meters)/(111000*Math.cos((place.lat*Math.PI)/180))
  const latOffset=(Math.sin(angle)*meters)/111000
  return {...poi,lng:place.lng+lngOffset,lat:place.lat+latOffset}
}

const createTripMarkers=()=>{
  if(!AMap||!map)return
  if(markers.length)map.remove(markers)
  markers=props.places.map((place,index)=>{
    const marker=new AMap.Marker({
      position:[place.lng,place.lat],
      content:markerHtml(index,activeIndex.value===index,place.type),
      anchor:'bottom-center',
      title:place.title,
      zIndex:120,
    })
    marker.on('click',()=>focusPlace(index,true))
    return marker
  })
  map.add(markers)
}

const parseRouteToPath=(route:any)=>{
  const path:any[]=[]
  route.steps?.forEach((step:any)=>step.path?.forEach((point:any)=>path.push(point)))
  return path
}

const amapErrorText=(status:string,result:any)=>{
  if(!result)return status
  if(typeof result==='string')return `${status}: ${result}`
  return [status,result.info,result.message,result.infocode?`infocode=${result.infocode}`:''].filter(Boolean).join(' / ')
}

const searchFullDrivingRoute=()=>new Promise<any>((resolve,reject)=>{
  if(!props.places.length)return reject(new Error('缺少地点'))
  const start=props.places[0]
  const end=props.places[props.places.length-1]
  const waypoints=props.places.slice(1,-1).map(place=>new AMap.LngLat(place.lng,place.lat))
  driving.search(new AMap.LngLat(start.lng,start.lat),new AMap.LngLat(end.lng,end.lat),{waypoints},(status:string,result:any)=>{
    if(status!=='complete'||!result.routes?.length)return reject(new Error(amapErrorText(status,result)))
    resolve(result.routes[0])
  })
})

const searchDrivingSegment=(start:TripMapPlace,end:TripMapPlace)=>new Promise<{path:any[];distance:number;time:number}>((resolve,reject)=>{
  driving.search(new AMap.LngLat(start.lng,start.lat),new AMap.LngLat(end.lng,end.lat),(status:string,result:any)=>{
    if(status!=='complete'||!result.routes?.length)return reject(new Error(amapErrorText(status,result)))
    const route=result.routes[0]
    resolve({path:parseRouteToPath(route),distance:Number(route.distance||0),time:Number(route.time||0)})
  })
})

const drawDrivingRoute=async()=>{
  if(!AMap||!map||!driving||props.places.length<2)return
  routeLoading.value=true
  routeMessage.value='正在规划驾车路线...'
  clearRouteLine()
  try{
    const route=await searchFullDrivingRoute()
    const path=parseRouteToPath(route)
    routeLine=new AMap.Polyline({path,isOutline:true,outlineColor:'#fff',borderWeight:2,strokeColor:'#168fe3',strokeOpacity:.96,strokeWeight:7,strokeStyle:'solid',lineJoin:'round',zIndex:80})
    map.add(routeLine)
    routeMessage.value=`${(Number(route.distance||0)/1000).toFixed(1)} km | 约 ${Math.ceil(Number(route.time||0)/60)} 分钟`
    emit('routeStats',{distanceKm:Number((Number(route.distance||0)/1000).toFixed(1)),drivingMinutes:Math.ceil(Number(route.time||0)/60)})
  }catch(fullError){
    try{
      const segments=[]
      for(let index=0;index<props.places.length-1;index++)segments.push(await searchDrivingSegment(props.places[index],props.places[index+1]))
      routeLine=new AMap.Polyline({path:segments.flatMap(segment=>segment.path),isOutline:true,outlineColor:'#fff',borderWeight:2,strokeColor:'#168fe3',strokeOpacity:.96,strokeWeight:7,strokeStyle:'solid',lineJoin:'round',zIndex:80})
      map.add(routeLine)
      const distance=segments.reduce((sum,segment)=>sum+segment.distance,0)
      const time=segments.reduce((sum,segment)=>sum+segment.time,0)
      routeMessage.value=`${(distance/1000).toFixed(1)} km | 约 ${Math.ceil(time/60)} 分钟`
      emit('routeStats',{distanceKm:Number((distance/1000).toFixed(1)),drivingMinutes:Math.ceil(time/60)})
    }catch(segmentError){
      routeMessage.value=`路线规划失败：${segmentError instanceof Error?segmentError.message:String(segmentError||fullError)}`
    }
  }finally{
    fitView()
    routeLoading.value=false
  }
}

const renderRoute=async()=>{
  if(!AMap||!map)return
  clearMap()
  activeIndex.value=0
  createTripMarkers()
  await drawDrivingRoute()
}

const normalizePoi=(poi:any):NearbyPoi|null=>{
  const location=poi.location
  if(!location)return null
  const [stringLng,stringLat]=typeof location==='string'?location.split(',').map(Number):[]
  const lng=typeof location.getLng==='function'?location.getLng():location.lng??stringLng
  const lat=typeof location.getLat==='function'?location.getLat():location.lat??stringLat
  if(typeof lng!=='number'||typeof lat!=='number')return null
  const firstPhoto=Array.isArray(poi.photos)&&poi.photos.length?poi.photos[0]:null
  return {
    id:poi.id||`${poi.name}-${lng}-${lat}`,
    name:poi.name||'未命名地点',
    address:Array.isArray(poi.address)?poi.address.join(''):poi.address||'',
    distance:String(poi.distance||''),
    lng,
    lat,
    rating:poi.biz_ext?.rating||poi.rating,
    averageCost:poi.biz_ext?.cost||poi.cost,
    typeName:String(poi.type||'').split(';').filter(Boolean).slice(-1)[0],
    imageUrl:firstPhoto?.url,
  }
}

const renderNearbyMarkers=(type:NearbyType,pois:NearbyPoi[])=>{
  if(!AMap||!map)return
  if(poiMarkers.length)map.remove(poiMarkers)
  poiMarkers=pois.map((poi,index)=>{
    const marker=new AMap.Marker({position:[poi.lng,poi.lat],content:poiMarkerHtml(type,index),anchor:'center',title:poi.name,zIndex:type==='food'?96:100})
    marker.on('click',()=>openPoiInfoWindow(poi,type))
    return marker
  })
  map.add(poiMarkers)
  fitView()
}

const searchPoisAroundPlace=(type:NearbyType,place:TripMapPlace,placeIndex:number)=>new Promise<NearbyPoi[]>(resolve=>{
  const config=nearbySearchConfig[type]
  const searcher=new AMap.PlaceSearch({pageSize:type==='food'?10:12,pageIndex:1,extensions:'all',type:config.type})
  searcher.searchNearBy(config.keyword,new AMap.LngLat(place.lng,place.lat),type==='food'?1800:3000,(status:string,result:any)=>{
    if(status!=='complete'||!result.poiList?.pois?.length){
      resolve([])
      return
    }
    const normalized=result.poiList.pois.map(normalizePoi).filter(Boolean) as NearbyPoi[]
    const unique=normalized.filter((poi,index,self)=>self.findIndex(item=>item.name===poi.name||item.id===poi.id)===index)
    const pois=(type==='food'
      ? unique.filter(poi=>Number(poi.distance||9999)>60).slice(0,3).map((poi,index)=>placePoiMarkerAroundAnchor(poi,index,place,placeIndex))
      : unique.slice(0,6)) as NearbyPoi[]
    resolve(pois.map(poi=>({...poi,id:`${placeIndex}-${poi.id}`,anchorIndex:placeIndex,anchorTitle:place.title})))
  })
})

const searchNearby=async(type:NearbyType)=>{
  if(!AMap||!map||!activePlace.value)return
  if(activeNearbyType.value===type&&nearbyPois.value.length){
    clearNearby()
    return
  }
  nearbyLoading.value=true
  activeNearbyType.value=type
  if(poiSearch?.clear)poiSearch.clear()
  try{
    const placeTargets=props.places
    const results=await Promise.all(placeTargets.map((place,index)=>searchPoisAroundPlace(type,place,index)))
    const pois=results.flat()
    if(!pois.length){
      clearNearby()
      activeNearbyType.value=type
      return
    }
    nearbyPois.value=pois
    renderNearbyMarkers(type,pois)
  }finally{
    nearbyLoading.value=false
  }
}

const initMap=async()=>{
  loading.value=true
  mapError.value=''
  try{
    AMap=await loadAMap()
    if(!mapEl.value)return
    map=new AMap.Map(mapEl.value,{zoom:12,viewMode:'2D',resizeEnable:true,mapStyle:'amap://styles/normal'})
    map.addControl(new AMap.Scale())
    map.addControl(new AMap.ToolBar({position:'RB'}))
    driving=new AMap.Driving({policy:0})
    infoWindow=new AMap.InfoWindow({isCustom:true,offset:new AMap.Pixel(0,-42)})
    await renderRoute()
  }catch(error){
    console.error(error)
    mapError.value='地图暂不可用，请检查高德配置'
  }finally{
    loading.value=false
  }
}

watch(()=>props.places.map(place=>`${place.title}:${place.lng},${place.lat}`).join('|'),async()=>{
  await nextTick()
  await renderRoute()
})

onMounted(initMap)
onBeforeUnmount(()=>{
  if(map){
    clearMap()
    map.destroy()
    map=null
  }
})
</script>

<template>
  <aside class="trip-route-map builder-card">
    <div class="map-card-head">
      <div class="map-tabs">
        <button class="active">地图模式</button>
        <button>列表模式</button>
      </div>
      <span>路线总览</span>
    </div>

    <div class="amap-wrap">
      <div ref="mapEl" class="amap-host"></div>
      <section class="map-float-tools" :class="{ collapsed: toolbarCollapsed }">
        <button class="tool-chip point-chip" @click="focusPlace(activeIndex,true)">
          <span class="tool-dot point"></span>{{ activePlace?.title || '地点' }}
        </button>
        <template v-if="!toolbarCollapsed">
          <button class="tool-chip" :class="{ active: activeNearbyType==='food' }" :disabled="nearbyLoading" @click="searchNearby('food')"><span class="tool-dot food"></span>美食</button>
          <button class="tool-chip" :class="{ active: activeNearbyType==='hotel' }" :disabled="nearbyLoading" @click="searchNearby('hotel')"><span class="tool-dot hotel"></span>酒店</button>
        </template>
        <button class="tool-chip toggle-chip" @click="toolbarCollapsed=!toolbarCollapsed">{{ toolbarCollapsed ? '更多' : '收起' }}</button>
      </section>
      <section class="route-type-legend" aria-label="路线节点图例">
        <span><i class="spot"></i>景点</span>
        <span><i class="meal"></i>餐饮</span>
        <span><i class="hotel"></i>酒店</span>
        <span><i class="rental"></i>取还车</span>
        <span><i class="transfer"></i>路程</span>
      </section>
      <div class="map-floating">
        <small>{{ routeLoading ? '路线规划中' : '路线总览' }}</small>
        <b>{{ routeMessage }}</b>
      </div>
      <div v-if="loading" class="map-state">地图加载中...</div>
      <div v-else-if="mapError" class="map-state unavailable">{{ mapError }}</div>
    </div>
  </aside>
</template>

<style scoped>
.trip-route-map{overflow:hidden;align-self:start}.map-card-head{height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #edf1f5}.map-tabs{display:flex;gap:6px}.map-tabs button,.map-float-tools button{border:0;font:inherit;cursor:pointer}.map-tabs button{height:26px;border:1px solid #dbe5ef;border-radius:7px;padding:0 10px;color:#607086;background:#fff;font-weight:700;font-size:13px}.map-tabs .active{color:#fff;border-color:#0f9f8f;background:#0f9f8f}.map-card-head span{color:#728197;font-size:12px}.amap-wrap{position:relative;height:520px;background:#eef4f3;overflow:hidden}.amap-host{position:absolute;inset:0}.map-float-tools{position:absolute;left:14px;top:14px;z-index:20;display:flex;gap:6px;padding:6px;border-radius:10px;background:rgba(17,24,39,.52);box-shadow:0 10px 24px rgba(15,23,42,.18);backdrop-filter:blur(10px)}.tool-chip{height:28px;display:inline-flex;align-items:center;gap:5px;border-radius:7px;padding:0 9px;color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);font-weight:700;font-size:12px}.tool-chip.active{background:rgba(16,185,129,.88);box-shadow:none}.tool-chip:disabled{opacity:.7;cursor:wait}.tool-dot{width:8px;height:8px;border-radius:2px;display:inline-block}.tool-dot.point{background:#10b981}.tool-dot.food{background:#f59e0b}.tool-dot.hotel{background:#2563eb}.route-type-legend{position:absolute;left:14px;top:62px;z-index:19;display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.9);box-shadow:0 10px 24px rgba(15,23,42,.12);backdrop-filter:blur(10px)}.route-type-legend span{display:inline-flex;align-items:center;gap:5px;color:#475569;font-size:12px;font-weight:800}.route-type-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}.route-type-legend .spot{background:#0f9f8f}.route-type-legend .meal{background:#d97706}.route-type-legend .hotel{background:#2563eb}.route-type-legend .rental{background:#7c3aed}.route-type-legend .transfer{background:#475569}.map-floating{position:absolute;top:58px;right:14px;z-index:18;min-width:138px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.9);box-shadow:0 12px 28px rgba(15,23,42,.12)}.map-floating small{display:block;color:#7b8798;margin-bottom:5px;font-size:12px}.map-floating b{color:#172033;font-size:14px}.map-state{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(248,250,252,.84);color:#475569;font-weight:800}.map-state.unavailable{color:#b91c1c}:global(.ai-route-marker),:global(.ai-poi-marker){width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;border:3px solid #fff;box-shadow:0 8px 18px rgba(15,23,42,.25);font-weight:900}:global(.ai-route-marker.spot){background:#0f9f8f}:global(.ai-route-marker.meal){background:#d97706}:global(.ai-route-marker.hotel){background:#2563eb}:global(.ai-route-marker.rental){background:#7c3aed}:global(.ai-route-marker.transfer){background:#475569}:global(.ai-route-marker.active){outline:4px solid rgba(245,158,11,.28)}:global(.ai-poi-marker.food){background:#f97316}:global(.ai-poi-marker.hotel){background:#2563eb}:global(.ai-map-info){min-width:180px;padding:4px 2px;color:#172033}:global(.ai-map-info strong),:global(.ai-map-info span){display:block}:global(.ai-map-info span){margin-top:5px;color:#0f766e;font-size:12px}:global(.ai-map-info p){margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.45}@media(max-width:760px){.amap-wrap{height:360px}.map-float-tools{left:10px;right:10px;overflow-x:auto}.route-type-legend{top:56px;right:10px}.map-floating{display:none}}
:global(.ai-poi-marker.food){
  width:28px;
  height:28px;
  background:#ff9345;
  border:3px solid #fff;
  box-shadow:0 6px 14px rgba(234,88,12,.28);
  color:#fff;
}
:global(.ai-poi-marker.food span){
  width:17px;
  height:17px;
  display:grid;
  place-items:center;
  transform:none;
}
:global(.ai-poi-marker.food svg){
  width:17px;
  height:17px;
  display:block;
}
:global(.ai-poi-marker.hotel){
  width:28px;
  height:28px;
  background:#2563eb;
  border:3px solid #fff;
  box-shadow:0 6px 14px rgba(37,99,235,.32);
  color:#fff;
}
:global(.ai-poi-marker.hotel span){
  width:17px;
  height:17px;
  display:grid;
  place-items:center;
  transform:none;
}
:global(.ai-poi-marker.hotel svg){
  width:17px;
  height:17px;
  display:block;
}
:global(.amap-info-content){
  border-radius:16px!important;
  padding:0!important;
  overflow:hidden;
  box-shadow:0 18px 46px rgba(15,23,42,.22)!important;
}
:global(.ai-info-shell){
  position:relative;
  filter:drop-shadow(0 18px 34px rgba(15,23,42,.24));
}
:global(.ai-info-close){
  position:absolute;
  right:10px;
  top:10px;
  z-index:5;
  width:28px;
  height:28px;
  border:0;
  border-radius:50%;
  display:grid;
  place-items:center;
  color:#fff;
  background:rgba(15,23,42,.62);
  box-shadow:0 8px 18px rgba(15,23,42,.22);
  font-size:20px;
  line-height:1;
  cursor:pointer;
  backdrop-filter:blur(8px);
}
:global(.route-info-shell .ai-info-close){
  color:#475569;
  background:rgba(255,255,255,.88);
  box-shadow:0 8px 18px rgba(15,23,42,.12);
}
:global(.ai-info-close:hover){
  background:rgba(15,23,42,.82);
}
:global(.route-info-shell .ai-info-close:hover){
  color:#0f172a;
  background:#fff;
}
:global(.ai-info-shell:after){
  content:"";
  position:absolute;
  left:50%;
  bottom:-8px;
  width:16px;
  height:16px;
  transform:translateX(-50%) rotate(45deg);
  background:#fff;
  box-shadow:8px 8px 18px rgba(15,23,42,.08);
}
:global(.route-info-shell:after){
  background:#f8fbff;
}
:global(.route-info-shell.has-cover:after){
  background:#fff;
}
:global(.route-info-shell.no-cover:after){
  background:#fff;
}
:global(.route-info-cover){
  position:relative;
  width:328px;
  height:156px;
  overflow:hidden;
  border-radius:16px 16px 0 0;
  background:#e5eef7;
}
:global(.route-info-cover img){
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
}
:global(.route-info-cover span){
  position:absolute;
  left:12px;
  bottom:10px;
  max-width:calc(100% - 24px);
  overflow:hidden;
  border-radius:999px;
  padding:5px 10px;
  color:#fff;
  background:rgba(15,23,42,.62);
  font-size:12px;
  font-weight:900;
  text-overflow:ellipsis;
  white-space:nowrap;
  backdrop-filter:blur(8px);
}
:global(.ai-route-info){
  width:328px;
  display:grid;
  grid-template-columns:40px minmax(0,1fr);
  gap:12px;
  align-items:start;
  border:1px solid rgba(15,159,143,.12);
  border-radius:16px;
  padding:16px;
  background:#fff;
  color:#172033;
}
:global(.route-info-shell.no-cover .ai-route-info){
  width:328px;
  grid-template-columns:42px minmax(0,1fr);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.72);
  background:linear-gradient(180deg,#fff 0%,#f8fbff 100%);
}
:global(.route-info-shell.no-cover .route-info-badge){
  width:42px;
  height:42px;
  border-radius:11px;
  font-size:15px;
}
:global(.route-info-shell.has-cover .ai-route-info){
  border-top:0;
  border-radius:0 0 16px 16px;
  padding-top:15px;
  background:linear-gradient(180deg,#fff 0%,#f8fbff 100%);
}
:global(.route-info-shell.has-cover .route-info-badge){
  align-self:start;
}
:global(.route-info-shell.has-cover .route-info-body strong){
  display:inline-block;
  max-width:calc(100% - 54px);
  padding-right:28px;
  font-size:18px;
  vertical-align:top;
}
:global(.route-info-shell.has-cover .route-info-body){
  display:contents;
}
:global(.route-info-shell.has-cover .route-info-body p){
  display:-webkit-box;
  overflow:hidden;
  -webkit-line-clamp:2;
  -webkit-box-orient:vertical;
}
:global(.route-info-badge){
  width:40px;
  height:40px;
  border-radius:12px;
  display:grid;
  place-items:center;
  color:#fff;
  background:linear-gradient(145deg,#0f9f8f,#2563eb);
  font-size:15px;
  font-weight:900;
  box-shadow:0 8px 16px rgba(15,159,143,.18);
}
:global(.route-info-body){
  min-width:0;
}
:global(.route-info-body strong){
  display:block;
  overflow:hidden;
  color:#111827;
  padding-right:30px;
  font-size:20px;
  line-height:1.25;
  text-overflow:ellipsis;
  white-space:nowrap;
}
:global(.route-info-body span){
  display:inline-flex;
  align-items:center;
  min-height:24px;
  margin-top:8px;
  border-radius:999px;
  padding:0 10px;
  color:#047857;
  background:#ecfdf5;
  font-size:13px;
  font-weight:800;
}
:global(.route-info-body p){
  margin:10px 0 0;
  color:#5f6f84;
  font-size:14px;
  line-height:1.55;
}
:global(.ai-food-card){
  width:292px;
  overflow:hidden;
  border-radius:16px;
  background:linear-gradient(180deg,#fff 0%,#fffaf4 100%);
  color:#111827;
  border:1px solid rgba(249,115,22,.12);
}
:global(.food-cover){
  position:relative;
  height:150px;
  background:#f1f5f9;
}
:global(.food-cover img){
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
}
:global(.food-cover span){
  position:absolute;
  left:12px;
  bottom:10px;
  border-radius:999px;
  padding:5px 9px;
  color:#fff;
  background:rgba(15,23,42,.58);
  font-size:12px;
  font-weight:900;
  backdrop-filter:blur(8px);
}
:global(.food-body){
  position:relative;
  padding:14px 16px 16px;
  background:linear-gradient(180deg,#fff 0%,#fffaf4 100%);
}
:global(.food-body strong){
  display:block;
  color:#111827;
  font-size:18px;
  line-height:1.3;
}
:global(.food-meta){
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:8px;
  margin:9px 0 0;
  color:#64748b;
  font-size:13px;
}
:global(.food-meta b){
  border-radius:7px;
  padding:3px 7px;
  color:#fff;
  background:#2563eb;
  font-size:13px;
}
:global(.food-meta span){
  min-height:22px;
  display:inline-flex;
  align-items:center;
  border-radius:999px;
  padding:0 8px;
  color:#475569;
  background:#fff;
  border:1px solid #f2e5d5;
}
:global(.food-address){
  margin:10px 0 0;
  color:#4b5563;
  font-size:13px;
  line-height:1.55;
}
:global(.ai-hotel-card){
  width:292px;
  overflow:hidden;
  border-radius:16px;
  background:linear-gradient(180deg,#fff 0%,#f7fbff 100%);
  color:#111827;
  border:1px solid rgba(37,99,235,.12);
}
:global(.hotel-cover){
  position:relative;
  height:150px;
  background:#e0ecf8;
}
:global(.hotel-cover img){
  width:100%;
  height:100%;
  display:block;
  object-fit:cover;
}
:global(.hotel-cover span){
  position:absolute;
  left:12px;
  bottom:10px;
  border-radius:999px;
  padding:5px 9px;
  color:#fff;
  background:rgba(30,64,175,.72);
  font-size:12px;
  font-weight:900;
  backdrop-filter:blur(8px);
}
:global(.hotel-body){
  padding:14px 16px 16px;
  background:linear-gradient(180deg,#fff 0%,#f7fbff 100%);
}
:global(.hotel-body strong){
  display:block;
  color:#111827;
  font-size:18px;
  line-height:1.3;
}
:global(.hotel-meta){
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:8px;
  margin:9px 0 0;
  color:#64748b;
  font-size:13px;
}
:global(.hotel-meta b){
  border-radius:7px;
  padding:3px 7px;
  color:#fff;
  background:#2563eb;
  font-size:13px;
}
:global(.hotel-meta span){
  min-height:22px;
  display:inline-flex;
  align-items:center;
  border-radius:999px;
  padding:0 8px;
  color:#475569;
  background:#fff;
  border:1px solid #dbeafe;
}
:global(.hotel-address){
  margin:10px 0 0;
  color:#4b5563;
  font-size:13px;
  line-height:1.55;
}
</style>
