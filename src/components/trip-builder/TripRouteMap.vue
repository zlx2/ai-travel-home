<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadAMap } from '../../utils/amapLoader'

export interface TripMapPlace {
  title: string
  time: string
  desc: string
  lng: number
  lat: number
}

interface NearbyPoi {
  id: string
  name: string
  address: string
  distance: string
  lng: number
  lat: number
}

type NearbyType = 'food' | 'night' | 'hotel'

const props=defineProps<{ places:TripMapPlace[]; tip?:string }>()
const emit=defineEmits<{ routeStats:[value:{distanceKm:number;drivingMinutes:number}] }>()

const nearbyLabels:Record<NearbyType,string>={food:'美食',night:'夜市',hotel:'酒店'}
const nearbySearchConfig:Record<NearbyType,{keyword:string;type:string}>={
  food:{keyword:'美食',type:'050000'},
  night:{keyword:'夜市',type:'050000'},
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
const markerHtml=(index:number,active:boolean)=>`<div class="ai-route-marker ${active?'active':''}"><span>${index+1}</span></div>`
const poiMarkerHtml=(type:NearbyType,index:number)=>`<div class="ai-poi-marker ${type}"><span>${index+1}</span></div>`
const infoHtml=(place:TripMapPlace,index:number)=>`<div class="ai-map-info"><strong>${index+1}. ${place.title}</strong><span>${place.time}</span><p>${place.desc}</p></div>`
const poiInfoHtml=(poi:NearbyPoi,type:NearbyType)=>`<div class="ai-map-info"><strong>${nearbyLabels[type]}：${poi.name}</strong><span>${poi.distance?`${poi.distance} 米`:'距离未知'}</span><p>${poi.address||'暂无地址'}</p></div>`

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
  markers.forEach((marker,index)=>marker.setContent(markerHtml(index,activeIndex.value===index)))
}

const openInfoWindow=(index:number)=>{
  if(!map||!infoWindow||!props.places[index])return
  const place=props.places[index]
  infoWindow.setContent(infoHtml(place,index))
  infoWindow.open(map,[place.lng,place.lat])
}

const openPoiInfoWindow=(poi:NearbyPoi,type:NearbyType)=>{
  if(!map||!infoWindow)return
  infoWindow.setContent(poiInfoHtml(poi,type))
  infoWindow.open(map,[poi.lng,poi.lat])
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

const createTripMarkers=()=>{
  if(!AMap||!map)return
  if(markers.length)map.remove(markers)
  markers=props.places.map((place,index)=>{
    const marker=new AMap.Marker({
      position:[place.lng,place.lat],
      content:markerHtml(index,activeIndex.value===index),
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
  return {id:poi.id||`${poi.name}-${lng}-${lat}`,name:poi.name||'未命名地点',address:Array.isArray(poi.address)?poi.address.join(''):poi.address||'',distance:String(poi.distance||''),lng,lat}
}

const renderNearbyMarkers=(type:NearbyType,pois:NearbyPoi[])=>{
  if(!AMap||!map)return
  if(poiMarkers.length)map.remove(poiMarkers)
  poiMarkers=pois.map((poi,index)=>{
    const marker=new AMap.Marker({position:[poi.lng,poi.lat],content:poiMarkerHtml(type,index),anchor:'bottom-center',title:poi.name,zIndex:100})
    marker.on('click',()=>openPoiInfoWindow(poi,type))
    return marker
  })
  map.add(poiMarkers)
  fitView()
}

const searchNearby=async(type:NearbyType)=>{
  if(!AMap||!map||!activePlace.value)return
  nearbyLoading.value=true
  activeNearbyType.value=type
  const config=nearbySearchConfig[type]
  if(poiSearch?.clear)poiSearch.clear()
  poiSearch=new AMap.PlaceSearch({pageSize:12,pageIndex:1,extensions:'all',type:config.type})
  await new Promise<void>(resolve=>{
    poiSearch.searchNearBy(config.keyword,new AMap.LngLat(activePlace.value.lng,activePlace.value.lat),3000,(status:string,result:any)=>{
      nearbyLoading.value=false
      if(status!=='complete'||!result.poiList?.pois?.length){
        clearNearby()
        activeNearbyType.value=type
        resolve()
        return
      }
      const pois=result.poiList.pois.map(normalizePoi).filter(Boolean).slice(0,6) as NearbyPoi[]
      nearbyPois.value=pois
      renderNearbyMarkers(type,pois)
      resolve()
    })
  })
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
    infoWindow=new AMap.InfoWindow({isCustom:false,offset:new AMap.Pixel(0,-38)})
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
          <button class="tool-chip" :class="{ active: activeNearbyType==='night' }" :disabled="nearbyLoading" @click="searchNearby('night')"><span class="tool-dot night"></span>夜市</button>
          <button class="tool-chip" :class="{ active: activeNearbyType==='hotel' }" :disabled="nearbyLoading" @click="searchNearby('hotel')"><span class="tool-dot hotel"></span>酒店</button>
        </template>
        <button class="tool-chip toggle-chip" @click="toolbarCollapsed=!toolbarCollapsed">{{ toolbarCollapsed ? '更多' : '收起' }}</button>
      </section>
      <div class="map-floating">
        <small>{{ routeLoading ? '路线规划中' : '路线总览' }}</small>
        <b>{{ routeMessage }}</b>
      </div>
      <div v-if="nearbyPois.length" class="poi-result-strip">
        <div class="poi-strip-head">
          <b>{{ nearbyLabels[activeNearbyType || 'food'] }}推荐</b>
          <button type="button" @click="clearNearby">收起</button>
        </div>
        <button v-for="poi in nearbyPois" :key="poi.id" @click="openPoiInfoWindow(poi, activeNearbyType || 'food')">
          <b>{{ poi.name }}</b>
          <span>{{ poi.distance ? `${poi.distance} 米` : '距离未知' }}</span>
        </button>
      </div>
      <div v-if="loading" class="map-state">地图加载中...</div>
      <div v-else-if="mapError" class="map-state unavailable">{{ mapError }}</div>
    </div>
  </aside>
</template>

<style scoped>
.trip-route-map{overflow:hidden;align-self:start}.map-card-head{height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #edf1f5}.map-tabs{display:flex;gap:6px}.map-tabs button,.map-float-tools button,.poi-result-strip button{border:0;font:inherit;cursor:pointer}.map-tabs button{height:26px;border:1px solid #dbe5ef;border-radius:7px;padding:0 10px;color:#607086;background:#fff;font-weight:700;font-size:13px}.map-tabs .active{color:#fff;border-color:#0f9f8f;background:#0f9f8f}.map-card-head span{color:#728197;font-size:12px}.amap-wrap{position:relative;height:520px;background:#eef4f3;overflow:hidden}.amap-host{position:absolute;inset:0}.map-float-tools{position:absolute;left:14px;top:14px;z-index:20;display:flex;gap:6px;padding:6px;border-radius:10px;background:rgba(17,24,39,.52);box-shadow:0 10px 24px rgba(15,23,42,.18);backdrop-filter:blur(10px)}.tool-chip{height:28px;display:inline-flex;align-items:center;gap:5px;border-radius:7px;padding:0 9px;color:#fff;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);font-weight:700;font-size:12px}.tool-chip.active{background:rgba(16,185,129,.88);box-shadow:none}.tool-chip:disabled{opacity:.7;cursor:wait}.tool-dot{width:8px;height:8px;border-radius:2px;display:inline-block}.tool-dot.point{background:#10b981}.tool-dot.food{background:#f59e0b}.tool-dot.hotel{background:#2563eb}.map-floating{position:absolute;top:58px;right:14px;z-index:18;min-width:138px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.9);box-shadow:0 12px 28px rgba(15,23,42,.12)}.map-floating small{display:block;color:#7b8798;margin-bottom:5px;font-size:12px}.map-floating b{color:#172033;font-size:14px}.map-state{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(248,250,252,.84);color:#475569;font-weight:800}.map-state.unavailable{color:#b91c1c}.poi-result-strip{position:absolute;left:14px;right:14px;bottom:14px;z-index:22;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:42px 0 0}.poi-strip-head{position:absolute;top:0;left:0;right:0;height:34px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-radius:10px;background:rgba(15,23,42,.66);box-shadow:0 10px 24px rgba(15,23,42,.12);backdrop-filter:blur(10px)}.poi-strip-head b{color:#fff;font-size:12px}.poi-strip-head button{height:24px;border-radius:7px;padding:0 9px;background:rgba(255,255,255,.16);color:#fff;font-weight:800;font-size:12px}.poi-result-strip>button{min-width:0;text-align:left;border-radius:10px;padding:9px 11px;background:rgba(255,255,255,.9);color:#475569;box-shadow:0 10px 24px rgba(15,23,42,.12)}.poi-result-strip b,.poi-result-strip span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.poi-result-strip b{color:#172033;font-size:12px}.poi-result-strip span{margin-top:3px;font-size:11px;color:#7b8798}:global(.ai-route-marker),:global(.ai-poi-marker){width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;border:3px solid #fff;box-shadow:0 8px 18px rgba(15,23,42,.25);font-weight:900}:global(.ai-route-marker){background:#0f9f8f}:global(.ai-route-marker.active){background:#f59e0b}:global(.ai-poi-marker.food){background:#f97316}:global(.ai-poi-marker.hotel){background:#2563eb}:global(.ai-map-info){min-width:180px;padding:4px 2px;color:#172033}:global(.ai-map-info strong),:global(.ai-map-info span){display:block}:global(.ai-map-info span){margin-top:5px;color:#0f766e;font-size:12px}:global(.ai-map-info p){margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.45}@media(max-width:760px){.amap-wrap{height:360px}.map-float-tools{left:10px;right:10px;overflow-x:auto}.map-floating{display:none}}
.tool-dot.night{background:#ec4899}
</style>
