<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Aim, FullScreen, Refresh } from '@element-plus/icons-vue'
import { loadAMap } from '../../utils/amapLoader'

interface Place {
  title: string
  time: string
  desc: string
  lng: number
  lat: number
}

interface RoutePreset {
  key: string
  name: string
  subtitle: string
  places: Place[]
}

const routePresets: RoutePreset[] = [
  {
    key: 'hangzhou',
    name: '杭州轻松游',
    subtitle: '杭州 3 日轻松游 Day 01',
    places: [
      { title: '西湖断桥', time: '09:00', desc: '沿湖慢慢走，适合轻松开场。', lng: 120.1546, lat: 30.2587 },
      { title: '河坊街', time: '12:00', desc: '午餐和本地小吃。', lng: 120.1719, lat: 30.2425 },
      { title: '灵隐寺', time: '14:30', desc: '下午安排文化体验。', lng: 120.1009, lat: 30.2401 },
      { title: '南宋御街', time: '18:30', desc: '晚上散步和夜间烟火气。', lng: 120.1691, lat: 30.2453 },
    ],
  },
  {
    key: 'chengdu',
    name: '成都城市烟火',
    subtitle: '成都城市烟火 Day 01',
    places: [
      { title: '人民公园', time: '09:30', desc: '喝茶、散步，节奏慢一点。', lng: 104.0588, lat: 30.6593 },
      { title: '宽窄巷子', time: '11:30', desc: '老街区和小吃。', lng: 104.0562, lat: 30.6721 },
      { title: '春熙路', time: '15:00', desc: '城市商圈和熊猫打卡。', lng: 104.0807, lat: 30.6574 },
      { title: '锦里古街', time: '19:00', desc: '夜晚逛吃更有氛围。', lng: 104.0496, lat: 30.6426 },
    ],
  },
  {
    key: 'xian',
    name: '西安历史文化',
    subtitle: '西安历史文化 Day 01',
    places: [
      { title: '西安城墙', time: '09:00', desc: '从城墙开始感受古城轮廓。', lng: 108.946, lat: 34.255 },
      { title: '钟楼', time: '11:00', desc: '城市中心地标。', lng: 108.9402, lat: 34.261 },
      { title: '回民街', time: '12:30', desc: '午餐和小吃。', lng: 108.9398, lat: 34.2655 },
      { title: '大雁塔', time: '16:00', desc: '下午看历史文化和广场。', lng: 108.9642, lat: 34.2183 },
    ],
  },
]

const mapEl = ref<HTMLElement | null>(null)
const loading = ref(true)
const mapError = ref('')
const activeRouteKey = ref(routePresets[0].key)
const places = ref<Place[]>(routePresets[0].places.map(item => ({ ...item })))
const activeIndex = ref(0)

let AMap: any = null
let map: any = null
let markers: any[] = []
let polyline: any = null
let infoWindow: any = null

const activeRoute = computed(() => routePresets.find(item => item.key === activeRouteKey.value) || routePresets[0])

const markerHtml = (index: number, active: boolean) => `
  <div class="map-play-marker ${active ? 'active' : ''}">
    <span>${index + 1}</span>
  </div>
`

const infoHtml = (place: Place, index: number) => `
  <div class="map-play-info">
    <strong>${index + 1}. ${place.title}</strong>
    <span>${place.time}</span>
    <p>${place.desc}</p>
  </div>
`

const clearMap = () => {
  if (!map) return
  if (polyline) {
    map.remove(polyline)
    polyline = null
  }
  if (markers.length) {
    map.remove(markers)
    markers = []
  }
}

const refreshMarkerState = () => {
  markers.forEach((marker, index) => marker.setContent(markerHtml(index, activeIndex.value === index)))
}

const openInfoWindow = (index: number) => {
  if (!map || !infoWindow) return
  const place = places.value[index]
  infoWindow.setContent(infoHtml(place, index))
  infoWindow.open(map, [place.lng, place.lat])
}

const focusPlace = (index: number, showInfo = false) => {
  if (!map || !markers[index]) return
  activeIndex.value = index
  refreshMarkerState()
  map.panTo([places.value[index].lng, places.value[index].lat])
  if (showInfo) openInfoWindow(index)
}

const fitView = () => {
  if (!map || !markers.length) return
  map.setFitView(markers, false, [70, 70, 70, 70])
}

const renderRoute = () => {
  if (!AMap || !map) return
  clearMap()
  markers = places.value.map((place, index) => {
    const marker = new AMap.Marker({
      position: [place.lng, place.lat],
      content: markerHtml(index, activeIndex.value === index),
      offset: new AMap.Pixel(-18, -42),
      anchor: 'bottom-center',
      title: place.title,
    })
    marker.on('click', () => {
      activeIndex.value = index
      refreshMarkerState()
      openInfoWindow(index)
    })
    return marker
  })

  polyline = new AMap.Polyline({
    path: places.value.map(place => [place.lng, place.lat]),
    strokeColor: '#1f5f46',
    strokeOpacity: 0.92,
    strokeWeight: 5,
    strokeStyle: 'solid',
    lineJoin: 'round',
  })

  map.add([...markers, polyline])
  fitView()
}

const switchRoute = async (route: RoutePreset) => {
  activeRouteKey.value = route.key
  activeIndex.value = 0
  places.value = route.places.map(item => ({ ...item }))
  await nextTick()
  renderRoute()
}

const shufflePlaces = () => {
  const next = [...places.value]
  for (let index = next.length - 1; index > 0; index--) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[target]] = [next[target], next[index]]
  }
  places.value = next
  activeIndex.value = 0
  renderRoute()
}

const initMap = async () => {
  loading.value = true
  mapError.value = ''
  try {
    AMap = await loadAMap()
    if (!mapEl.value) return
    map = new AMap.Map(mapEl.value, {
      zoom: 12,
      viewMode: '2D',
      resizeEnable: true,
      mapStyle: 'amap://styles/normal',
    })
    map.addControl(new AMap.Scale())
    map.addControl(new AMap.ToolBar({ position: 'RB' }))
    infoWindow = new AMap.InfoWindow({ isCustom: false, offset: new AMap.Pixel(0, -38) })
    renderRoute()
  } catch {
    mapError.value = '地图暂不可用，请检查高德地图配置'
  } finally {
    loading.value = false
  }
}

onMounted(initMap)

onBeforeUnmount(() => {
  if (map) {
    clearMap()
    map.destroy()
    map = null
  }
})
</script>

<template>
  <div class="map-playground">
    <aside class="map-panel">
      <div class="panel-title">
        <p>地图能力测试</p>
        <h1>{{ activeRoute.subtitle }}</h1>
      </div>

      <div class="route-tabs">
        <button
          v-for="route in routePresets"
          :key="route.key"
          :class="{ active: route.key === activeRouteKey }"
          @click="switchRoute(route)"
        >
          {{ route.name }}
        </button>
      </div>

      <div class="panel-actions">
        <button @click="shufflePlaces"><el-icon><Refresh /></el-icon>随机打乱顺序</button>
        <button @click="fitView"><el-icon><FullScreen /></el-icon>回到全览</button>
      </div>

      <div class="place-list">
        <button
          v-for="(place, index) in places"
          :key="`${place.title}-${index}`"
          class="place-card"
          :class="{ active: activeIndex === index }"
          @click="focusPlace(index, true)"
        >
          <span class="place-number">{{ index + 1 }}</span>
          <span class="place-copy">
            <b>{{ place.title }}</b>
            <small>{{ place.time }}</small>
            <em>{{ place.desc }}</em>
          </span>
          <el-icon><Aim /></el-icon>
        </button>
      </div>
    </aside>

    <main class="map-stage">
      <div ref="mapEl" class="amap-host"></div>
      <div v-if="loading" class="map-state">地图加载中...</div>
      <div v-else-if="mapError" class="map-state unavailable">{{ mapError }}</div>
    </main>
  </div>
</template>

<style scoped>
.map-playground {
  min-height: calc(100vh - 72px);
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: 22px;
  padding: 22px;
  background: #f6f0e5;
  color: #173629;
}

.map-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.panel-title p {
  margin: 0 0 7px;
  font-size: 13px;
  color: #7a6b58;
}

.panel-title h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  color: #173f2d;
}

.route-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.route-tabs button,
.panel-actions button,
.place-card {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.route-tabs button {
  min-height: 42px;
  border-radius: 12px;
  background: #fffaf0;
  color: #37624d;
  box-shadow: inset 0 0 0 1px #eadfcf;
}

.route-tabs button.active {
  background: #1f5f46;
  color: #fff;
  box-shadow: 0 10px 22px rgba(31, 95, 70, .22);
}

.panel-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.panel-actions button {
  height: 44px;
  border-radius: 12px;
  background: #fff;
  color: #1f5f46;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  box-shadow: inset 0 0 0 1px #e4d8c4;
}

.place-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.place-card {
  min-height: 104px;
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 22px;
  gap: 13px;
  align-items: center;
  text-align: left;
  background: #fffaf2;
  color: #173629;
  box-shadow: 0 10px 24px rgba(57, 49, 35, .08);
}

.place-card.active {
  background: #fff3df;
  box-shadow: inset 0 0 0 2px #e48b35, 0 14px 28px rgba(214, 127, 52, .2);
}

.place-number {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #1f5f46;
  color: #fff;
  font-weight: 800;
}

.place-card.active .place-number {
  background: #e48b35;
}

.place-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.place-copy b {
  font-size: 17px;
}

.place-copy small {
  color: #cf7a2a;
  font-weight: 700;
}

.place-copy em {
  font-style: normal;
  font-size: 13px;
  line-height: 1.45;
  color: #706758;
}

.map-stage {
  position: relative;
  min-height: calc(100vh - 116px);
  overflow: hidden;
  border-radius: 22px;
  background: #e5ddcf;
  box-shadow: 0 18px 45px rgba(37, 55, 43, .16);
}

.amap-host {
  width: 100%;
  height: 100%;
  min-height: inherit;
}

.map-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  background: linear-gradient(135deg, #f6f0e5, #efe3d2);
  color: #1f5f46;
  font-size: 18px;
  font-weight: 700;
}

.map-state.unavailable {
  color: #9f5a1e;
}

:deep(.map-play-marker) {
  width: 36px;
  height: 42px;
  border-radius: 18px 18px 18px 4px;
  transform: rotate(-45deg);
  background: #1f5f46;
  border: 3px solid #fffaf0;
  box-shadow: 0 8px 18px rgba(25, 54, 41, .34);
  display: grid;
  place-items: center;
}

:deep(.map-play-marker.active) {
  background: #e48b35;
  box-shadow: 0 10px 22px rgba(201, 104, 31, .42);
}

:deep(.map-play-marker span) {
  transform: rotate(45deg);
  color: #fff;
  font-weight: 900;
  font-size: 15px;
}

:deep(.map-play-info) {
  min-width: 180px;
  color: #173629;
}

:deep(.map-play-info strong),
:deep(.map-play-info span) {
  display: block;
}

:deep(.map-play-info span) {
  margin-top: 4px;
  color: #cf7a2a;
  font-weight: 700;
}

:deep(.map-play-info p) {
  margin: 7px 0 0;
  line-height: 1.45;
  color: #5f6258;
}

@media (max-width: 980px) {
  .map-playground {
    grid-template-columns: 1fr;
  }

  .map-stage {
    min-height: 520px;
  }
}
</style>
