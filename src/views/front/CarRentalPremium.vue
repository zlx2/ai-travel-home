<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowRight, Calendar, Check, Clock, EditPen, Filter, Headset, Location, Money, Search, StarFilled, Suitcase, Switch, User, Van } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus/es/components/message/index'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { rentalApi } from '../../api'
import { loadAMap } from '../../utils/amapLoader'

type Mode = 'home' | 'results' | 'detail' | 'order'
type FeeBreakdown = {
  rentalFeeCent: number
  baseServiceFeeCent: number
  vehiclePrepareFeeCent: number
  oneWayFeeCent: number
  deliveryFeeCent: number
  totalPriceCent: number
  rentalDepositCent: number
  violationDepositCent: number
  depositFreeThresholdScore: number
}
type RentalQuoteView = {
  quoteId: string
  vehicleGroupId: number
  groupCode: string
  groupName: string
  displayName: string
  vehicleClass: string
  bodyType?: string
  energyType: string
  seatsMin: number
  seatsMax: number
  pickupPoiName: string
  pickupAddress: string
  returnPoiName: string
  returnAddress: string
  pickupMode: string
  returnMode: string
  rentalDays: number
  isOneWay: boolean
  priceTemplateId: number
  featureTags?: string
  travelTags?: string
  availableCount?: number
  dailyMileageLimitKm?: number
  extraMileageFeeCent?: number
  includedServices?: string
  feeBreakdown: FeeBreakdown
  priceSnapshot: Record<string, unknown>
}
type RentalCarView = {
  name: string
  image: string
  label: string
  labelClass: string
  desc: string
  score: string
  reviews: number
  selected?: boolean
  model: {
    brand: string
    series: string
    seriesFullName: string
    transmission: string
    seats: number
    luggage: number
    energyType: string
  }
  quote: RentalQuoteView
}
type CityOption = {
  name: string
  adcode?: string
  citycode?: string
  level?: string
}
type ProvinceCityOption = {
  label: string
  value: string
  adcode?: string
  citycode?: string
  children?: ProvinceCityOption[]
}
type StoreOption = {
  id: string
  name: string
  address: string
  city: string
  type?: string
  distance?: string
  location?: {
    lng: number
    lat: number
  }
}

const mode = ref<Mode>('home')
const elementLocale = zhCn
const rentalCardAssetBase = 'https://ai-education-1428653062.cos.ap-shanghai.myqcloud.com/car_rental/index'
const heroCar = `${rentalCardAssetBase}/rental-hero-road-wide.png`
const rentalCardImages = [
  `${rentalCardAssetBase}/rental-card-burgundy-sedan.webp`,
  `${rentalCardAssetBase}/rental-card-red-sedan.webp`,
  `${rentalCardAssetBase}/rental-card-silver-suv.webp`,
  `${rentalCardAssetBase}/rental-card-white-sedan.webp`,
]
const rentalCardProfiles = [
  { name: '轩逸 1.6L CVT悦享版', desc: '经济省油，舒适大空间出行', brand: '日产', series: '轩逸', transmission: '自动挡', seats: 5, luggage: 2, energyType: '汽油' },
  { name: '速腾 1.5T DSG超越版', desc: '动力充沛，操控出色更从容', brand: '大众', series: '速腾', transmission: '自动挡', seats: 5, luggage: 3, energyType: '汽油' },
  { name: '皓影 1.5T CVT舒适版', desc: '空间宽敞，舒适安心全家出行', brand: '本田', series: '皓影', transmission: '自动挡', seats: 5, luggage: 3, energyType: '汽油' },
  { name: '凯美瑞 2.0E 精英版', desc: '稳定可靠，商务家用皆宜', brand: '丰田', series: '凯美瑞', transmission: '自动挡', seats: 5, luggage: 2, energyType: '汽油' },
]
const yuan = (cent: number | undefined) => Math.round((cent || 0) / 100)
const energyText = (value?: string) => {
  const text = String(value || '').toUpperCase()
  if (['FUEL', 'GASOLINE', 'PETROL'].includes(text)) return '汽油'
  if (['EV', 'ELECTRIC', 'BEV', 'NEW_ENERGY'].includes(text) || text.includes('电')) return '纯电'
  if (['HYBRID', 'PHEV'].includes(text) || text.includes('混')) return '混动'
  return value || '不限能源'
}
const quoteFee = (daily: number, days = 2, extra: Partial<FeeBreakdown> = {}): FeeBreakdown => {
  const rentalFeeCent = daily * days * 100
  const baseServiceFeeCent = extra.baseServiceFeeCent ?? 0
  const vehiclePrepareFeeCent = extra.vehiclePrepareFeeCent ?? 3000
  const oneWayFeeCent = extra.oneWayFeeCent ?? 0
  const deliveryFeeCent = extra.deliveryFeeCent ?? 0
  const totalPriceCent = extra.totalPriceCent ?? rentalFeeCent + baseServiceFeeCent + vehiclePrepareFeeCent + oneWayFeeCent + deliveryFeeCent
  return {
    rentalFeeCent,
    baseServiceFeeCent,
    vehiclePrepareFeeCent,
    oneWayFeeCent,
    deliveryFeeCent,
    totalPriceCent,
    rentalDepositCent: extra.rentalDepositCent ?? 0,
    violationDepositCent: extra.violationDepositCent ?? 200000,
    depositFreeThresholdScore: extra.depositFreeThresholdScore ?? 600,
  }
}
const makeQuote = (id: string, groupId: number, groupCode: string, groupName: string, displayName: string, vehicleClass: string, energyType: string, daily: number, feeExtra: Partial<FeeBreakdown> = {}): RentalQuoteView => {
  const feeBreakdown = quoteFee(daily, 2, feeExtra)
  return {
    quoteId: id,
    vehicleGroupId: groupId,
    groupCode,
    groupName,
    displayName,
    vehicleClass,
    energyType,
    seatsMin: 5,
    seatsMax: 5,
    pickupPoiName: '上海虹桥机场 T2 航站楼',
    pickupAddress: '上海市闵行区申达一路',
    returnPoiName: '杭州萧山国际机场',
    returnAddress: '杭州市萧山区空港大道',
    pickupMode: 'POI',
    returnMode: 'POI',
    rentalDays: 2,
    isOneWay: true,
    priceTemplateId: groupId,
    feeBreakdown,
    priceSnapshot: { source: 'rental_price_template', groupCode, rentalDays: 2, feeBreakdown },
  }
}
const seedCars: RentalCarView[] = [
  { name: '轩逸 1.6L CVT悦享版', image: rentalCardImages[0], label: '经济型', labelClass: 'green', desc: '经济省油，舒适大空间出行', score: '4.8', reviews: 126, model: { brand: '日产', series: '轩逸', seriesFullName: '轩逸 1.6L CVT悦享版', transmission: '自动挡', seats: 5, luggage: 2, energyType: '汽油' }, quote: makeQuote('Q-1-1', 1, 'ECONOMY_SEDAN', '经济型轿车', '轩逸 1.6L CVT悦享版', '经济型', '汽油', 57, { vehiclePrepareFeeCent: 0 }) },
  { name: '速腾 1.5T DSG超越版', image: rentalCardImages[1], label: '舒适型', labelClass: 'green', desc: '动力充沛，操控出色更从容', score: '4.9', reviews: 215, model: { brand: '大众', series: '速腾', seriesFullName: '速腾 1.5T DSG超越版', transmission: '自动挡', seats: 5, luggage: 3, energyType: '汽油' }, quote: makeQuote('Q-2-2', 2, 'COMFORT_SEDAN', '舒适型轿车', '速腾 1.5T DSG超越版', '舒适型', '汽油', 105, { vehiclePrepareFeeCent: 0 }) },
  { name: '皓影 1.5T CVT舒适版', image: rentalCardImages[2], label: 'SUV', labelClass: 'purple', desc: '空间宽敞，舒适安心全家出行', score: '4.8', reviews: 182, model: { brand: '本田', series: '皓影', seriesFullName: '皓影 1.5T CVT舒适版', transmission: '自动挡', seats: 5, luggage: 3, energyType: '汽油' }, quote: makeQuote('Q-3-3', 3, 'SUV', 'SUV', '皓影 1.5T CVT舒适版', 'SUV', '汽油', 147, { vehiclePrepareFeeCent: 0 }) },
  { name: '凯美瑞 2.0E 精英版', image: rentalCardImages[3], label: '舒适型', labelClass: 'green', desc: '稳定可靠，商务家用皆宜', score: '4.9', reviews: 97, selected: true, model: { brand: '丰田', series: '凯美瑞', seriesFullName: '凯美瑞 2.0E 精英版', transmission: '自动挡', seats: 5, luggage: 2, energyType: '汽油' }, quote: makeQuote('Q-4-4', 4, 'COMFORT_SEDAN_PLUS', '舒适型轿车', '凯美瑞 2.0E 精英版', '舒适型', '汽油', 108, { baseServiceFeeCent: 0, vehiclePrepareFeeCent: 0 }) },
]
const cars = ref<RentalCarView[]>([])
const activeCategory = ref('全部')
const sortMode = ref<'recommend' | 'priceAsc' | 'priceDesc' | 'scoreDesc'>('recommend')
const categoryOptions = ['全部', '经济型', '舒适型', 'SUV', '新能源', '商务型']
const sortOptions = [
  { value: 'recommend', label: '推荐排序' },
  { value: 'priceAsc', label: '价格从低到高' },
  { value: 'priceDesc', label: '价格从高到低' },
  { value: 'scoreDesc', label: '评分最高' },
] as const
const moreFilterOptions = ['可免押', '免费取消', '含基础保险', '24h 救援']
const searchForm = ref({
  pickupCity: '',
  returnCity: '',
  pickupLocation: '',
  returnLocation: '',
  pickupDate: '2025-06-01',
  pickupTime: '10:00',
  returnDate: '2025-06-03',
  returnTime: '10:00',
  peopleCount: 2,
  vehiclePreference: '不限车型',
  isOneWay: true,
})
const vehicleOptionMeta: Record<string, string> = {
  '不限车型': '全部可租车型',
  '经济型': '省油代步',
  '舒适型': '家庭/商务',
  'SUV': '大空间出行',
  '新能源': '低碳用车',
  '商务型': '多人同行',
}
const cityOptions = ref<CityOption[]>([])
const provinceCityOptions = ref<ProvinceCityOption[]>([])
const pickupCityPath = ref<string[]>([])
const returnCityPath = ref<string[]>([])
const pickupLocationOptions = ref<StoreOption[]>([])
const returnLocationOptions = ref<StoreOption[]>([])
const cityLoading = ref(false)
const pickupStoreLoading = ref(false)
const returnStoreLoading = ref(false)
const locatingCity = ref(false)
const cityListLoaded = ref(false)
const currentGeoPoint = ref<{ lng: number; lat: number } | null>(null)
let AMapRef: any = null
const normalizeCityName = (value?: string) => String(value || '').replace(/市$/, '').trim()
const ensureCityOption = (city: string, extra: Partial<CityOption> = {}) => {
  const name = normalizeCityName(city)
  if (!name) return
  if (!cityOptions.value.some(item => item.name === name)) cityOptions.value.unshift({ name, ...extra })
}
const mergeCityOptions = (items: CityOption[]) => {
  const map = new Map(cityOptions.value.map(item => [item.name, item]))
  items.forEach(item => {
    const name = normalizeCityName(item.name)
    if (name) map.set(name, { ...map.get(name), ...item, name })
  })
  cityOptions.value = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}
const mergeProvinceCityOptions = (items: ProvinceCityOption[]) => {
  const map = new Map(provinceCityOptions.value.map(item => [item.value, item]))
  items.forEach(item => map.set(item.value, item))
  provinceCityOptions.value = [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
}
const districtToCityOptions = (districts: any[]): CityOption[] => {
  const cities: CityOption[] = []
  const walk = (items: any[]) => {
    items.forEach(item => {
      if (item.level === 'city' || item.level === 'province') {
        cities.push({
          name: normalizeCityName(item.name),
          adcode: item.adcode,
          citycode: item.citycode,
          level: item.level,
        })
      }
      if (Array.isArray(item.districtList)) walk(item.districtList)
      if (Array.isArray(item.districts)) walk(item.districts)
    })
  }
  walk(districts)
  return cities.filter(item => item.name)
}
const districtToProvinceCityOptions = (districts: any[]): ProvinceCityOption[] => {
  const normalizeChildren = (item: any) => {
    const children = item.districtList || item.districts || []
    return children
      .filter((child: any) => child.level === 'city' || child.level === 'province')
      .map((child: any) => ({
        label: normalizeCityName(child.name),
        value: normalizeCityName(child.name),
        adcode: child.adcode,
        citycode: child.citycode,
      }))
      .filter((child: ProvinceCityOption) => child.label)
  }
  const root = districts[0]?.districtList || districts[0]?.districts || districts
  return root
    .filter((item: any) => item.level === 'province' || item.level === 'city')
    .map((item: any) => {
      const provinceName = normalizeCityName(item.name)
      const children = normalizeChildren(item)
      return {
        label: provinceName,
        value: provinceName,
        adcode: item.adcode,
        citycode: item.citycode,
        children: children.length ? children : [{ label: provinceName, value: provinceName, adcode: item.adcode, citycode: item.citycode }],
      }
    })
    .filter((item: ProvinceCityOption) => item.label)
}
const normalizeStore = (poi: any, city: string): StoreOption => {
  const location = poi.location
  return {
    id: String(poi.id || `${poi.name}-${poi.address || ''}`),
    name: String(poi.name || '未命名门店'),
    address: Array.isArray(poi.address) ? poi.address.join('') : String(poi.address || poi.pname || city),
    city,
    type: poi.type,
    distance: poi.distance ? `${poi.distance}m` : '',
    location: location ? { lng: Number(location.lng), lat: Number(location.lat) } : undefined,
  }
}
const getAMap = async () => {
  if (!AMapRef) AMapRef = await loadAMap()
  return AMapRef
}
const loadChinaCities = async () => {
  if (cityListLoaded.value || cityLoading.value) return
  cityLoading.value = true
  try {
    const AMap = await getAMap()
    const result = await new Promise<{ cities: CityOption[]; provinceCities: ProvinceCityOption[] }>((resolve, reject) => {
      const districtSearch = new AMap.DistrictSearch({
        level: 'country',
        subdistrict: 2,
        extensions: 'base',
      })
      districtSearch.search('中国', (status: string, result: any) => {
        if (status !== 'complete') {
          reject(new Error('全国城市列表加载失败'))
          return
        }
        const districts = result?.districtList || []
        resolve({
          cities: districtToCityOptions(districts),
          provinceCities: districtToProvinceCityOptions(districts),
        })
      })
    })
    mergeCityOptions(result.cities)
    mergeProvinceCityOptions(result.provinceCities)
    cityListLoaded.value = true
    syncPickupCityPath()
    syncReturnCityPath()
  } catch (error: any) {
    ElMessage.warning(error?.message || '城市列表加载失败，请输入城市名搜索')
  } finally {
    ensureCityOption(searchForm.value.pickupCity)
    ensureCityOption(searchForm.value.returnCity)
    cityLoading.value = false
  }
}
const handleCityDropdown = (visible: boolean) => {
  if (visible) loadChinaCities()
}
const findProvinceCityPath = (city: string) => {
  const name = normalizeCityName(city)
  for (const province of provinceCityOptions.value) {
    const matched = province.children?.find(child => child.value === name)
    if (matched) return [province.value, matched.value]
    if (province.value === name) return [province.value, province.children?.[0]?.value || province.value]
  }
  return [name, name]
}
const syncPickupCityPath = () => {
  pickupCityPath.value = findProvinceCityPath(searchForm.value.pickupCity)
}
const syncReturnCityPath = () => {
  returnCityPath.value = findProvinceCityPath(searchForm.value.returnCity)
}
const handlePickupCityPathChange = (value: string[]) => {
  const city = normalizeCityName(value?.[1] || value?.[0])
  searchForm.value.pickupCity = city
}
const handleReturnCityPathChange = (value: string[]) => {
  const city = normalizeCityName(value?.[1] || value?.[0])
  searchForm.value.returnCity = city
}
const searchCities = async (keyword: string) => {
  const query = keyword.trim()
  if (!query) {
    loadChinaCities()
    return
  }
  cityLoading.value = true
  try {
    const AMap = await getAMap()
    await new Promise<void>((resolve, reject) => {
      const districtSearch = new AMap.DistrictSearch({
        level: 'city',
        subdistrict: 0,
        extensions: 'base',
      })
      districtSearch.search(query, (status: string, result: any) => {
        if (status !== 'complete') {
          reject(new Error('城市查询失败'))
          return
        }
        const cities = districtToCityOptions(result?.districtList || [])
        mergeCityOptions(cities)
        ensureCityOption(searchForm.value.pickupCity)
        ensureCityOption(searchForm.value.returnCity)
        resolve()
      })
    })
  } catch (error: any) {
    ElMessage.warning(error?.message || '城市查询暂不可用，请稍后重试')
  } finally {
    cityLoading.value = false
  }
}
const locateCurrentCity = async (target: 'pickup' | 'return' = 'pickup', silent = false) => {
  locatingCity.value = true
  let locatedCity = ''
  try {
    const AMap = await getAMap()
    const located = await new Promise<{ city: string; point?: { lng: number; lat: number } }>((resolve, reject) => {
      const citySearch = new AMap.CitySearch()
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete' && result?.city) {
          resolve({ city: normalizeCityName(result.city) })
          return
        }
        const geolocation = new AMap.Geolocation({ timeout: 8000, showButton: false })
        geolocation.getCurrentPosition((geoStatus: string, geoResult: any) => {
          const addressCity = geoResult?.addressComponent?.city || geoResult?.addressComponent?.province
          const position = geoResult?.position
          if (geoStatus === 'complete' && addressCity) {
            resolve({
              city: normalizeCityName(addressCity),
              point: position ? { lng: Number(position.lng), lat: Number(position.lat) } : undefined,
            })
          } else reject(new Error('定位失败，请手动选择城市'))
        })
      })
    })
    locatedCity = located.city
    currentGeoPoint.value = located.point || currentGeoPoint.value
    if (target === 'return') {
      searchForm.value.returnCity = located.city
      ensureCityOption(located.city)
      syncReturnCityPath()
    } else {
      searchForm.value.pickupCity = located.city
      ensureCityOption(located.city)
      syncPickupCityPath()
      if (!searchForm.value.isOneWay) {
        searchForm.value.returnCity = ''
        returnCityPath.value = []
      }
    }
    if (!silent) ElMessage.success(`已定位到 ${located.city}`)
  } catch (error: any) {
    if (!silent) ElMessage.warning(error?.message || '定位失败，请手动选择城市')
  } finally {
    locatingCity.value = false
  }
  return locatedCity
}
const searchStores = async (kind: 'pickup' | 'return', keyword = '') => {
  const city = normalizeCityName(kind === 'pickup' ? searchForm.value.pickupCity : searchForm.value.returnCity || searchForm.value.pickupCity)
  if (!city) return
  const loading = kind === 'pickup' ? pickupStoreLoading : returnStoreLoading
  loading.value = true
  try {
    const AMap = await getAMap()
    const query = [keyword.trim(), '租车', '机场', '高铁站'].filter(Boolean).join(' ')
    const stores = await new Promise<StoreOption[]>((resolve, reject) => {
      const placeSearch = new AMap.PlaceSearch({
        city,
        citylimit: true,
        pageSize: 12,
        pageIndex: 1,
        extensions: 'all',
        type: '汽车服务|汽车租赁|交通设施服务',
      })
      placeSearch.search(query || '租车', (status: string, result: any) => {
        if (status !== 'complete') {
          reject(new Error(`${city} 暂未查到可用取还车点`))
          return
        }
        resolve((result?.poiList?.pois || []).map((poi: any) => normalizeStore(poi, city)))
      })
    })
    if (kind === 'pickup') pickupLocationOptions.value = stores
    else returnLocationOptions.value = stores
    if (!stores.length) ElMessage.warning(`${city} 暂未查到可用取还车点，请换个关键词`)
  } catch (error: any) {
    if (kind === 'pickup') pickupLocationOptions.value = []
    else returnLocationOptions.value = []
    ElMessage.warning(error?.message || '门店查询暂不可用，请稍后重试')
  } finally {
    loading.value = false
  }
}
const searchNearbyStores = async (kind: 'pickup' | 'return', silent = false) => {
  const city = normalizeCityName(kind === 'pickup' ? searchForm.value.pickupCity : searchForm.value.returnCity)
  if (!city) {
    if (!silent) ElMessage.warning(kind === 'pickup' ? '请先选择取车城市' : '请先选择还车城市')
    return
  }
  const loading = kind === 'pickup' ? pickupStoreLoading : returnStoreLoading
  loading.value = true
  try {
    const AMap = await getAMap()
    if (!currentGeoPoint.value) {
      await locateCurrentCity(kind, silent)
    }
    const point = currentGeoPoint.value
    if (!point) throw new Error('定位失败，请输入关键词查询门店')
    const stores = await new Promise<StoreOption[]>((resolve, reject) => {
      const placeSearch = new AMap.PlaceSearch({
        city,
        citylimit: true,
        pageSize: 12,
        pageIndex: 1,
        extensions: 'all',
        type: '汽车服务|汽车租赁|交通设施服务',
      })
      placeSearch.searchNearBy('租车', new AMap.LngLat(point.lng, point.lat), 8000, (status: string, result: any) => {
        if (status !== 'complete') {
          reject(new Error(`${city} 附近暂未查到租车门店`))
          return
        }
        resolve((result?.poiList?.pois || []).map((poi: any) => normalizeStore(poi, city)))
      })
    })
    if (kind === 'pickup') pickupLocationOptions.value = stores
    else returnLocationOptions.value = stores
    if (stores.length) {
      if (!silent) ElMessage.success(`已找到 ${stores.length} 个附近租车点`)
    } else if (!silent) ElMessage.warning(`${city} 附近暂未查到租车门店`)
  } catch (error: any) {
    if (!silent) ElMessage.warning(error?.message || '附近门店查询失败')
  } finally {
    loading.value = false
  }
}
const searchPickupStores = (keyword: string) => searchStores('pickup', keyword)
const searchReturnStores = (keyword: string) => searchStores('return', keyword)
const contactForm = ref({
  name: '',
  phone: '',
  remark: '',
})
const protectionPackages = [
  { code: 'BASE', name: '基础保险', dailyFeeCent: 0 },
  { code: 'CAREFREE', name: '安心保障套餐', dailyFeeCent: 6000 },
  { code: 'PREMIUM', name: '尊享无忧套餐', dailyFeeCent: 12000 },
]
const selectedProtectionCode = ref('CAREFREE')
const selectedProtection = computed(() => protectionPackages.find(item => item.code === selectedProtectionCode.value) || protectionPackages[0])
const protectionFeeCent = computed(() => selectedProtection.value.dailyFeeCent * selectedQuote.value.rentalDays)
const payableTotalCent = computed(() => selectedFee.value.totalPriceCent + protectionFeeCent.value)
const bookingLoading = ref(false)
const latestOrderId = ref<number | null>(null)
const latestOrderDetail = ref<any | null>(null)
const detailBackMode = ref<Mode>('results')
const dateLabel = (date: string, time: string) => `${date} ${time}`
const daysBetween = () => {
  const start = new Date(`${searchForm.value.pickupDate}T00:00:00`)
  const end = new Date(`${searchForm.value.returnDate}T00:00:00`)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000)
  return Math.max(1, days || 1)
}
const quoteToCar = (quote: any, index: number): RentalCarView => {
  const fallback = seedCars[index % seedCars.length]
  const profile = rentalCardProfiles[index % rentalCardProfiles.length]
  const fee = quote.feeBreakdown || fallback.quote.feeBreakdown
  const modelName = quote.displayName || quote.vehicleName || quote.groupName || profile.name
  const featureTags = String(quote.featureTags || quote.travelTags || '')
    .split(/[,，]/)
    .map(item => item.trim())
    .filter(Boolean)
  return {
    name: modelName,
    image: quote.imageUrl || quote.coverImage || rentalCardImages[index % rentalCardImages.length] || fallback.image,
    label: quote.vehicleClass || quote.groupName || fallback.label,
    labelClass: quote.groupCode?.includes('SUV') ? 'purple' : 'green',
    desc: featureTags.slice(0, 2).join('，') || quote.groupName || profile.desc,
    score: quote.rating == null ? '' : String(quote.rating),
    reviews: Number(quote.reviewCount || quote.reviews || 0),
    selected: index === 0,
    model: {
      brand: quote.brand || profile.brand,
      series: quote.series || quote.groupName || profile.series,
      seriesFullName: modelName,
      transmission: quote.transmission || profile.transmission,
      seats: quote.seatsMax || quote.seatsMin || profile.seats,
      luggage: quote.luggage || profile.luggage,
      energyType: energyText(quote.energyType) || profile.energyType,
    },
    quote: {
      ...fallback.quote,
      ...quote,
      feeBreakdown: fee,
      featureTags: featureTags.join(',') || quote.featureTags || '',
      priceSnapshot: quote.priceSnapshot || fallback.quote.priceSnapshot,
    },
  }
}
const splitTags = (value?: string) => String(value || '')
  .split(/[,，]/)
  .map(item => item.trim())
  .filter(Boolean)
const carMediaBadges = (car: RentalCarView) => splitTags(car.quote.featureTags || car.quote.travelTags)
  .filter(tag => !['自动挡', '手动挡', '汽油', '柴油', '纯电', '混动'].includes(tag))
  .slice(0, 2)
const carServiceTags = (car: RentalCarView) => splitTags(car.quote.includedServices).slice(0, 3)
const selectedCar = computed(() => cars.value.find(item => item.selected) || cars.value[0])
const selectedQuote = computed(() => selectedCar.value.quote)
const selectedFee = computed(() => selectedQuote.value.feeBreakdown)
const dailyPrice = (car: RentalCarView) => Math.round(yuan(car.quote.feeBreakdown.rentalFeeCent) / car.quote.rentalDays)
const matchCategory = (car: RentalCarView, category: string) => {
  if (category === '全部') return true
  if (category === '新能源') return car.model.energyType.includes('电') || car.quote.groupCode?.includes('EV')
  if (category === 'SUV') return car.label.includes('SUV') || car.quote.groupCode?.includes('SUV') || car.quote.bodyType?.includes('SUV')
  return car.label.includes(category) || car.quote.groupName?.includes(category) || car.quote.vehicleClass?.includes(category)
}
const displayedCars = computed(() => {
  const list = cars.value.filter(car => matchCategory(car, activeCategory.value))
  if (sortMode.value === 'priceAsc') list.sort((a, b) => dailyPrice(a) - dailyPrice(b))
  if (sortMode.value === 'priceDesc') list.sort((a, b) => dailyPrice(b) - dailyPrice(a))
  if (sortMode.value === 'scoreDesc') list.sort((a, b) => Number(b.score) - Number(a.score))
  return list
})
const vehicleOptions = computed(() => categoryOptions.map(item => {
  const value = item === '全部' ? '不限车型' : item
  return {
    value,
    label: value,
    count: item === '全部' ? cars.value.length : cars.value.filter(car => matchCategory(car, item)).length,
    desc: vehicleOptionMeta[value] || '可租车型',
  }
}))
const expandedQuoteId = ref<string | null>(null)
const togglePriceDetail = (quoteId: string) => {
  expandedQuoteId.value = expandedQuoteId.value === quoteId ? null : quoteId
}
const orderPreview = computed(() => ({
  orderStatus: 'pending',
  paymentStatus: 'unpaid',
  rentalCity: searchForm.value.pickupCity,
  tripDays: selectedQuote.value.rentalDays,
  peopleCount: searchForm.value.peopleCount,
  mileageText: selectedQuote.value.dailyMileageLimitKm ? `约 ${selectedQuote.value.dailyMileageLimitKm * selectedQuote.value.rentalDays} 公里` : '约 200 公里',
  pickupTime: dateLabel(searchForm.value.pickupDate, searchForm.value.pickupTime),
  returnTime: dateLabel(searchForm.value.returnDate, searchForm.value.returnTime),
  pickupSnapshot: {
    poiName: searchForm.value.pickupLocation || selectedQuote.value.pickupPoiName,
    address: selectedQuote.value.pickupAddress,
    mode: selectedQuote.value.pickupMode,
  },
  returnSnapshot: {
    poiName: searchForm.value.returnLocation || selectedQuote.value.returnPoiName,
    address: selectedQuote.value.returnAddress,
    mode: selectedQuote.value.returnMode,
  },
}))
const benefits = [
  { icon: Money, title: '价格透明', text: '明码标价，无隐形消费' },
  { icon: Check, title: '灵活取消', text: '免费取消，行程更灵活' },
  { icon: Location, title: '多网点取还', text: '全国覆盖，随心取还' },
  { icon: Headset, title: '24h 专属服务', text: '全天候在线支持' },
]
const quoteLoading = ref(false)
const quoteRequirement = () => ({
  departure: searchForm.value.pickupCity,
  destination: searchForm.value.returnCity,
  days: daysBetween(),
  peopleCount: searchForm.value.peopleCount,
  budget: 2000,
  budgetType: 'TOTAL',
  travelDate: searchForm.value.pickupDate,
  routeMode: 'LANDING_RENTAL_TRIP',
  transportMode: 'RENTAL_CAR',
  rentalIntent: 'USER_REQUIRED',
  preferences: ['租车出行', searchForm.value.vehiclePreference],
  rentalRequirement: {
    needRental: true,
    rentalStartCity: searchForm.value.pickupCity,
    rentalEndCity: searchForm.value.returnCity,
    pickupLocation: searchForm.value.pickupLocation,
    returnLocation: searchForm.value.returnLocation,
    pickupMode: 'AIRPORT',
    returnMode: 'AIRPORT',
    pickupCity: searchForm.value.pickupCity,
    returnCity: searchForm.value.returnCity,
    vehiclePreference: searchForm.value.vehiclePreference,
    rentalDays: daysBetween(),
    deliveryRequired: false,
    isOneWay: searchForm.value.isOneWay,
  },
})
const loadQuotes = async () => {
  quoteLoading.value = true
  try {
    const data = await rentalApi.previewQuotes({ requirement: quoteRequirement() })
    if (data.quoteOptions?.length) {
      cars.value = data.quoteOptions.map(quoteToCar)
      activeCategory.value = '全部'
      sortMode.value = 'recommend'
    }
  } catch {
    cars.value = []
  } finally {
    quoteLoading.value = false
  }
}
const loadLatestOrderedQuotes = async () => {
  try {
    const data = await rentalApi.latestOrderedQuotes()
    if (data?.length) {
      cars.value = data.map(quoteToCar)
    }
  } catch {
    cars.value = []
  }
}
const categoryFromVehicle = (value: string) => value && value !== '不限车型' ? value : '全部'
const applyVehicleFilter = () => {
  activeCategory.value = categoryFromVehicle(searchForm.value.vehiclePreference)
  sortMode.value = 'recommend'
}
const hasCompleteSearchLocation = () => Boolean(
  searchForm.value.pickupCity &&
  searchForm.value.pickupLocation &&
  (!searchForm.value.isOneWay || searchForm.value.returnLocation),
)
const switchMode = (next: Mode) => {
  mode.value = next
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
}
const goResults = async () => {
  if (hasCompleteSearchLocation()) await loadQuotes()
  else await loadLatestOrderedQuotes()
  if (!cars.value.length) {
    ElMessage.warning('暂未获取到可用车型，请稍后重试或调整取还车信息')
    return
  }
  applyVehicleFilter()
  switchMode('results')
}
const viewAllCars = async () => {
  searchForm.value.vehiclePreference = '不限车型'
  cars.value = []
  await loadLatestOrderedQuotes()
  if (!cars.value.length) {
    ElMessage.warning('暂未获取到可用车型，请稍后重试')
    return
  }
  activeCategory.value = '全部'
  sortMode.value = 'recommend'
  switchMode('results')
}
const applyMoreFilter = (label: string) => {
  ElMessage.info(`已选择：${label}`)
}
const goDetail = (car?: RentalCarView) => {
  detailBackMode.value = mode.value === 'results' ? 'results' : 'home'
  if (car) {
    cars.value = cars.value.map(item => ({ ...item, selected: item.quote.quoteId === car.quote.quoteId }))
  }
  switchMode('detail')
}
const createRentalTripPlan = () => ({
  title: `${searchForm.value.pickupCity}租车出行`,
  destination: searchForm.value.returnCity,
  days: selectedQuote.value.rentalDays,
  summary: `${selectedCar.value.name} ${selectedQuote.value.rentalDays}天租车订单`,
  dailyPlans: [],
  budgetSummary: { transportCost: yuan(payableTotalCent.value), totalEstimatedCost: yuan(payableTotalCent.value) },
  tips: ['取车前请携带身份证、驾驶证和信用卡。'],
})
const bookNow = async () => {
  if (!contactForm.value.name.trim() || !contactForm.value.phone.trim()) {
    ElMessage.warning('请先填写联系人和手机号')
    return
  }
  bookingLoading.value = true
  try {
    const result = await rentalApi.createOrder({
      requirement: quoteRequirement(),
      tripPlan: createRentalTripPlan(),
      selectedQuote: selectedQuote.value,
      protectionPackageCode: selectedProtection.value.code,
      protectionPackageName: selectedProtection.value.name,
      protectionFeeCent: protectionFeeCent.value,
      contactName: contactForm.value.name.trim(),
      contactPhone: contactForm.value.phone.trim(),
      remark: contactForm.value.remark.trim() || `${selectedCar.value.name} 租车预订`,
    })
    latestOrderId.value = result.id
    await rentalApi.payOrder(result.id, { success: true })
    latestOrderDetail.value = await rentalApi.getOrder(result.id)
    switchMode('order')
    ElMessage.success(`支付成功，订单ID：${result.id}`)
  } finally {
    bookingLoading.value = false
  }
}
watch(() => searchForm.value.pickupCity, city => {
  const name = normalizeCityName(city)
  if (!name) {
    searchForm.value.pickupLocation = ''
    pickupLocationOptions.value = []
    pickupCityPath.value = []
    return
  }
  searchForm.value.pickupCity = name
  searchForm.value.pickupLocation = ''
  ensureCityOption(name)
  syncPickupCityPath()
  searchStores('pickup')
  if (!searchForm.value.isOneWay) {
    searchForm.value.returnCity = ''
    searchForm.value.returnLocation = ''
    returnCityPath.value = []
    returnLocationOptions.value = []
  }
})
watch(() => searchForm.value.returnCity, city => {
  const name = normalizeCityName(city)
  if (!name) {
    searchForm.value.returnLocation = ''
    returnLocationOptions.value = []
    returnCityPath.value = []
    return
  }
  searchForm.value.returnCity = name
  searchForm.value.returnLocation = ''
  ensureCityOption(name)
  syncReturnCityPath()
  searchStores('return')
})
watch(() => searchForm.value.isOneWay, value => {
  if (!value) {
    searchForm.value.returnCity = ''
    searchForm.value.returnLocation = ''
    returnCityPath.value = []
    returnLocationOptions.value = []
  } else {
    if (searchForm.value.returnCity) searchStores('return')
  }
})
watch(() => searchForm.value.pickupLocation, value => {
  if (!searchForm.value.isOneWay) searchForm.value.returnLocation = ''
})
onMounted(async () => {
  ensureCityOption(searchForm.value.pickupCity)
  ensureCityOption(searchForm.value.returnCity)
  loadChinaCities()
  const city = await locateCurrentCity('pickup', true)
  if (city) {
    await searchNearbyStores('pickup', true)
    if (!pickupLocationOptions.value.length) await searchStores('pickup')
    const firstPickup = pickupLocationOptions.value[0]
    if (firstPickup) searchForm.value.pickupLocation = firstPickup.name
    if (!searchForm.value.returnCity) {
      searchForm.value.returnCity = searchForm.value.pickupCity
      syncReturnCityPath()
    }
    await searchStores('return')
    const firstReturn = returnLocationOptions.value[0]
    if (firstReturn) searchForm.value.returnLocation = firstReturn.name
  } else {
    searchStores('pickup')
    searchStores('return')
  }
  await loadLatestOrderedQuotes()
})
</script>

<template>
  <el-config-provider :locale="elementLocale">
  <div class="rental-page">
    <template v-if="mode === 'home'">
      <section class="home-hero">
        <div class="home-hero-inner">
          <div class="hero-copy">
            <h1>轻松租车，自在出行</h1>
            <p>多样车型，灵活取还，开启每一段美好旅程</p>
            <div class="hero-promises">
              <article><el-icon><Money /></el-icon><b>价格透明</b><span>无隐藏费用</span></article>
              <article><el-icon><Check /></el-icon><b>免费取消</b><span>灵活无忧</span></article>
              <article><el-icon><Headset /></el-icon><b>24h 专属服务</b><span>全天候支持</span></article>
            </div>
          </div>
          <div class="hero-art">
            <span class="plane"></span>
            <div class="skyline"></div>
            <img :src="heroCar" alt="蓝色 SUV">
            <aside class="hero-price-card">
              <span>今日热门 SUV</span>
              <b>低至</b>
              <strong>¥57<em>/天起</em></strong>
            </aside>
          </div>
        </div>
      </section>

      <main class="home-main">
        <section class="search-card">
          <div class="search-head">
            <div class="rental-tabs" role="tablist" aria-label="租车类型">
              <button class="active" type="button" role="tab" aria-selected="true">国内租车</button>
              <button class="disabled" type="button" role="tab" aria-disabled="true" disabled>海外租车</button>
            </div>
          </div>
          <el-form class="modern-search-form" :model="searchForm" label-position="top" size="large">
            <el-form-item class="city-field">
              <template #label>
                <span class="field-label-row">取车城市<button type="button" :disabled="locatingCity" @click.stop="locateCurrentCity('pickup')"><el-icon><Location /></el-icon>定位</button></span>
              </template>
              <el-cascader
                v-model="pickupCityPath"
                :options="provinceCityOptions"
                filterable
                clearable
                :loading="cityLoading"
                placeholder="选择省份 / 城市"
                :props="{ expandTrigger: 'hover' }"
                @visible-change="handleCityDropdown"
                @change="handlePickupCityPathChange"
              />
            </el-form-item>
            <el-form-item class="return-city-field">
              <template #label>
                <span class="field-label-row">还车城市<button type="button" :disabled="!searchForm.isOneWay || locatingCity" @click.stop="locateCurrentCity('return')"><el-icon><Location /></el-icon>定位</button></span>
              </template>
              <el-cascader
                v-model="returnCityPath"
                :options="provinceCityOptions"
                filterable
                clearable
                :disabled="!searchForm.isOneWay"
                :loading="cityLoading"
                placeholder="选择省份 / 城市"
                :props="{ expandTrigger: 'hover' }"
                @visible-change="handleCityDropdown"
                @change="handleReturnCityPathChange"
              />
            </el-form-item>
            <el-form-item class="pickup-field" label="取车地点">
              <el-select
                v-model="searchForm.pickupLocation"
                filterable
                remote
                reserve-keyword
                :remote-method="searchPickupStores"
                :loading="pickupStoreLoading"
                :disabled="!searchForm.pickupCity"
                placeholder="先选城市，再搜机场/车站/门店"
                popper-class="store-select-popper"
              >
                <el-option v-for="item in pickupLocationOptions" :key="item.id" :label="item.name" :value="item.name">
                  <div class="store-option"><b>{{ item.name }}</b><span>{{ item.address }}</span><em v-if="item.type">{{ item.type }}</em></div>
                </el-option>
                <template #empty><div class="store-empty">输入关键词查询可取车门店</div></template>
                <template #footer>
                  <button class="select-footer-action" type="button" :disabled="!searchForm.pickupCity || pickupStoreLoading" @click="searchNearbyStores('pickup')">
                    <el-icon><Location /></el-icon>定位附近取车点
                  </button>
                </template>
              </el-select>
            </el-form-item>
            <el-form-item class="return-field" label="还车地点">
              <el-select
                v-model="searchForm.returnLocation"
                filterable
                remote
                reserve-keyword
                :remote-method="searchReturnStores"
                :loading="returnStoreLoading"
                placeholder="先选城市，再搜机场/车站/门店"
                popper-class="store-select-popper"
                :disabled="!searchForm.isOneWay || !searchForm.returnCity"
              >
                <el-option v-for="item in returnLocationOptions" :key="item.id" :label="item.name" :value="item.name">
                  <div class="store-option"><b>{{ item.name }}</b><span>{{ item.address }}</span><em v-if="item.type">{{ item.type }}</em></div>
                </el-option>
                <template #empty><div class="store-empty">输入关键词查询可还车门店</div></template>
                <template #footer>
                  <button class="select-footer-action" type="button" :disabled="!searchForm.isOneWay || !searchForm.returnCity || returnStoreLoading" @click="searchNearbyStores('return')">
                    <el-icon><Location /></el-icon>定位附近还车点
                  </button>
                </template>
              </el-select>
            </el-form-item>
            <span class="form-row-break" aria-hidden="true"></span>
            <el-form-item class="pickup-date-field" label="取车日期">
              <el-date-picker v-model="searchForm.pickupDate" type="date" format="YYYY年MM月DD日" value-format="YYYY-MM-DD" :prefix-icon="Calendar" />
            </el-form-item>
            <el-form-item class="pickup-time-field" label="取车时间">
              <el-time-select v-model="searchForm.pickupTime" start="00:00" step="00:30" end="23:30" :prefix-icon="Clock" />
            </el-form-item>
            <el-form-item class="return-date-field" label="还车日期">
              <el-date-picker v-model="searchForm.returnDate" type="date" format="YYYY年MM月DD日" value-format="YYYY-MM-DD" :prefix-icon="Calendar" />
            </el-form-item>
            <el-form-item class="return-time-field" label="还车时间">
              <el-time-select v-model="searchForm.returnTime" start="00:00" step="00:30" end="23:30" :prefix-icon="Clock" />
            </el-form-item>
            <el-form-item class="people-field" label="乘车人数">
              <el-select v-model="searchForm.peopleCount" placeholder="选择人数">
                <el-option v-for="count in 7" :key="count" :label="`${count} 人`" :value="count" />
              </el-select>
            </el-form-item>
            <el-form-item class="vehicle-field" label="车型类型">
              <el-select v-model="searchForm.vehiclePreference" :prefix-icon="Van" popper-class="vehicle-select-popper">
                <el-option v-for="item in vehicleOptions" :key="item.value" :label="`${item.label} · ${item.count}款`" :value="item.value">
                  <div class="vehicle-option">
                    <b>{{ item.label }}</b>
                    <span>{{ item.count }}款 · {{ item.desc }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
            <button class="search-btn" type="button" :disabled="quoteLoading" @click="goResults">
              <el-icon><Search /></el-icon>{{ quoteLoading ? '搜索中' : '搜索车辆' }}
            </button>
          </el-form>
        </section>

        <section class="benefit-row">
          <article v-for="item in benefits" :key="item.title"><el-icon><component :is="item.icon" /></el-icon><div><b>{{ item.title }}</b><span>{{ item.text }}</span></div></article>
        </section>

        <section class="cars-section">
          <div class="section-title-line">
            <div>
              <h2>热门车型推荐</h2>
              <span>精选热门车型，满足您的出行体验</span>
            </div>
            <button type="button" @click="viewAllCars">查看全部车型 <el-icon><ArrowRight /></el-icon></button>
          </div>
          <div class="car-grid">
            <article v-for="car in cars" :key="car.name" class="home-car" role="button" tabindex="0" @click="goDetail(car)" @keydown.enter.prevent="goDetail(car)">
              <button class="favorite-lite" type="button" aria-label="收藏车型">♡</button>
              <div class="car-cover"><img :src="car.image" :alt="car.name"></div>
              <div class="home-car-body">
                <h3>{{ car.name }}</h3>
                <p><span>{{ car.model.transmission }}</span><span>{{ car.model.seats }} 座</span><span>{{ car.model.energyType }}</span></p>
                <small>{{ car.desc }}</small>
              </div>
              <div class="home-car-footer">
                <strong>¥{{ dailyPrice(car) }} <em>起/天</em></strong>
                <button class="book-now" type="button" @click.stop="goDetail(car)">立即预订</button>
              </div>
            </article>
          </div>
        </section>

      </main>
    </template>

    <template v-else-if="mode === 'results'">
      <main class="results-main">
        <section class="summary-bar">
          <article><span>取车地点</span><b><el-icon><Location /></el-icon>{{ orderPreview.pickupSnapshot.poiName }}</b></article>
          <article><span>还车地点</span><b><el-icon><Location /></el-icon>{{ orderPreview.returnSnapshot.poiName }}</b></article>
          <article><span>取车时间</span><b><el-icon><Calendar /></el-icon>{{ orderPreview.pickupTime }}</b></article>
          <article><span>还车时间</span><b><el-icon><Calendar /></el-icon>{{ orderPreview.returnTime }}</b></article>
          <article><span>行程时长</span><b><el-icon><Clock /></el-icon>{{ orderPreview.tripDays }} 天</b></article>
          <article><span>乘车人数</span><b><el-icon><User /></el-icon>{{ orderPreview.peopleCount }} 人</b></article>
            <button type="button" @click="switchMode('home')"><el-icon><EditPen /></el-icon>修改搜索</button>
        </section>

        <section class="results-layout">
          <div class="results-left">
            <div class="category-tabs">
              <button v-for="item in categoryOptions" :key="item" :class="{ active: activeCategory === item }" @click="activeCategory = item">{{ item }}</button>
            </div>
            <div class="sort-row">
              <button v-for="item in sortOptions" :key="item.value" :class="{ active: sortMode === item.value }" @click="sortMode = item.value">
                <el-icon v-if="item.value === 'recommend'"><StarFilled /></el-icon>{{ item.label }}
              </button>
              <el-dropdown trigger="click" @command="applyMoreFilter">
                <button class="more-filter" type="button"><el-icon><Filter /></el-icon>更多筛选<el-icon><ArrowDown /></el-icon></button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in moreFilterOptions" :key="item" :command="item">{{ item }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <span>共 {{ displayedCars.length }} 款车型</span>
            </div>
            <div class="result-list">
              <article v-for="car in displayedCars" :key="car.quote.quoteId" class="result-card" :class="{ selected: car.selected }">
                <div class="result-car-media">
                  <div v-if="carMediaBadges(car).length" class="media-badges">
                    <span v-for="(tag, tagIndex) in carMediaBadges(car)" :key="tag" :class="tagIndex === 0 ? 'hot-badge' : 'comfort-badge'">
                      <el-icon><StarFilled v-if="tagIndex === 0" /><Check v-else /></el-icon>{{ tag }}
                    </span>
                  </div>
                  <img :src="car.image" :alt="car.name">
                </div>
                <div class="car-info">
                  <h2>{{ car.label }} {{ car.model.transmission }} {{ car.model.seats }}座</h2>
                  <div class="specs">
                    <span><el-icon><User /></el-icon>{{ car.model.seats }} 座</span>
                    <span><el-icon><Suitcase /></el-icon>{{ car.model.luggage }} 行李箱</span>
                    <span><el-icon><Switch /></el-icon>{{ car.model.transmission }}</span>
                    <span><el-icon><Van /></el-icon>{{ car.model.energyType }}</span>
                  </div>
                  <p v-if="car.score || car.reviews"><el-icon><StarFilled /></el-icon><b v-if="car.score">{{ car.score }}分</b><em v-if="car.reviews">{{ car.reviews }} 条评价</em></p>
                  <div v-if="carServiceTags(car).length" class="service-tags"><span v-for="service in carServiceTags(car)" :key="service">{{ service }}</span></div>
                </div>
                <div class="price-box">
                  <strong>¥{{ car.selected ? yuan(car.quote.feeBreakdown.totalPriceCent) : dailyPrice(car) }}</strong><span>/{{ car.selected ? `${car.quote.rentalDays}天起` : '天起' }}</span>
                  <button type="button" @click="goDetail(car)">查看详情</button>
                  <a role="button" @click.stop="togglePriceDetail(car.quote.quoteId)">价格明细<el-icon><ArrowDown /></el-icon></a>
                </div>
                <div v-if="expandedQuoteId === car.quote.quoteId" class="inline-fee-detail">
                  <p><span>车辆租金（{{ car.quote.rentalDays }}天）</span><b>¥{{ yuan(car.quote.feeBreakdown.rentalFeeCent) }}</b></p>
                  <p><span>基础服务费</span><b>¥{{ yuan(car.quote.feeBreakdown.baseServiceFeeCent) }}</b></p>
                  <p><span>车辆整备费</span><b>¥{{ yuan(car.quote.feeBreakdown.vehiclePrepareFeeCent) }}</b></p>
                  <p><span>异地还车费</span><b>¥{{ yuan(car.quote.feeBreakdown.oneWayFeeCent) }}</b></p>
                  <p><span>送车上门费</span><b>¥{{ yuan(car.quote.feeBreakdown.deliveryFeeCent) }}</b></p>
                  <p><span>租车押金</span><b>{{ car.quote.feeBreakdown.rentalDepositCent ? `¥${yuan(car.quote.feeBreakdown.rentalDepositCent)}` : '可免押' }}</b></p>
                  <p><span>违章押金</span><b>¥{{ yuan(car.quote.feeBreakdown.violationDepositCent) }}</b></p>
                  <strong><span>预估总价</span><b>¥{{ yuan(car.quote.feeBreakdown.totalPriceCent) }}</b></strong>
                  <em>免押门槛：{{ car.quote.feeBreakdown.depositFreeThresholdScore }} 分 · 价格以下单前重新校验为准</em>
                </div>
              </article>
            </div>
            <p class="result-note"><el-icon><Check /></el-icon>所有车型均提供免费取消保障，行程更安心</p>
          </div>

          <aside class="results-side">
            <div class="map-card">
              <div class="route-map">
                <div class="map-grid"></div>
                <div class="route-line"><span></span></div>
                <b class="start"><i></i>{{ orderPreview.pickupSnapshot.poiName }}</b>
                <b class="end"><i></i>{{ orderPreview.returnSnapshot.poiName }}</b>
                <div class="map-meta">
                  <strong>{{ orderPreview.tripDays }} 天</strong>
                  <span>{{ orderPreview.mileageText }}</span>
                </div>
              </div>
            </div>
            <div class="side-card overview">
              <h3>行程概览</h3>
              <div class="timeline"><p><i></i><span>取车</span><b>{{ orderPreview.pickupTime }}<br>{{ orderPreview.pickupSnapshot.poiName }}</b></p><p><i></i><span>还车</span><b>{{ orderPreview.returnTime }}<br>{{ orderPreview.returnSnapshot.poiName }}</b></p></div>
              <p><span>行程时长</span><b>{{ orderPreview.tripDays }} 天</b></p><p><span>乘车人数</span><b>{{ orderPreview.peopleCount }} 人</b></p><p><span>预计里程</span><b>{{ orderPreview.mileageText }}</b></p>
            </div>
            <div class="side-card include">
              <h3>费用包含</h3>
              <div class="include-grid">
                <article><el-icon><Check /></el-icon><b>基础保险</b><span>车辆损失险</span></article>
                <article><el-icon><Headset /></el-icon><b>24h 道路救援</b><span>全天候支持</span></article>
                <article><el-icon><Van /></el-icon><b>车辆清洁</b><span>整车消毒清洁</span></article>
                <article><el-icon><Switch /></el-icon><b>不限里程</b><span>畅行无忧</span></article>
              </div>
              <footer><el-icon><Check /></el-icon>安心无忧出行 · 如遇问题可联系客服</footer>
            </div>
          </aside>
        </section>
      </main>
    </template>

    <template v-else-if="mode === 'detail'">
      <main class="detail-main">
        <button class="back-link" type="button" @click="switchMode(detailBackMode)">‹　{{ detailBackMode === 'results' ? '返回搜索结果' : '返回租车首页' }}</button>
        <section class="detail-layout">
          <div class="detail-left">
            <section class="vehicle-hero-card">
              <button class="favorite">♡ 收藏</button>
              <div class="vehicle-copy">
                <span>{{ selectedCar.label }}</span>
                <h1>{{ selectedCar.name }}</h1>
                <p>{{ selectedCar.desc }}</p>
                <div class="rating"><el-icon><StarFilled /></el-icon><b>4.8 分</b><em>980+ 评价</em></div>
                <div class="vehicle-specs">
                  <span><el-icon><User /></el-icon>{{ selectedCar.model.seats }} 座</span>
                  <span><el-icon><Suitcase /></el-icon>{{ selectedCar.model.luggage }} 行李箱</span>
                  <span><el-icon><Switch /></el-icon>{{ selectedCar.model.energyType }}</span>
                  <span><el-icon><Van /></el-icon>{{ selectedCar.model.transmission }}</span>
                </div>
              </div>
              <div class="vehicle-stage">
                <div class="city-bg"></div>
                <img :src="selectedCar.image" :alt="selectedCar.name">
              </div>
            </section>

            <section class="thumb-row">
              <button class="active"><img src="/assets/cars/camry.jpg" alt=""></button>
              <button><img src="/assets/cars/lavida.jpg" alt=""></button>
              <button><img src="/assets/cars/crv.jpg" alt=""></button>
              <button><img src="/assets/cars/audi-a6l.jpg" alt=""></button>
              <button><img src="/assets/cars/hero-suv.jpg" alt=""></button>
              <button class="more"><span>+6</span></button>
            </section>

            <section class="feature-strip">
              <article><i>✦</i><b>超长续航</b><span>554km CLTC</span></article>
              <article><i>↯</i><b>智能驾驶辅助</b><span>Autopilot</span></article>
              <article><i>▣</i><b>大屏交互</b><span>15 英寸中控屏</span></article>
              <article><i>ϟ</i><b>极速充电</b><span>超充网络</span></article>
            </section>

            <section class="plan-section">
              <h2>租车方案</h2>
              <div class="plan-grid">
                <article :class="{ picked: selectedProtectionCode === 'BASE' }" @click="selectedProtectionCode = 'BASE'"><h3>基础保险 <em>已包含</em></h3><p>✓ 基础险（车辆损失险）</p><p>✓ 第三者责任险（额度最高 300 万）</p><p>✓ 7×24 小时客服支持</p><a>保障详情 ›</a></article>
                <article :class="{ picked: selectedProtectionCode === 'CAREFREE' }" @click="selectedProtectionCode = 'CAREFREE'"><h3>安心保障套餐 <em>推荐</em><strong>¥60/天</strong></h3><p>✓ 基础险（车辆损失险）</p><p>✓ 车辆损失险</p><p>✓ 第三者责任险（50万）</p><p>✓ 免费道路救援</p><a>保障详情 ›</a></article>
                <article :class="{ picked: selectedProtectionCode === 'PREMIUM' }" @click="selectedProtectionCode = 'PREMIUM'"><h3>尊享无忧套餐 <strong>¥120/天</strong></h3><p>✓ 安心保障套餐全部内容</p><p>✓ 车上人员险</p><p>✓ 划痕险（免赔）</p><p>✓ 优先客服支持</p><a>保障详情 ›</a></article>
              </div>
            </section>

            <section class="detail-info-grid">
              <article class="fee-include"><h3>费用包含</h3><div><span><el-icon><Van /></el-icon>车辆租金</span><span><el-icon><Check /></el-icon>基础保险</span><span><el-icon><Headset /></el-icon>24h 道路救援</span><span><el-icon><Money /></el-icon>增值税/手续费</span></div></article>
              <article class="tips-box"><h3>温馨提示</h3><ul><li>取车时请携带本人有效身份证、驾驶证及信用卡</li><li>车辆取租流程约需 10 分钟，逾期将优先保留</li><li>车辆以实际取车为准（同车型，或同级车配置）</li><li>里程限制为 200 公里/天，超出部分 ¥2.0/公里</li></ul></article>
              <article class="store-card"><h3>取车信息 <a>修改</a></h3><p><el-icon><Location /></el-icon><b>{{ orderPreview.pickupSnapshot.poiName }}</b><br>{{ orderPreview.pickupSnapshot.address }}</p><strong><el-icon><Calendar /></el-icon>{{ orderPreview.pickupTime }}</strong></article>
              <article class="days-card"><span>⇄</span><b>{{ orderPreview.tripDays }} 天</b></article>
              <article class="store-card"><h3>还车信息 <a>修改</a></h3><p><el-icon><Location /></el-icon><b>{{ orderPreview.returnSnapshot.poiName }}</b><br>{{ orderPreview.returnSnapshot.address }}</p><strong><el-icon><Calendar /></el-icon>{{ orderPreview.returnTime }}</strong></article>
            </section>

            <section class="bottom-guarantees">
              <article><el-icon><Check /></el-icon><b>免费取消</b><span>取车前 24 小时可免费取消</span></article>
              <article><el-icon><Check /></el-icon><b>价格保障</b><span>同车型同价，差价退还</span></article>
              <article><el-icon><Headset /></el-icon><b>全天客服</b><span>7×24 小时专业客服支持</span></article>
              <article><el-icon><Check /></el-icon><b>安全出行</b><span>车况严检，出行更安心</span></article>
            </section>
          </div>

          <aside class="order-aside">
            <section class="order-card">
              <header><h2>订单概览</h2><a>修改行程</a></header>
              <div class="order-route"><p><i></i><span>取车</span><b>{{ orderPreview.pickupSnapshot.poiName }}<br><em>{{ orderPreview.pickupTime }}</em></b></p><p><i></i><span>还车</span><b>{{ orderPreview.returnSnapshot.poiName }}<br><em>{{ orderPreview.returnTime }}</em></b></p></div>
              <div class="order-meta"><p><span>租期</span><b>{{ orderPreview.tripDays }} 天</b></p><p><span>乘车人数</span><b>{{ orderPreview.peopleCount }} 人</b></p><p><span>预计里程</span><b>{{ orderPreview.mileageText }}</b></p></div>
              <div class="contact-panel">
                <h3>联系人信息</h3>
                <label><span>联系人</span><input v-model="contactForm.name" placeholder="请输入姓名"></label>
                <label><span>手机号</span><input v-model="contactForm.phone" placeholder="请输入手机号"></label>
                <label><span>备注</span><input v-model="contactForm.remark" placeholder="可选"></label>
              </div>
              <div class="cost-detail"><h3>费用明细 <small>（预估总价）</small></h3><p><span>车辆租金（{{ selectedQuote.rentalDays }}天）</span><b>¥{{ yuan(selectedFee.rentalFeeCent) }}</b></p><p><span>基础服务费</span><b>¥{{ yuan(selectedFee.baseServiceFeeCent) }}</b></p><p><span>车辆整备费</span><b>¥{{ yuan(selectedFee.vehiclePrepareFeeCent) }}</b></p><p><span>异地还车费</span><b>¥{{ yuan(selectedFee.oneWayFeeCent) }}</b></p><p><span>送车上门费</span><b>¥{{ yuan(selectedFee.deliveryFeeCent) }}</b></p><p><span>{{ selectedProtection.name }}</span><b>¥{{ yuan(protectionFeeCent) }}</b></p><p><span>租车押金</span><b>{{ selectedFee.rentalDepositCent ? `¥${yuan(selectedFee.rentalDepositCent)}` : '可免押' }}</b></p><p><span>违章押金</span><b>¥{{ yuan(selectedFee.violationDepositCent) }}</b></p></div>
              <div class="compare-box"><h3>价格对比 <small>（同车型均价）</small></h3><p class="best"><span>PlanGo <em>推荐</em></span><b>¥866/2天</b></p><p><span>一嗨租车</span><b>¥876/2天</b></p><p><span>神州租车</span><b>¥883/2天</b></p></div>
              <div class="total-box"><span>预估总价</span><strong>¥{{ yuan(payableTotalCent) }}</strong><small>免押门槛：{{ selectedFee.depositFreeThresholdScore }} 分</small><small v-if="latestOrderId">订单ID：{{ latestOrderId }}</small></div>
              <button class="book-now" type="button" :disabled="bookingLoading" @click="bookNow">▣ {{ bookingLoading ? '预订中...' : '立即预订' }}</button>
              <button class="compare-now" type="button">加入对比</button>
              <footer><el-icon><Check /></el-icon>现在预订可免费取消</footer>
            </section>
          </aside>
        </section>
      </main>
    </template>

    <template v-else-if="mode === 'order'">
      <main class="detail-main">
        <button class="back-link" type="button" @click="switchMode('results')">‹　返回搜索结果</button>
        <section class="order-detail-page">
          <div class="order-success-card">
            <span><el-icon><Check /></el-icon></span>
            <h1>预订成功</h1>
            <p>沙箱支付已模拟完成，订单已确认。</p>
            <strong>订单ID：{{ latestOrderId }}</strong>
          </div>
          <section class="order-card order-detail-card">
            <header><h2>订单详情</h2><a>已支付</a></header>
            <div class="order-route"><p><i></i><span>取车</span><b>{{ orderPreview.pickupSnapshot.poiName }}<br><em>{{ orderPreview.pickupTime }}</em></b></p><p><i></i><span>还车</span><b>{{ orderPreview.returnSnapshot.poiName }}<br><em>{{ orderPreview.returnTime }}</em></b></p></div>
            <div class="order-meta"><p><span>车型</span><b>{{ selectedCar.name }}</b></p><p><span>保障套餐</span><b>{{ selectedProtection.name }}</b></p><p><span>联系人</span><b>{{ contactForm.name }} {{ contactForm.phone }}</b></p></div>
            <div class="cost-detail"><h3>费用明细</h3><p><span>订单状态</span><b>{{ latestOrderDetail?.orderStatus || 'confirmed' }}</b></p><p><span>支付状态</span><b>{{ latestOrderDetail?.paymentStatus || 'paid' }}</b></p><p><span>预估总价</span><b>¥{{ yuan(latestOrderDetail?.totalPriceCent || payableTotalCent) }}</b></p></div>
            <button class="book-now" type="button" @click="switchMode('detail')">查看车辆详情</button>
          </section>
        </section>
      </main>
    </template>
  </div>
  </el-config-provider>
</template>

<style scoped>
.rental-page{min-height:calc(100vh - 72px);background:#f7fbff;color:#071936}.home-hero{height:370px;position:relative;overflow:hidden;background:linear-gradient(180deg,#eaf5ff 0%,#f8fcff 72%,#fff 100%)}.home-hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(174,213,248,.34),transparent 26%,transparent 72%,rgba(181,218,251,.38))}.home-hero:after{content:"";position:absolute;left:-6vw;right:-6vw;bottom:-88px;height:190px;border-radius:50% 50% 0 0;background:linear-gradient(9deg,#b9d99f 0 18%,#dceec9 19% 35%,#fff 36% 67%,#d5e9fb 68%)}.home-hero-inner,.home-main,.results-main{width:min(1500px,calc(100vw - 72px));margin:0 auto}.home-hero-inner{position:relative;z-index:1;height:100%;display:grid;grid-template-columns:620px 1fr}.hero-copy{padding-top:48px}.hero-copy h1{margin:0;color:#081c3d;font-size:50px;line-height:1.08;font-weight:900;letter-spacing:0}.hero-copy p{margin:12px 0 20px;color:#344864;font-size:19px}.hero-promises{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:560px}.hero-promises article{height:70px;display:grid;grid-template-columns:42px 1fr;gap:6px 12px;align-items:center;padding:0 18px;border:1px solid #dce7f4;border-radius:8px;background:rgba(255,255,255,.78)}.hero-promises .el-icon{grid-row:span 2;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#1468ff;background:#eef5ff;font-size:23px}.hero-promises b{font-size:15px}.hero-promises span{align-self:start;color:#66758d;font-size:13px}.hero-art{position:relative}.hero-art img{position:absolute;right:58px;bottom:92px;width:500px;height:236px;object-fit:cover;mix-blend-mode:multiply;filter:drop-shadow(0 22px 18px rgba(31,74,118,.18))}.skyline{position:absolute;right:0;bottom:104px;width:520px;height:180px;opacity:.34;background:linear-gradient(90deg,transparent,#8fbfe6 4% 7%,transparent 8% 16%,#75aee0 17% 22%,transparent 23% 33%,#5799d4 34% 38%,transparent 39% 48%,#97c6e9 49% 55%,transparent 56% 66%,#6aa7d8 67% 72%,transparent 73%)}.plane{position:absolute;left:64px;top:54px;width:80px;height:40px;transform:rotate(15deg)}.plane:before{content:"";position:absolute;left:0;right:0;top:17px;height:9px;border-radius:999px;background:#8ab7e5}.plane:after{content:"";position:absolute;left:32px;top:0;width:14px;height:40px;background:#8ab7e5;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%)}.home-main{position:relative;z-index:2;margin-top:-54px}.search-card{padding:18px 30px 24px;border:1px solid #dce6f2;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 20px 60px rgba(30,73,126,.12)}.tabs{height:42px;display:flex;align-items:flex-start;gap:42px;border-bottom:1px solid #e4edf6;margin-bottom:18px}.tabs button{height:42px;border:0;background:transparent;color:#172d4d;font-size:16px;font-weight:900;cursor:pointer}.tabs .active{position:relative;color:#0f6bff}.tabs .active:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:4px;border-radius:999px;background:#176bff}.tabs label{margin-left:auto;font-weight:700}.tabs input{width:16px;height:16px;vertical-align:-3px}.tabs small{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid #9eb1ca;color:#7b8aa3;font-size:11px}.form-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px 24px;align-items:end}.field{display:grid;gap:8px;min-width:0}.field.city{grid-column:span 3}.field.pickup,.field.return{grid-column:span 4}.field.date,.field.mini,.search-btn{grid-column:span 2}.field.short{grid-column:span 1}.field span{color:#66758d;font-size:13px}.field b{height:48px;display:flex;align-items:center;gap:8px;border:1px solid #dce6f2;border-radius:8px;background:#fff;padding:0 13px;color:#10213b;font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden}.field .el-icon{flex:0 0 auto;color:#384b67;font-size:18px}.field em{width:8px;height:8px;margin-left:auto;border-right:1px solid #627089;border-bottom:1px solid #627089;transform:rotate(45deg)}.search-btn{height:58px;border:0;border-radius:8px;background:#1268f4;color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 18px 32px rgba(18,104,244,.22);cursor:pointer}.benefit-row{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:20px 0 18px}.benefit-row article{height:72px;display:flex;align-items:center;gap:18px;padding:0 30px;border:1px solid #dfe8f5;border-radius:8px;background:#fff}.benefit-row .el-icon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#1468ff;background:#eef5ff;font-size:27px}.benefit-row b{display:block;font-size:16px}.benefit-row span{display:block;margin-top:4px;color:#64748b;font-size:13px}.cars-section h2,.why-section h2{margin:0 0 12px;font-size:24px}.car-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.home-car{height:148px;display:grid;grid-template-columns:170px 1fr;gap:16px;align-items:center;padding:14px 18px;border:1px solid #dfe8f5;border-radius:8px;background:#fff}.home-car img{width:170px;height:112px;object-fit:cover;border-radius:6px;mix-blend-mode:multiply}.home-car h3{margin:0 0 8px;font-size:18px}.home-car p{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 8px}.home-car p span{border-radius:4px;background:#edf1f7;color:#5c687b;padding:3px 7px;font-size:12px}.home-car small{display:block;color:#66758d;font-size:13px}.home-car strong{display:block;margin-top:7px;color:#ff6b00;font-size:22px}.home-car em{color:#64748b;font-size:13px;font-style:normal}.why-section{position:relative;margin-top:20px;padding:4px 0 42px}.why-section:before{content:"";position:absolute;left:-8vw;right:-8vw;top:34px;bottom:-90px;background:linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.78)),linear-gradient(12deg,#b9d99f 0 24%,#eef7ff 25% 62%,#cfe6fb 63%);z-index:-1}.why-flow{display:grid;grid-template-columns:1fr 130px 1fr 130px 1fr 130px 1fr;align-items:center;text-align:center;min-height:126px}.why-flow article{display:grid;justify-items:center;gap:6px}.why-flow i{width:58px;height:58px;border-radius:16px;display:block;background:linear-gradient(135deg,#70b7ff,#1f6fff)}.why-flow b{font-size:16px}.why-flow span{color:#526176;font-size:13px}.why-flow em{height:2px;border-top:2px dashed #86b8ff}.why-flow em:after{content:"";display:block;width:8px;height:8px;margin:-5px 0 0 auto;border-top:2px solid #86b8ff;border-right:2px solid #86b8ff;transform:rotate(45deg)}
.results-main{padding:24px 0 36px}.summary-bar{height:96px;display:grid;grid-template-columns:1.5fr 1.5fr 1.5fr 1.5fr .8fr .8fr 168px;align-items:center;padding:0 28px;border:1px solid #dce6f5;border-radius:12px;background:#fff;box-shadow:0 12px 34px rgba(25,68,128,.08)}.summary-bar article{height:50px;display:flex;flex-direction:column;justify-content:center;padding:0 26px 0 0;border-right:1px solid #e0e8f3}.summary-bar span{color:#6c7b91;font-size:13px}.summary-bar b{display:flex;align-items:center;gap:8px;margin-top:9px;color:#0c213e;font-size:16px}.summary-bar .el-icon{color:#10213b}.summary-bar button{height:48px;border:1px solid #1268f4;border-radius:8px;background:#fff;color:#1268f4;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer}.results-layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:24px;margin-top:24px}.category-tabs{display:flex;gap:16px;margin-bottom:18px}.category-tabs button{width:78px;height:38px;border:1px solid #d7e2f0;border-radius:7px;background:#f8fbff;color:#243955;font-weight:800;cursor:pointer}.category-tabs .active{background:#1268f4;border-color:#1268f4;color:#fff}.sort-row{display:flex;align-items:center;gap:12px;margin-bottom:14px}.sort-row button{height:38px;border:1px solid #d7e2f0;border-radius:7px;background:#fff;color:#172d4d;padding:0 18px;font-weight:800;cursor:pointer}.sort-row .active{color:#1268f4;border-color:#a9c7ff}.sort-row span{margin-left:auto;color:#4f5e78;font-size:14px}.result-list{display:grid;gap:6px}.result-card{position:relative;min-height:142px;display:grid;grid-template-columns:300px minmax(0,1fr) 170px;gap:22px;align-items:center;padding:16px 32px 16px 22px;border:1px solid #dce6f2;border-radius:9px;background:#fff}.result-card.selected{border:2px solid #3978ff;padding:15px 31px 15px 21px}.choose-dot{position:absolute;left:14px;top:50%;width:24px;height:24px;margin-top:-12px;border-radius:50%;display:grid;place-items:center;background:#1268f4;color:#fff}.car-label{position:absolute;left:14px;top:16px;border-radius:5px;color:#fff;padding:4px 10px;font-size:13px;font-weight:900}.car-label.green{background:#68c579}.car-label.purple{background:#7d6af2}.recommend{position:absolute;left:86px;top:16px;border-radius:5px;background:#2f75ff;color:#fff;padding:4px 10px;font-size:13px;font-weight:900}.result-card img{width:270px;height:105px;object-fit:cover;object-position:center;border-radius:5px;mix-blend-mode:multiply}.car-info h2{margin:0 0 12px;font-size:23px;line-height:1}.specs{display:flex;gap:24px;color:#1e3555;font-size:14px}.specs span{display:flex;align-items:center;gap:7px}.car-info p{display:flex;align-items:center;gap:8px;margin:12px 0 10px;color:#ff7a00}.car-info p b{color:#ff7a00}.car-info p em{font-style:normal;color:#243955}.service-tags{display:flex;gap:10px}.service-tags span{border-radius:6px;background:#f0f4fa;color:#5c6a80;padding:6px 13px;font-size:13px}.price-box{text-align:center}.price-box small{display:block;color:#748096}.price-box strong{color:#ff6b00;font-size:30px;font-weight:900}.price-box>span{color:#243955}.price-box button{display:block;width:122px;height:36px;margin:9px auto 8px;border:0;border-radius:6px;background:#1268f4;color:#fff;font-weight:900}.price-box a{color:#1268f4;font-size:13px;font-weight:800}.result-note{display:flex;align-items:center;gap:8px;margin:18px 0 0 330px;color:#748096}.result-note .el-icon{color:#1268f4}.results-side{display:grid;gap:14px;align-content:start}.map-card{height:210px;overflow:hidden;border-radius:12px 12px 0 0;background:#eaf5ff}.route-map{position:relative;height:100%;background:linear-gradient(90deg,rgba(82,154,233,.08) 1px,transparent 1px),linear-gradient(rgba(82,154,233,.08) 1px,transparent 1px),radial-gradient(circle at 78% 28%,#cce7ff,transparent 24%),radial-gradient(circle at 28% 78%,#d7f0df,transparent 24%);background-size:28px 28px,28px 28px,auto,auto}.route-map b{position:absolute;border-radius:18px;background:#fff;color:#10213b;padding:9px 14px;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(24,64,113,.12)}.route-map .start{left:68px;top:28px}.route-map .end{right:30px;bottom:30px}.route-map i{position:absolute;left:125px;top:72px;width:140px;height:74px;border-right:6px dotted #2f75ff;border-bottom:6px dotted #2f75ff;border-radius:0 0 50px 0;transform:rotate(7deg)}.side-card{padding:20px;border:1px solid #dce6f2;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(25,68,128,.06)}.map-card+.side-card{margin-top:-14px;border-radius:0 0 12px 12px}.side-card h3{margin:0 0 18px;font-size:20px}.overview p{display:flex;justify-content:space-between;margin:14px 0;color:#6c7b91}.overview p b{text-align:right;color:#10213b}.timeline{padding-bottom:8px}.timeline p{display:grid;grid-template-columns:18px 50px 1fr;gap:8px;align-items:start;margin:0 0 14px}.timeline i{width:10px;height:10px;margin-top:4px;border-radius:50%;border:2px solid #42628c}.include-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 22px}.include-grid article{display:grid;grid-template-columns:42px 1fr;gap:3px 10px}.include-grid .el-icon{grid-row:span 2;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#eff5ff;color:#1268f4;font-size:23px}.include-grid b{font-size:15px}.include-grid span{color:#6c7b91;font-size:13px}.include footer{display:flex;align-items:center;gap:8px;margin:18px -20px -20px;padding:14px 20px;border-top:1px solid #e2e9f3;color:#63728a}.include footer .el-icon{color:#1268f4}
.detail-main{width:min(1500px,calc(100vw - 72px));margin:0 auto;padding:16px 0 36px}.back-link{height:32px;border:0;background:transparent;color:#172d4d;font-size:15px;cursor:pointer}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:10px}.detail-left{display:grid;gap:12px}.vehicle-hero-card{position:relative;min-height:280px;display:grid;grid-template-columns:390px minmax(0,1fr);overflow:hidden;border:1px solid #dce6f2;border-radius:10px;background:linear-gradient(90deg,#fff 0 32%,#eef7ff 58%,#dff0ff)}.favorite{position:absolute;right:22px;top:20px;z-index:3;height:36px;border:0;border-radius:18px;background:#fff;color:#10213b;font-weight:900;padding:0 16px;box-shadow:0 8px 18px rgba(24,64,113,.1)}.vehicle-copy{position:relative;z-index:2;padding:28px 28px}.vehicle-copy>span{display:inline-flex;border-radius:5px;background:#dff8e8;color:#19a25b;padding:4px 10px;font-size:13px;font-weight:900}.vehicle-copy h1{margin:12px 0 8px;color:#081c3d;font-size:37px;line-height:1.08}.vehicle-copy p{margin:0 0 16px;color:#415270;font-size:16px}.rating{display:flex;align-items:center;gap:9px;color:#ff7a00;font-size:16px}.rating em{color:#10213b;font-style:normal;font-weight:900;margin-left:16px}.vehicle-specs{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px;color:#10213b}.vehicle-specs span{display:flex;align-items:center;gap:9px}.vehicle-stage{position:relative}.vehicle-stage .city-bg{position:absolute;inset:0;background:linear-gradient(90deg,transparent,#8fbfe6 12% 16%,transparent 17% 25%,#75aee0 26% 31%,transparent 32% 42%,#5799d4 43% 48%,transparent 49%);opacity:.26}.vehicle-stage img{position:absolute;right:50px;bottom:14px;width:520px;height:240px;object-fit:cover;mix-blend-mode:multiply;filter:drop-shadow(0 24px 20px rgba(24,64,113,.2))}.thumb-row{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.thumb-row button{height:72px;border:1px solid #dce6f2;border-radius:8px;background:#f8fbff;overflow:hidden;cursor:pointer}.thumb-row .active{border:2px solid #1268f4}.thumb-row img{width:100%;height:100%;object-fit:cover}.thumb-row .more{position:relative;background:#2b3445;color:#fff;font-size:25px;font-weight:900}.feature-strip{height:58px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #dce6f2;border-radius:9px;background:#fff}.feature-strip article{display:grid;grid-template-columns:42px 1fr;gap:2px 10px;align-items:center;padding:0 26px}.feature-strip i{grid-row:span 2;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#eff5ff;color:#1268f4;font-style:normal;font-weight:900}.feature-strip b{font-size:15px}.feature-strip span{color:#6c7b91}.plan-section h2{margin:0 0 10px;font-size:19px}.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.plan-grid article{min-height:128px;border:1px solid #dce6f2;border-radius:9px;background:#fff;padding:18px 22px}.plan-grid .picked{border:2px solid #1268f4;padding:17px 21px}.plan-grid h3{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:16px}.plan-grid em{border-radius:999px;background:#dff8e8;color:#19a25b;font-size:12px;font-style:normal;padding:3px 8px}.plan-grid strong{margin-left:auto;color:#1268f4}.plan-grid p{margin:6px 0;color:#31435d;font-size:13px}.plan-grid a{display:inline-block;margin-top:8px;color:#1268f4;font-size:13px;font-weight:900}.detail-info-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:10px}.fee-include,.tips-box,.store-card,.days-card{border:1px solid #dce6f2;border-radius:9px;background:#fff;padding:16px 20px}.fee-include h3,.tips-box h3,.store-card h3{margin:0 0 12px;font-size:17px}.fee-include div{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.fee-include span{display:flex;align-items:center;gap:8px;color:#243955}.tips-box ul{margin:0;padding-left:18px;color:#31435d;line-height:1.6}.store-card{min-height:100px}.store-card h3{display:flex;justify-content:space-between}.store-card a{color:#1268f4;font-size:14px}.store-card p{margin:0 0 10px;color:#6c7b91;line-height:1.5}.store-card b{color:#10213b}.store-card strong{display:flex;align-items:center;gap:8px;font-size:17px}.days-card{display:grid;place-items:center;text-align:center}.days-card span{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;border:1px solid #cfe0ff;color:#1268f4;font-size:28px}.days-card b{font-size:18px}.bottom-guarantees{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #dce6f2;border-radius:9px;background:#fff}.bottom-guarantees article{display:grid;grid-template-columns:40px 1fr;gap:2px 10px;padding:12px 20px;border-right:1px solid #e2e9f3}.bottom-guarantees article:last-child{border-right:0}.bottom-guarantees .el-icon{grid-row:span 2;color:#1268f4;font-size:23px}.bottom-guarantees b{font-size:15px}.bottom-guarantees span{color:#6c7b91;font-size:13px}.order-aside{align-self:start;position:sticky;top:90px}.order-card{border:1px solid #dce6f2;border-radius:10px;background:#fff;padding:22px;box-shadow:0 18px 44px rgba(24,64,113,.08)}.order-card header{display:flex;justify-content:space-between;align-items:center}.order-card h2{margin:0;font-size:22px}.order-card a{color:#1268f4;font-weight:900}.order-route{padding:22px 0 14px;border-bottom:1px solid #e2e9f3}.order-route p{display:grid;grid-template-columns:14px 42px 1fr;gap:8px;margin:0 0 18px}.order-route i{width:10px;height:10px;margin-top:5px;border-radius:50%;background:#1268f4}.order-route p:last-child i{background:#b9c4d3}.order-route span{color:#31435d}.order-route b{line-height:1.55}.order-route em{font-style:normal;color:#31435d;font-weight:500}.order-meta,.cost-detail,.compare-box{padding:14px 0;border-bottom:1px solid #e2e9f3}.order-meta p,.cost-detail p,.compare-box p{display:flex;justify-content:space-between;margin:10px 0;color:#31435d}.order-meta b,.cost-detail b,.compare-box b{color:#10213b}.cost-detail h3,.compare-box h3{margin:0 0 10px;font-size:17px}.cost-detail small,.compare-box small{color:#6c7b91;font-weight:500}.compare-box p{height:30px;align-items:center;padding:0 10px;border-radius:5px}.compare-box .best{background:#f8fbff;border:1px solid #e2e9f3}.compare-box em{margin-left:8px;border-radius:5px;background:#3778ff;color:#fff;font-style:normal;font-size:12px;padding:2px 7px}.compare-box .best b{color:#ff6b00}.total-box{text-align:right;padding:16px 0}.total-box span,.total-box small{display:block;color:#6c7b91}.total-box strong{display:block;color:#ff6b00;font-size:40px;line-height:1}.book-now,.compare-now{width:100%;height:44px;border-radius:7px;font-size:17px;font-weight:900;cursor:pointer}.book-now{border:0;background:#1268f4;color:#fff}.compare-now{margin-top:12px;border:1px solid #1268f4;background:#fff;color:#1268f4}.order-card footer{display:flex;justify-content:center;gap:8px;margin-top:18px;color:#10b981;font-weight:900}
.field input,.field select{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#10213b;font:inherit;font-weight:800}.field input:disabled{color:#8b98aa}.field input[type=date],.field input[type=time]{font-size:14px}.plan-grid article{cursor:pointer}.book-now:disabled,.search-btn:disabled{opacity:.72;cursor:not-allowed}.contact-panel{padding:14px 0;border-bottom:1px solid #e2e9f3}.contact-panel h3{margin:0 0 10px;font-size:17px}.contact-panel label{display:grid;gap:5px;margin:8px 0}.contact-panel span{color:#6c7b91;font-size:13px}.contact-panel input{height:34px;border:1px solid #dce6f2;border-radius:6px;padding:0 10px;color:#10213b;outline:0}.order-detail-page{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:24px}.order-success-card{min-height:360px;display:grid;place-items:center;text-align:center;border:1px solid #dce6f2;border-radius:10px;background:#fff;box-shadow:0 18px 44px rgba(24,64,113,.08);padding:40px}.order-success-card span{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:#eafbf2;color:#10b981;font-size:38px}.order-success-card h1{margin:14px 0 6px;font-size:34px}.order-success-card p{margin:0;color:#64748b}.order-success-card strong{color:#1268f4}.order-detail-card{position:sticky;top:90px}.price-box a{cursor:pointer}.inline-fee-detail{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:8px 28px;margin-top:2px;padding:14px 18px;border-top:1px solid #e5edf7;background:#f8fbff;border-radius:0 0 8px 8px}.inline-fee-detail p,.inline-fee-detail strong{display:flex;justify-content:space-between;gap:14px;margin:0;color:#64748b;font-size:13px}.inline-fee-detail b{color:#10213b}.inline-fee-detail strong{color:#10213b}.inline-fee-detail strong b{color:#ff6b00;font-size:16px}.inline-fee-detail em{grid-column:1/-1;color:#7b8aa3;font-size:12px;font-style:normal}
.search-card{padding:22px 28px 28px;border-color:rgba(202,216,235,.9);border-radius:18px;background:rgba(255,255,255,.98);box-shadow:0 24px 70px rgba(30,73,126,.14)}.search-head{display:flex;align-items:center;gap:18px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e6edf6}.search-head :deep(.el-segmented){--el-segmented-item-selected-color:#1268f4;--el-segmented-item-selected-bg-color:#fff;background:#f2f6fb;border:1px solid #dce6f2;border-radius:10px;padding:4px}.search-head :deep(.el-segmented__item){min-width:104px;font-weight:800}.modern-search-form{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));grid-template-areas:"city city city city oneway oneway oneway pickup pickup pickup pickup pickup pickup pickup pickup return return return return return return return return return" "pdate pdate pdate ptime ptime ptime rdate rdate rdate rtime rtime rtime people people people vehicle vehicle vehicle button button button button button button";gap:18px 18px;align-items:end}.modern-search-form :deep(.el-form-item){margin:0;min-width:0}.modern-search-form :deep(.city-field){grid-area:city}.modern-search-form :deep(.oneway-field){grid-area:oneway}.modern-search-form :deep(.pickup-field){grid-area:pickup}.modern-search-form :deep(.return-field){grid-area:return}.modern-search-form :deep(.pickup-date-field){grid-area:pdate}.modern-search-form :deep(.pickup-time-field){grid-area:ptime}.modern-search-form :deep(.return-date-field){grid-area:rdate}.modern-search-form :deep(.return-time-field){grid-area:rtime}.modern-search-form :deep(.people-field){grid-area:people}.modern-search-form :deep(.vehicle-field){grid-area:vehicle}.modern-search-form>.search-btn{grid-area:button;height:52px;border:0;border-radius:10px;background:linear-gradient(135deg,#1268f4,#0f7dff);font-size:18px;font-weight:900;box-shadow:0 18px 32px rgba(18,104,244,.24)}.modern-search-form :deep(.el-form-item__label){margin-bottom:8px;color:#66758d;font-size:13px;font-weight:700;line-height:1}.modern-search-form :deep(.el-input),.modern-search-form :deep(.el-select),.modern-search-form :deep(.el-date-editor){width:100%}.modern-search-form :deep(.el-input__wrapper),.modern-search-form :deep(.el-select__wrapper){min-height:52px;border-radius:10px;box-shadow:0 0 0 1px #dce6f2 inset;background:#fff}.modern-search-form :deep(.el-input__wrapper:hover),.modern-search-form :deep(.el-select__wrapper:hover){box-shadow:0 0 0 1px #9fc1ff inset}.modern-search-form :deep(.is-focus .el-input__wrapper),.modern-search-form :deep(.is-focused.el-select__wrapper){box-shadow:0 0 0 2px rgba(18,104,244,.24) inset}.modern-search-form :deep(.el-input__inner),.modern-search-form :deep(.el-select__placeholder),.modern-search-form :deep(.el-select__selected-item){color:#10213b;font-weight:500}.modern-search-form :deep(.el-input__suffix){color:#7b8798;font-size:13px}.modern-search-form :deep(.el-checkbox){height:52px;display:flex;align-items:center;padding:0 14px;border:1px solid #dce6f2;border-radius:10px;background:#f8fbff}.modern-search-form :deep(.el-checkbox__label){color:#172d4d;font-weight:700}.locate-city{width:100%;height:34px;border:0;background:#f5f8fc;color:#1268f4;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}.store-option{display:flex;flex-direction:column;justify-content:center;min-height:52px;line-height:1.35}.store-option b{color:#10213b;font-size:14px}.store-option span{margin-top:4px;color:#7b8798;font-size:12px}
:global(.store-select-popper .el-select-dropdown__item){height:auto;min-height:58px;padding:7px 18px;line-height:1.35}:global(.store-select-popper .el-select-dropdown__item.is-hovering){background:#f5f8fc}:global(.store-select-popper .el-select-dropdown__item.selected){font-weight:500}
.modern-search-form :deep(.el-form-item){height:76px;display:flex;flex-direction:column;justify-content:flex-start}.modern-search-form :deep(.el-form-item__label){height:16px;margin:0 0 8px;line-height:16px}.modern-search-form :deep(.el-form-item__content){height:52px;flex:0 0 52px;line-height:52px}.modern-search-form :deep(.el-input),.modern-search-form :deep(.el-select),.modern-search-form :deep(.el-date-editor){height:52px}.modern-search-form :deep(.el-input__wrapper),.modern-search-form :deep(.el-select__wrapper){height:52px;min-height:52px}.modern-search-form>.search-btn{align-self:end}
.modern-search-form{display:flex;flex-wrap:wrap;align-items:flex-start;gap:18px 22px}.modern-search-form :deep(.city-field){width:160px}.modern-search-form :deep(.oneway-field){width:120px}.modern-search-form :deep(.pickup-field),.modern-search-form :deep(.return-field){width:360px}.modern-search-form :deep(.pickup-date-field),.modern-search-form :deep(.return-date-field){width:150px}.modern-search-form :deep(.pickup-time-field),.modern-search-form :deep(.return-time-field){width:120px}.modern-search-form :deep(.people-field){width:110px}.modern-search-form :deep(.vehicle-field){width:140px}.modern-search-form>.search-btn{width:220px;margin-top:24px}.form-row-break{flex-basis:100%;height:0}
@media(max-width:1180px){.home-hero{height:auto}.home-hero-inner,.results-layout,.order-detail-page{grid-template-columns:1fr}.home-hero-inner{padding-bottom:82px}.hero-art{display:none}.home-main,.home-hero-inner,.results-main{width:calc(100vw - 40px)}.benefit-row,.car-grid{grid-template-columns:1fr 1fr}.modern-search-form :deep(.pickup-field),.modern-search-form :deep(.return-field){width:calc(50% - 11px)}.summary-bar{height:auto;grid-template-columns:1fr 1fr;padding:18px}.summary-bar article{border-right:0}.results-side{grid-template-columns:1fr 1fr}.map-card{grid-column:1/-1}.map-card+.side-card{margin-top:0;border-radius:12px}.order-detail-card{position:static}}@media(max-width:760px){.hero-copy h1{font-size:36px}.hero-promises,.benefit-row,.car-grid,.why-flow,.summary-bar,.results-side,.inline-fee-detail{grid-template-columns:1fr}.search-card{padding:16px}.search-head{align-items:stretch;flex-direction:column}.search-head :deep(.el-segmented){width:100%}.modern-search-form :deep(.el-form-item),.modern-search-form :deep(.pickup-field),.modern-search-form :deep(.return-field),.modern-search-form>.search-btn{width:100%;margin-top:0}.form-row-break{display:none}.home-car,.result-card{grid-template-columns:1fr;height:auto}.result-card{padding:20px}.result-card.selected{padding:19px}.result-card img{width:100%;height:150px}.price-box{text-align:left}.price-box button{margin-left:0}.sort-row,.category-tabs{flex-wrap:wrap}.result-note{margin-left:0}}

/* Final rental-page layout overrides: keep the newer Element Plus form from being
   overridden by the older static form styles that still live above. */
.rental-page .home-hero-inner,
.rental-page .home-main,
.rental-page .results-main,
.rental-page .detail-main {
  width: min(1440px, calc(100vw - 64px));
}

.rental-page .modern-search-form {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  grid-template-areas:
    "city city city city city returncity returncity returncity returncity returncity oneway oneway oneway pickup pickup pickup pickup pickup return return return return return return"
    "pdate pdate pdate pdate ptime ptime ptime rdate rdate rdate rdate rtime rtime rtime people people people vehicle vehicle vehicle button button button button";
  gap: 18px 16px;
  align-items: start;
}

.rental-page .modern-search-form :deep(.el-form-item) {
  width: auto;
  height: auto;
  min-width: 0;
  margin: 0;
}

.rental-page .modern-search-form :deep(.city-field),
.rental-page .modern-search-form :deep(.oneway-field),
.rental-page .modern-search-form :deep(.return-city-field),
.rental-page .modern-search-form :deep(.pickup-field),
.rental-page .modern-search-form :deep(.return-field),
.rental-page .modern-search-form :deep(.pickup-date-field),
.rental-page .modern-search-form :deep(.pickup-time-field),
.rental-page .modern-search-form :deep(.return-date-field),
.rental-page .modern-search-form :deep(.return-time-field),
.rental-page .modern-search-form :deep(.people-field),
.rental-page .modern-search-form :deep(.vehicle-field) {
  width: auto;
}

.rental-page .modern-search-form :deep(.city-field) {
  grid-area: city;
}

.rental-page .modern-search-form :deep(.oneway-field) {
  grid-area: oneway;
}

.rental-page .modern-search-form :deep(.pickup-field) {
  grid-area: pickup;
}

.rental-page .modern-search-form :deep(.return-field) {
  grid-area: return;
}

.rental-page .modern-search-form :deep(.return-city-field) {
  grid-area: returncity;
}

.rental-page .modern-search-form :deep(.pickup-date-field) {
  grid-area: pdate;
}

.rental-page .modern-search-form :deep(.pickup-time-field) {
  grid-area: ptime;
}

.rental-page .modern-search-form :deep(.return-date-field) {
  grid-area: rdate;
}

.rental-page .modern-search-form :deep(.return-time-field) {
  grid-area: rtime;
}

.rental-page .modern-search-form :deep(.people-field) {
  grid-area: people;
}

.rental-page .modern-search-form :deep(.vehicle-field) {
  grid-area: vehicle;
}

.rental-page .form-row-break {
  display: none;
}

.rental-page .modern-search-form > .search-btn {
  grid-area: button;
  width: 100%;
  height: 52px;
  margin-top: 24px;
  align-self: start;
}

.rental-page .modern-search-form :deep(.el-input-number) {
  width: 100%;
  height: 52px;
}

.rental-page .modern-search-form :deep(.el-cascader) {
  width: 100%;
  height: 52px;
}

.rental-page .modern-search-form :deep(.el-cascader .el-input) {
  height: 52px;
}

.rental-page .modern-search-form :deep(.el-input-number .el-input__wrapper) {
  height: 52px;
}

.rental-page .modern-search-form :deep(.el-date-editor .el-input__inner) {
  font-size: 13px;
}

.rental-page .modern-search-form :deep(.el-form-item__error) {
  padding-top: 4px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.field-label-row button,
.select-footer-action {
  border: 0;
  background: transparent;
  color: #1268f4;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  padding: 0;
}

.field-label-row button:disabled,
.select-footer-action:disabled {
  color: #9aa8bb;
  cursor: not-allowed;
}

.select-footer-action {
  width: 100%;
  height: 34px;
  justify-content: center;
  background: #f5f8fc;
}

.store-option em {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 11px;
  font-style: normal;
}

.store-empty {
  padding: 14px 16px;
  color: #7b8798;
  font-size: 13px;
  text-align: center;
}

.vehicle-option {
  height: 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  line-height: 1.2;
}

.vehicle-option b {
  color: #10213b;
  font-size: 14px;
}

.vehicle-option span {
  color: #7b8798;
  font-size: 12px;
}

:global(.vehicle-select-popper .el-select-dropdown__item) {
  height: 58px;
  padding: 4px 18px;
  line-height: 1.2;
}

:global(.vehicle-select-popper .el-select-dropdown__item.is-hovering) {
  background: #f5f8fc;
}

.locate-city:disabled {
  cursor: wait;
  opacity: .7;
}

.rental-page .summary-bar {
  height: auto;
  min-height: 96px;
  grid-template-columns: repeat(6, minmax(0, 1fr)) 152px;
  gap: 14px;
}

.rental-page .summary-bar article {
  min-width: 0;
}

.rental-page .summary-bar b,
.rental-page .route-map b,
.rental-page .order-route b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rental-page .result-card {
  grid-template-columns: 280px minmax(0, 1fr) 156px;
}

.rental-page .cars-section {
  margin-top: 24px;
  margin-bottom: 0;
}

.rental-page .car-grid {
  align-items: stretch;
}

.rental-page .home-car {
  height: auto;
  min-height: 282px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}

.rental-page .home-car:hover,
.rental-page .home-car:focus-visible {
  border-color: #93b7ee;
  box-shadow: 0 18px 42px rgba(24, 64, 113, .12);
  transform: translateY(-2px);
  outline: none;
}

.rental-page .home-car img {
  width: 100%;
  height: 138px;
  object-fit: contain;
  object-position: center;
  mix-blend-mode: normal;
  filter: drop-shadow(0 14px 16px rgba(24, 64, 113, .12));
  background: linear-gradient(180deg, #f7fbff, #eef5fb);
}

.rental-page .home-car h3 {
  margin: 0;
  font-size: 21px;
  line-height: 1.2;
  word-break: keep-all;
}

.rental-page .home-car p {
  min-height: 28px;
  margin: 8px 0;
}

.rental-page .home-car small {
  min-height: 42px;
  line-height: 1.45;
  overflow-wrap: break-word;
}

.rental-page .home-car strong {
  display: flex;
  align-items: baseline;
  gap: 5px;
  line-height: 1.1;
  margin-top: auto;
}

.rental-page .home-car strong em {
  white-space: nowrap;
}

.rental-page .why-section {
  clear: both;
  margin-top: 10px;
}

.rental-page .why-flow i {
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 27px;
}

.rental-page .why-flow i .el-icon {
  font-size: 27px;
}

.rental-page .inline-fee-detail {
  grid-column: 1 / -1;
}

.rental-page .detail-layout {
  grid-template-columns: minmax(0, 1fr) 360px;
}

.rental-page .vehicle-stage {
  min-width: 0;
  overflow: hidden;
}

.rental-page .vehicle-stage img {
  max-width: calc(100% - 28px);
}

@media (max-width: 1180px) {
  .rental-page .home-hero-inner,
  .rental-page .home-main,
  .rental-page .results-main,
  .rental-page .detail-main {
    width: calc(100vw - 40px);
  }

  .rental-page .modern-search-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      "city oneway"
      "returncity returncity"
      "pickup pickup"
      "return return"
      "pdate ptime"
      "rdate rtime"
      "people vehicle"
      "button button";
  }

  .rental-page .results-layout,
  .rental-page .detail-layout,
  .rental-page .order-detail-page {
    grid-template-columns: 1fr;
  }

  .rental-page .summary-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .rental-page .home-hero-inner,
  .rental-page .home-main,
  .rental-page .results-main,
  .rental-page .detail-main {
    width: calc(100vw - 24px);
  }

  .rental-page .modern-search-form,
  .rental-page .summary-bar,
  .rental-page .result-card,
  .rental-page .home-car,
  .rental-page .detail-info-grid,
  .rental-page .bottom-guarantees,
  .rental-page .feature-strip,
  .rental-page .plan-grid {
    grid-template-columns: 1fr;
  }

  .rental-page .modern-search-form {
    grid-template-areas:
      "city"
      "oneway"
      "returncity"
      "pickup"
      "return"
      "pdate"
      "ptime"
      "rdate"
      "rtime"
      "people"
      "vehicle"
      "button";
  }

  .rental-page .summary-bar article {
    border-right: 0;
    padding-right: 0;
  }

  .rental-page .home-car img {
    width: 100%;
    height: 150px;
  }

  .rental-page .vehicle-hero-card {
    grid-template-columns: 1fr;
  }

  .rental-page .vehicle-stage {
    min-height: 180px;
  }

  .rental-page .vehicle-stage img {
    right: 16px;
    width: calc(100% - 32px);
    height: 170px;
  }
}

/* Rental landing final visual pass: match the provided banner-led layout. */
.rental-page {
  background:
    linear-gradient(180deg, #f4f9ff 0%, #f7fbff 46%, #ffffff 100%);
}

.rental-page .home-hero {
  height: 376px;
  overflow: visible;
  background:
    linear-gradient(90deg, rgba(244, 250, 255, .96) 0%, rgba(244, 250, 255, .88) 27%, rgba(244, 250, 255, .16) 48%, rgba(244, 250, 255, 0) 100%),
    url('https://ai-education-1428653062.cos.ap-shanghai.myqcloud.com/car_rental/index/rental-hero-road-wide.png') center -116px / cover no-repeat;
}

.rental-page .home-hero::before,
.rental-page .home-hero::after {
  content: none;
}

.rental-page .home-hero-inner {
  grid-template-columns: minmax(520px, 620px) minmax(0, 1fr);
  width: min(1540px, calc(100vw - 160px));
}

.rental-page .hero-copy {
  padding-top: 52px;
}

.rental-page .hero-copy h1 {
  color: #0a2348;
  font-size: 48px;
  letter-spacing: 0;
}

.rental-page .hero-copy p {
  margin-top: 10px;
  margin-bottom: 28px;
  color: #41526f;
  font-size: 18px;
}

.rental-page .hero-promises {
  width: 680px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 30px;
}

.rental-page .hero-promises article {
  height: 58px;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 3px 12px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.rental-page .hero-promises .el-icon {
  width: 38px;
  height: 38px;
  background: rgba(236, 246, 255, .95);
  box-shadow: 0 10px 24px rgba(35, 111, 224, .12);
}

.rental-page .hero-promises b {
  color: #12264a;
  font-size: 15px;
}

.rental-page .hero-promises span {
  color: #687890;
  font-size: 12px;
}

.rental-page .hero-art {
  position: relative;
}

.rental-page .hero-art > img,
.rental-page .hero-art .plane,
.rental-page .hero-art .skyline {
  display: none;
}

.rental-page .hero-price-card {
  position: absolute;
  right: 22px;
  top: 122px;
  width: 132px;
  height: 112px;
  padding: 16px 18px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(16, 50, 86, .88), rgba(44, 92, 134, .72));
  color: #fff;
  box-shadow: 0 16px 36px rgba(15, 42, 76, .22);
  backdrop-filter: blur(10px);
}

.rental-page .hero-price-card span,
.rental-page .hero-price-card b {
  display: block;
  font-size: 13px;
  line-height: 1.5;
}

.rental-page .hero-price-card strong {
  display: block;
  margin-top: 2px;
  color: #ff7a00;
  font-size: 30px;
  line-height: 1;
}

.rental-page .hero-price-card em {
  color: #fff;
  font-size: 13px;
  font-style: normal;
}

.rental-page .home-main {
  width: min(1540px, calc(100vw - 160px));
  margin-top: -136px;
}

.rental-page .search-card {
  padding: 20px 44px 38px;
  border: 1px solid rgba(221, 230, 242, .88);
  border-radius: 16px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 18px 50px rgba(30, 73, 126, .13);
}

.rental-page .search-head {
  margin-bottom: 22px;
  padding-bottom: 0;
  border-bottom: 0;
}

.rental-page .rental-tabs {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 3px;
  border: 1px solid #dbe7f6;
  border-radius: 8px;
  background: #f5f8fc;
}

.rental-page .rental-tabs button {
  min-width: 104px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #42526d;
  cursor: pointer;
  font-size: 15px;
  font-weight: 800;
}

.rental-page .rental-tabs .active {
  background: #fff;
  color: #1167f2;
  box-shadow: 0 4px 12px rgba(31, 111, 255, .13);
}

.rental-page .rental-tabs .disabled {
  position: relative;
  color: #9ca8ba;
  cursor: not-allowed;
  opacity: .72;
}

.rental-page .rental-tabs .disabled::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background: repeating-linear-gradient(-45deg, rgba(165, 176, 194, .16) 0 6px, rgba(165, 176, 194, .04) 6px 12px);
}

.rental-page .modern-search-form {
  grid-template-columns: repeat(24, minmax(0, 1fr));
  grid-template-areas:
    "city city city city city city returncity returncity returncity returncity returncity returncity pickup pickup pickup pickup pickup pickup return return return return return return"
    "pdate pdate pdate pdate ptime ptime ptime rdate rdate rdate rdate rtime rtime rtime people people vehicle vehicle vehicle vehicle button button button button";
  gap: 18px 20px;
}

.rental-page .modern-search-form :deep(.oneway-field) {
  display: none;
}

.rental-page .modern-search-form :deep(.el-form-item__label) {
  color: #243955;
  font-size: 13px;
  font-weight: 800;
}

.rental-page .modern-search-form :deep(.el-input__wrapper),
.rental-page .modern-search-form :deep(.el-select__wrapper) {
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 0 0 1px #d8e3f1 inset;
}

.rental-page .modern-search-form :deep(.el-cascader .el-input__wrapper) {
  border-radius: 6px;
}

.rental-page .field-label-row button {
  color: #287cff;
}

.rental-page .search-btn {
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 7px;
  background: linear-gradient(135deg, #176dff, #0b73ff);
  color: #fff;
  box-shadow: 0 16px 28px rgba(23, 109, 255, .25);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}

.rental-page .search-btn .el-icon,
.rental-page .search-btn svg {
  transform: none !important;
  animation: none !important;
}

.rental-page .search-btn:disabled {
  cursor: wait;
  opacity: .78;
}

.rental-page .benefit-row {
  height: 68px;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
  margin: 8px 0 24px;
  overflow: hidden;
  border: 1px solid rgba(226, 234, 245, .88);
  border-radius: 8px;
  background: rgba(255, 255, 255, .86);
  box-shadow: 0 12px 36px rgba(30, 73, 126, .08);
}

.rental-page .benefit-row article {
  height: 68px;
  border: 0;
  border-right: 1px solid #dbe5f1;
  border-radius: 0;
  background: transparent;
  justify-content: center;
}

.rental-page .benefit-row article:last-child {
  border-right: 0;
}

.rental-page .benefit-row .el-icon {
  width: 38px;
  height: 38px;
  background: #eef6ff;
  box-shadow: 0 9px 22px rgba(35, 111, 224, .1);
}

.rental-page .section-title-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
}

.rental-page .section-title-line > div {
  display: flex;
  align-items: baseline;
  gap: 26px;
}

.rental-page .section-title-line h2 {
  position: relative;
  margin: 0;
  color: #10213b;
  font-size: 34px;
  line-height: 1.1;
}

.rental-page .section-title-line span {
  color: #71829b;
  font-size: 18px;
  font-weight: 500;
}

.rental-page .section-title-line h2::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -18px;
  width: 58px;
  height: 5px;
  border-radius: 999px;
  background: #1f72ff;
}

.rental-page .section-title-line button {
  height: 48px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 28px;
  border: 1px solid #2f75ff;
  border-radius: 999px;
  background: rgba(255, 255, 255, .72);
  color: #2f75ff;
  cursor: pointer;
  font-size: 17px;
  font-weight: 800;
}

.rental-page .car-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.rental-page .home-car {
  position: relative;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px 14px 0;
  border: 1px solid #e2ebf7;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(32, 66, 111, .11);
}

.rental-page .favorite-lite {
  position: absolute;
  right: 20px;
  top: 20px;
  z-index: 2;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .9);
  color: #71809a;
  cursor: pointer;
  font-size: 29px;
  line-height: 1;
  box-shadow: 0 8px 20px rgba(42, 72, 112, .1);
}

.rental-page .car-cover {
  height: 210px;
  overflow: hidden;
  border-radius: 14px;
  background:
    radial-gradient(circle at 50% 95%, rgba(170, 190, 216, .28), transparent 36%),
    linear-gradient(160deg, #edf5ff 0%, #f9fcff 48%, #e9f2fb 100%);
}

.rental-page .home-car img {
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: cover;
  object-position: center;
  background: transparent;
}

.rental-page .home-car-body {
  padding: 18px 12px 16px;
}

.rental-page .home-car h3 {
  color: #172b4d;
  font-size: 24px;
  line-height: 1.18;
}

.rental-page .home-car p {
  display: flex;
  gap: 12px;
  margin: 14px 0 14px;
}

.rental-page .home-car p span {
  min-width: 56px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 11px;
  border-radius: 6px;
  background: #eef3fa;
  color: #4f7fc4;
  font-size: 15px;
  font-weight: 700;
}

.rental-page .home-car small {
  display: block;
  min-height: 26px;
  color: #64748b;
  font-size: 16px;
  line-height: 1.5;
}

.rental-page .home-car-footer {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: auto -14px 0;
  padding: 0 28px;
  border-top: 1px solid #edf2f8;
  background: linear-gradient(180deg, #fff, #fbfdff);
}

.rental-page .home-car strong {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  margin: 0;
  color: #ff6b00;
  font-size: 28px;
  line-height: 1;
}

.rental-page .home-car strong em {
  color: #627089;
  font-size: 15px;
  font-style: normal;
  font-weight: 700;
}

.rental-page .home-car .book-now {
  width: 116px;
  min-width: 116px;
  flex: 0 0 116px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #2878ff, #1168ef);
  color: #fff;
  cursor: pointer;
  font-size: 17px;
  font-weight: 800;
  box-shadow: 0 12px 24px rgba(32, 111, 255, .24);
}

.rental-page .why-section {
  margin-top: 20px;
  padding-bottom: 36px;
}

.rental-page .why-section::before {
  content: none;
}

.rental-page .results-main {
  width: min(1800px, calc(100vw - 104px));
  padding: 30px 0 42px;
}

.rental-page .summary-bar {
  min-height: 90px;
  border-color: #dce8f8;
  border-radius: 14px;
  box-shadow: 0 14px 38px rgba(23, 68, 126, .08);
}

.rental-page .summary-bar span {
  color: #71829b;
  font-size: 13px;
}

.rental-page .summary-bar b {
  max-height: 40px;
  align-items: center;
  color: #162946;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.rental-page .summary-bar article:first-child b,
.rental-page .summary-bar article:nth-child(2) b {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.rental-page .summary-bar button {
  border-radius: 10px;
  background: #fff;
  transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
}

.rental-page .summary-bar button:hover {
  background: #f4f8ff;
  box-shadow: 0 10px 24px rgba(31, 111, 255, .12);
  transform: translateY(-1px);
}

.rental-page .category-tabs {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  margin-bottom: 14px;
  border: 1px solid #dce7f5;
  border-radius: 14px;
  background: rgba(255, 255, 255, .82);
  box-shadow: 0 10px 28px rgba(31, 76, 130, .06);
}

.rental-page .category-tabs button {
  width: auto;
  min-width: 92px;
  height: 42px;
  padding: 0 20px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #42536e;
  font-size: 14px;
  font-weight: 700;
  transition: background .18s ease, color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.rental-page .category-tabs button:hover {
  background: #eef5ff;
  color: #176dff;
}

.rental-page .category-tabs .active {
  background: linear-gradient(135deg, #176dff, #0d78ff);
  color: #fff;
  box-shadow: 0 10px 22px rgba(23, 109, 255, .22);
}

.rental-page .sort-row {
  min-height: 44px;
  gap: 10px;
  margin-bottom: 16px;
}

.rental-page .sort-row button,
.rental-page .more-filter {
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 18px;
  border: 1px solid #d8e4f3;
  border-radius: 10px;
  background: rgba(255, 255, 255, .9);
  color: #243955;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(31, 76, 130, .04);
  transition: background .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease;
}

.rental-page .sort-row button:hover,
.rental-page .more-filter:hover {
  border-color: #a8c8ff;
  color: #176dff;
  background: #f6f9ff;
}

.rental-page .sort-row .active {
  border-color: #7fb0ff;
  background: #edf5ff;
  color: #176dff;
  box-shadow: 0 10px 22px rgba(23, 109, 255, .1);
}

.rental-page .sort-row .el-icon {
  font-size: 15px;
}

.rental-page .sort-row > span {
  align-self: center;
  color: #5f708a;
  font-size: 14px;
}

.rental-page .result-list {
  gap: 10px;
}

.rental-page .result-card {
  min-height: 214px;
  border-color: #dfe8f5;
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(29, 70, 122, .05);
}

.rental-page .result-card.selected {
  border-color: #2d74ff;
  box-shadow: 0 14px 34px rgba(31, 111, 255, .12);
}

.rental-page .choose-dot {
  display: none;
}

.rental-page .result-car-media {
  position: relative;
  width: 286px;
  height: 158px;
  overflow: hidden;
  border-radius: 6px;
  background: linear-gradient(145deg, #dcecff 0%, #f7fbff 52%, #e8f1fb 100%);
}

.rental-page .result-car-media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  border-radius: 6px;
  mix-blend-mode: normal;
}

.rental-page .media-badges {
  position: absolute;
  left: 12px;
  top: 10px;
  z-index: 2;
  display: inline-flex;
  gap: 6px;
}

.rental-page .media-badges span {
  height: 27px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border-radius: 5px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  box-shadow: 0 8px 16px rgba(27, 85, 150, .14);
  backdrop-filter: blur(8px);
}

.rental-page .media-badges .el-icon {
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, .18);
  font-size: 9px;
}

.rental-page .hot-badge {
  background: linear-gradient(135deg, #1977ff 0%, #1168f4 100%);
}

.rental-page .comfort-badge {
  color: #fff;
  background: linear-gradient(135deg, #22bd76 0%, #12a567 100%);
  box-shadow: 0 8px 16px rgba(18, 165, 103, .16);
}

.rental-page .comfort-badge .el-icon {
  color: #fff;
  background: rgba(255, 255, 255, .18);
}

.rental-page .car-info h2 {
  color: #10213b;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 14px;
}

.rental-page .specs {
  gap: 18px;
  color: #334761;
  font-size: 13px;
}

.rental-page .car-info p {
  font-size: 14px;
}

.rental-page .service-tags span {
  color: #60738e;
  font-size: 13px;
}

.rental-page .price-box small {
  color: #7b8aa3;
  font-size: 13px;
}

.rental-page .price-box strong {
  font-size: 32px;
  font-weight: 800;
}

.rental-page .price-box button {
  width: 154px;
  height: 44px;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 700;
}

.rental-page .price-box a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.rental-page .price-box a .el-icon {
  font-size: 12px;
}

.rental-page .results-side {
  gap: 0;
}

.rental-page .map-card {
  height: 280px;
  border: 1px solid #dce6f2;
  border-bottom: 0;
  border-radius: 16px 16px 0 0;
  background: #eaf5ff;
  box-shadow: 0 14px 34px rgba(25, 68, 128, .08);
}

.rental-page .route-map {
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 76% 28%, rgba(93, 158, 255, .18), transparent 26%),
    radial-gradient(circle at 32% 74%, rgba(0, 184, 148, .15), transparent 24%),
    linear-gradient(180deg, #edf7ff, #dff0ff);
}

.rental-page .route-map .map-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(47, 128, 237, .08) 1px, transparent 1px),
    linear-gradient(rgba(47, 128, 237, .08) 1px, transparent 1px);
  background-size: 32px 32px;
}

.rental-page .route-map .route-line {
  position: absolute;
  left: 92px;
  right: 78px;
  top: 104px;
  height: 104px;
  border: 0;
  border-bottom: 5px dotted #2f75ff;
  border-right: 5px dotted #2f75ff;
  border-radius: 0 0 62px 0;
  transform: rotate(7deg);
}

.rental-page .route-map .route-line span {
  position: absolute;
  left: -8px;
  bottom: -9px;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #2f75ff;
  box-shadow: 0 0 0 6px rgba(47, 117, 255, .16);
}

.rental-page .route-map b {
  max-width: 214px;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid rgba(214, 228, 246, .9);
  border-radius: 999px;
  background: rgba(255, 255, 255, .92);
  color: #10213b;
  padding: 0 15px;
  font-size: 13px;
  box-shadow: 0 12px 28px rgba(24, 64, 113, .14);
}

.rental-page .route-map b i {
  position: static;
  margin: 0;
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border-radius: 50%;
  background: #2f75ff;
  border: 0;
  transform: none;
  box-shadow: none;
}

.rental-page .route-map .start {
  left: 74px;
  top: 36px;
}

.rental-page .route-map .end {
  right: 38px;
  bottom: 42px;
}

.rental-page .map-meta {
  position: absolute;
  left: 22px;
  bottom: 20px;
  display: grid;
  gap: 2px;
  padding: 10px 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .82);
  color: #64748b;
  box-shadow: 0 10px 24px rgba(24, 64, 113, .1);
}

.rental-page .map-meta strong {
  color: #0c213e;
  font-size: 18px;
  line-height: 1;
}

.rental-page .map-meta span {
  font-size: 12px;
}

.rental-page .map-card + .side-card {
  margin-top: 0;
  border-radius: 0 0 16px 16px;
}

@media (max-width: 1180px) {
  .rental-page .home-hero-inner,
  .rental-page .home-main {
    width: calc(100vw - 40px);
  }

  .rental-page .hero-promises {
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .rental-page .modern-search-form {
    grid-template-areas:
      "city returncity"
      "pickup pickup"
      "return return"
      "pdate ptime"
      "rdate rtime"
      "people vehicle"
      "button button";
  }
}

@media (max-width: 760px) {
  .rental-page .home-hero {
    height: auto;
    min-height: 430px;
    background-position: 62% top;
  }

  .rental-page .hero-copy h1 {
    font-size: 36px;
  }

  .rental-page .hero-price-card {
    display: none;
  }

  .rental-page .search-card {
    padding: 16px;
  }

  .rental-page .modern-search-form {
    grid-template-areas:
      "city"
      "returncity"
      "pickup"
      "return"
      "pdate"
      "ptime"
      "rdate"
      "rtime"
      "people"
      "vehicle"
      "button";
  }
}
</style>
