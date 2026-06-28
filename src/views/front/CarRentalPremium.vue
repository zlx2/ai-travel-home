<script setup lang="ts">
import { computed, ref } from 'vue'
import { Calendar, Check, Clock, EditPen, Headset, Location, Money, Search, StarFilled, Suitcase, Switch, User, Van } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { rentalApi } from '../../api'

type Mode = 'home' | 'results' | 'detail'
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

const mode = ref<Mode>('home')
const heroCar = '/assets/cars/hero-suv.jpg'
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
  { name: '大众 朗逸', image: '/assets/cars/lavida.jpg', label: '经济型', labelClass: 'green', desc: '经济省油｜适合城市出行', score: '4.8', reviews: 126, model: { brand: '大众', series: '朗逸', seriesFullName: '大众 朗逸', transmission: '自动挡', seats: 5, luggage: 2, energyType: '汽油' }, quote: makeQuote('Q-1-1', 1, 'ECONOMY_SEDAN', '经济型轿车', '大众朗逸或同级', '经济型', '汽油', 168, { vehiclePrepareFeeCent: 0 }) },
  { name: '丰田 凯美瑞', image: '/assets/cars/camry.jpg', label: '舒适型', labelClass: 'green', desc: '舒适稳重｜商务出行优选', score: '4.9', reviews: 215, model: { brand: '丰田', series: '凯美瑞', seriesFullName: '丰田 凯美瑞', transmission: '自动挡', seats: 5, luggage: 3, energyType: '汽油' }, quote: makeQuote('Q-2-2', 2, 'COMFORT_SEDAN', '舒适型轿车', '丰田凯美瑞或同级', '舒适型', '汽油', 268, { vehiclePrepareFeeCent: 0 }) },
  { name: '本田 CR-V', image: '/assets/cars/crv.jpg', label: 'SUV', labelClass: 'purple', desc: '空间宽敞｜家庭出行优选', score: '4.8', reviews: 182, model: { brand: '本田', series: 'CR-V', seriesFullName: '本田 CR-V', transmission: '自动挡', seats: 5, luggage: 3, energyType: '汽油' }, quote: makeQuote('Q-3-3', 3, 'SUV', 'SUV', '本田 CR-V 或同级', 'SUV', '汽油', 358, { vehiclePrepareFeeCent: 0 }) },
  { name: '特斯拉 Model 3', image: '/assets/cars/camry.jpg', label: '新能源', labelClass: 'green', desc: '智能电动｜城市高速都从容', score: '4.9', reviews: 97, selected: true, model: { brand: '特斯拉', series: 'Model 3', seriesFullName: '特斯拉 Model 3', transmission: '自动挡', seats: 5, luggage: 2, energyType: '纯电' }, quote: makeQuote('Q-4-4', 4, 'EV_SEDAN', '新能源轿车', '特斯拉 Model 3 或同级', '新能源', '纯电', 358, { baseServiceFeeCent: 0, vehiclePrepareFeeCent: 3000, oneWayFeeCent: 12000, totalPriceCent: 86600 }) },
]
const cars = ref<RentalCarView[]>(seedCars)
const activeCategory = ref('全部')
const sortMode = ref<'recommend' | 'priceAsc' | 'priceDesc' | 'scoreDesc'>('recommend')
const searchForm = ref({
  pickupCity: '上海',
  returnCity: '杭州',
  pickupLocation: '上海虹桥机场 T2 航站楼',
  returnLocation: '杭州萧山国际机场',
  pickupDate: '2025-06-01',
  pickupTime: '10:00',
  returnDate: '2025-06-03',
  returnTime: '10:00',
  peopleCount: 2,
  vehiclePreference: '不限车型',
  isOneWay: true,
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
const dateLabel = (date: string, time: string) => `${date} ${time}`
const daysBetween = () => {
  const start = new Date(`${searchForm.value.pickupDate}T00:00:00`)
  const end = new Date(`${searchForm.value.returnDate}T00:00:00`)
  const days = Math.round((end.getTime() - start.getTime()) / 86400000)
  return Math.max(1, days || 1)
}
const quoteToCar = (quote: any, index: number): RentalCarView => {
  const fallback = seedCars[index % seedCars.length]
  const fee = quote.feeBreakdown || fallback.quote.feeBreakdown
  const modelName = quote.seriesFullName || quote.displayName || quote.groupName || fallback.name
  const featureTags = String(quote.featureTags || quote.travelTags || '')
    .split(/[,，]/)
    .map(item => item.trim())
    .filter(Boolean)
  return {
    name: modelName,
    image: quote.imageUrl || fallback.image,
    label: quote.vehicleClass || quote.groupName || fallback.label,
    labelClass: quote.groupCode?.includes('SUV') ? 'purple' : 'green',
    desc: quote.summary || quote.description || fallback.desc,
    score: fallback.score,
    reviews: fallback.reviews,
    selected: index === 0,
    model: {
      brand: quote.brand || fallback.model.brand,
      series: quote.series || modelName,
      seriesFullName: modelName,
      transmission: quote.transmission || fallback.model.transmission,
      seats: quote.seats || quote.seatsMax || fallback.model.seats,
      luggage: Number(String(quote.recommendedLuggage || '').match(/\d+/)?.[0] || fallback.model.luggage),
      energyType: energyText(quote.energyType || fallback.model.energyType),
    },
    quote: {
      ...fallback.quote,
      ...quote,
      feeBreakdown: fee,
      featureTags: featureTags.join(',') || quote.featureTags || fallback.quote.featureTags,
      priceSnapshot: quote.priceSnapshot || fallback.quote.priceSnapshot,
    },
  }
}
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
    poiName: selectedQuote.value.pickupPoiName,
    address: selectedQuote.value.pickupAddress,
    mode: selectedQuote.value.pickupMode,
  },
  returnSnapshot: {
    poiName: selectedQuote.value.returnPoiName,
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
    cars.value = seedCars
  } finally {
    quoteLoading.value = false
  }
}
const goResults = async () => {
  await loadQuotes()
  mode.value = 'results'
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 20)
}
const goDetail = (car?: RentalCarView) => {
  if (car) {
    cars.value = cars.value.map(item => ({ ...item, selected: item.quote.quoteId === car.quote.quoteId }))
  }
  mode.value = 'detail'
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 20)
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
  bookingLoading.value = true
  try {
    const result = await rentalApi.createOrder({
      requirement: quoteRequirement(),
      tripPlan: createRentalTripPlan(),
      selectedQuote: selectedQuote.value,
      protectionPackageCode: selectedProtection.value.code,
      protectionPackageName: selectedProtection.value.name,
      protectionFeeCent: protectionFeeCent.value,
      contactName: '旅行家',
      contactPhone: '13800000000',
      remark: `${selectedCar.value.name} 租车预订`,
    })
    latestOrderId.value = result.id
    ElMessage.success(`预订成功，订单ID：${result.id}`)
  } finally {
    bookingLoading.value = false
  }
}
</script>

<template>
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
          </div>
        </div>
      </section>

      <main class="home-main">
        <section class="search-card">
          <div class="tabs">
            <button class="active">国内租车</button>
            <button>海外租车</button>
            <label><input v-model="searchForm.isOneWay" type="checkbox"> 异地还车 <small>i</small></label>
          </div>
          <div class="form-grid">
            <label class="field city"><span>取车城市</span><b><el-icon><Location /></el-icon><input v-model="searchForm.pickupCity"></b></label>
            <label class="field pickup"><span>取车地点</span><b><el-icon><Location /></el-icon><input v-model="searchForm.pickupLocation"></b></label>
            <label class="field return"><span>还车地点</span><b><el-icon><Location /></el-icon><input v-model="searchForm.returnLocation" :disabled="!searchForm.isOneWay"></b></label>
            <label class="field date"><span>取车日期</span><b><el-icon><Calendar /></el-icon><input v-model="searchForm.pickupDate" type="date"></b></label>
            <label class="field short"><span>取车时间</span><b><input v-model="searchForm.pickupTime" type="time"></b></label>
            <label class="field date"><span>还车日期</span><b><el-icon><Calendar /></el-icon><input v-model="searchForm.returnDate" type="date"></b></label>
            <label class="field short"><span>还车时间</span><b><input v-model="searchForm.returnTime" type="time"></b></label>
            <label class="field mini"><span>乘车人数</span><b><el-icon><User /></el-icon><input v-model.number="searchForm.peopleCount" min="1" max="9" type="number"></b></label>
            <label class="field mini"><span>车型类型</span><b><el-icon><Van /></el-icon><select v-model="searchForm.vehiclePreference"><option>不限车型</option><option>经济型</option><option>舒适型</option><option>SUV</option><option>新能源</option><option>商务型</option></select></b></label>
            <button class="search-btn" :disabled="quoteLoading" @click="goResults"><el-icon><Search /></el-icon>{{ quoteLoading ? '搜索中...' : '搜索车辆' }}</button>
          </div>
        </section>

        <section class="benefit-row">
          <article v-for="item in benefits" :key="item.title"><el-icon><component :is="item.icon" /></el-icon><div><b>{{ item.title }}</b><span>{{ item.text }}</span></div></article>
        </section>

        <section class="cars-section">
          <h2>热门车型推荐</h2>
          <div class="car-grid">
            <article v-for="car in cars" :key="car.name" class="home-car">
              <img :src="car.image" :alt="car.name">
              <div><h3>{{ car.name }}</h3><p><span>{{ car.model.transmission }}</span><span>{{ car.model.seats }} 座</span><span>{{ car.model.energyType }}</span></p><small>{{ car.desc }}</small><strong>¥{{ dailyPrice(car) }} <em>/天起</em></strong></div>
            </article>
          </div>
        </section>

        <section class="why-section">
          <h2>为什么选择 PlanGo</h2>
          <div class="why-flow">
            <article><i></i><b>全国覆盖</b><span>200+ 城市 · 2000+ 网点</span></article><em></em>
            <article><i></i><b>易预订</b><span>快速预订 · 即时确认</span></article><em></em>
            <article><i></i><b>优质车源</b><span>严选车辆 · 安全可靠</span></article><em></em>
            <article><i></i><b>安心保障</b><span>多重保障 · 行程无忧</span></article>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="mode === 'results'">
      <main class="results-main">
        <section class="summary-bar">
          <article><span>取车地点</span><b><el-icon><Location /></el-icon>{{ searchForm.pickupLocation }}</b></article>
          <article><span>还车地点</span><b><el-icon><Location /></el-icon>{{ searchForm.returnLocation }}</b></article>
          <article><span>取车时间</span><b><el-icon><Calendar /></el-icon>{{ orderPreview.pickupTime }}</b></article>
          <article><span>还车时间</span><b><el-icon><Calendar /></el-icon>{{ orderPreview.returnTime }}</b></article>
          <article><span>行程时长</span><b><el-icon><Clock /></el-icon>{{ orderPreview.tripDays }} 天</b></article>
          <article><span>乘车人数</span><b><el-icon><User /></el-icon>{{ orderPreview.peopleCount }} 人</b></article>
          <button @click="mode = 'home'"><el-icon><EditPen /></el-icon>修改搜索</button>
        </section>

        <section class="results-layout">
          <div class="results-left">
            <div class="category-tabs">
              <button v-for="item in ['全部','经济型','舒适型','SUV','新能源','商务型']" :key="item" :class="{ active: activeCategory === item }" @click="activeCategory = item">{{ item }}</button>
            </div>
            <div class="sort-row">
              <button :class="{ active: sortMode === 'recommend' }" @click="sortMode = 'recommend'">☆ 推荐排序</button><button :class="{ active: sortMode === 'priceAsc' }" @click="sortMode = 'priceAsc'">价格从低到高</button><button :class="{ active: sortMode === 'priceDesc' }" @click="sortMode = 'priceDesc'">价格从高到低</button><button :class="{ active: sortMode === 'scoreDesc' }" @click="sortMode = 'scoreDesc'">评分最高</button><button>☷ 更多筛选⌄</button>
              <span>共 {{ displayedCars.length }} 款车型</span>
            </div>
            <div class="result-list">
              <article v-for="car in displayedCars" :key="car.quote.quoteId" class="result-card" :class="{ selected: car.selected }">
                <div class="choose-dot" v-if="car.selected"><el-icon><Check /></el-icon></div>
                <span class="car-label" :class="car.labelClass">{{ car.label }}</span>
                <span class="recommend" v-if="car.selected">推荐优选</span>
                <img :src="car.image" :alt="car.name">
                <div class="car-info">
                  <h2>{{ car.name }}</h2>
                  <div class="specs">
                    <span><el-icon><User /></el-icon>{{ car.model.seats }} 座</span>
                    <span><el-icon><Suitcase /></el-icon>{{ car.model.luggage }} 行李箱</span>
                    <span><el-icon><Switch /></el-icon>{{ car.model.transmission }}</span>
                    <span><el-icon><Van /></el-icon>{{ car.model.energyType }}</span>
                  </div>
                  <p><el-icon><StarFilled /></el-icon><b>{{ car.score }}分</b><em>{{ car.reviews }} 条评价</em></p>
                  <div class="service-tags"><span v-for="service in (car.quote.includedServices || '免费取消,基础保险,24h 道路救援').split(/[,，]/).filter(Boolean).slice(0,3)" :key="service">{{ service }}</span></div>
                </div>
                <div class="price-box">
                  <small>{{ car.selected ? '套餐价' : '单价低至' }}</small>
                  <strong>¥{{ car.selected ? yuan(car.quote.feeBreakdown.totalPriceCent) : dailyPrice(car) }}</strong><span>/{{ car.selected ? `${car.quote.rentalDays}天起` : '天起' }}</span>
                  <button @click="goDetail(car)">查看详情</button>
                  <a role="button" @click.stop="togglePriceDetail(car.quote.quoteId)">价格明细{{ expandedQuoteId === car.quote.quoteId ? '⌃' : '⌄' }}</a>
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
                <b class="start">上海虹桥机场 T2 航站楼</b>
                <b class="end">杭州萧山国际机场</b>
                <i></i>
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

    <template v-else>
      <main class="detail-main">
        <button class="back-link" @click="mode = 'results'">‹　返回搜索结果</button>
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
              <div class="cost-detail"><h3>费用明细 <small>（预估总价）</small></h3><p><span>车辆租金（{{ selectedQuote.rentalDays }}天）</span><b>¥{{ yuan(selectedFee.rentalFeeCent) }}</b></p><p><span>基础服务费</span><b>¥{{ yuan(selectedFee.baseServiceFeeCent) }}</b></p><p><span>车辆整备费</span><b>¥{{ yuan(selectedFee.vehiclePrepareFeeCent) }}</b></p><p><span>异地还车费</span><b>¥{{ yuan(selectedFee.oneWayFeeCent) }}</b></p><p><span>送车上门费</span><b>¥{{ yuan(selectedFee.deliveryFeeCent) }}</b></p><p><span>{{ selectedProtection.name }}</span><b>¥{{ yuan(protectionFeeCent) }}</b></p><p><span>租车押金</span><b>{{ selectedFee.rentalDepositCent ? `¥${yuan(selectedFee.rentalDepositCent)}` : '可免押' }}</b></p><p><span>违章押金</span><b>¥{{ yuan(selectedFee.violationDepositCent) }}</b></p></div>
              <div class="compare-box"><h3>价格对比 <small>（同车型均价）</small></h3><p class="best"><span>PlanGo <em>推荐</em></span><b>¥866/2天</b></p><p><span>一嗨租车</span><b>¥876/2天</b></p><p><span>神州租车</span><b>¥883/2天</b></p></div>
              <div class="total-box"><span>预估总价</span><strong>¥{{ yuan(payableTotalCent) }}</strong><small>免押门槛：{{ selectedFee.depositFreeThresholdScore }} 分</small><small v-if="latestOrderId">订单ID：{{ latestOrderId }}</small></div>
              <button class="book-now" :disabled="bookingLoading" @click="bookNow">▣ {{ bookingLoading ? '预订中...' : '立即预订' }}</button>
              <button class="compare-now">加入对比</button>
              <footer><el-icon><Check /></el-icon>现在预订可免费取消</footer>
            </section>
          </aside>
        </section>
      </main>
    </template>
  </div>
</template>

<style scoped>
.rental-page{min-height:calc(100vh - 72px);background:#f7fbff;color:#071936}.home-hero{height:370px;position:relative;overflow:hidden;background:linear-gradient(180deg,#eaf5ff 0%,#f8fcff 72%,#fff 100%)}.home-hero:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(174,213,248,.34),transparent 26%,transparent 72%,rgba(181,218,251,.38))}.home-hero:after{content:"";position:absolute;left:-6vw;right:-6vw;bottom:-88px;height:190px;border-radius:50% 50% 0 0;background:linear-gradient(9deg,#b9d99f 0 18%,#dceec9 19% 35%,#fff 36% 67%,#d5e9fb 68%)}.home-hero-inner,.home-main,.results-main{width:min(1500px,calc(100vw - 72px));margin:0 auto}.home-hero-inner{position:relative;z-index:1;height:100%;display:grid;grid-template-columns:620px 1fr}.hero-copy{padding-top:48px}.hero-copy h1{margin:0;color:#081c3d;font-size:50px;line-height:1.08;font-weight:900;letter-spacing:0}.hero-copy p{margin:12px 0 20px;color:#344864;font-size:19px}.hero-promises{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;width:560px}.hero-promises article{height:70px;display:grid;grid-template-columns:42px 1fr;gap:6px 12px;align-items:center;padding:0 18px;border:1px solid #dce7f4;border-radius:8px;background:rgba(255,255,255,.78)}.hero-promises .el-icon{grid-row:span 2;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#1468ff;background:#eef5ff;font-size:23px}.hero-promises b{font-size:15px}.hero-promises span{align-self:start;color:#66758d;font-size:13px}.hero-art{position:relative}.hero-art img{position:absolute;right:58px;bottom:92px;width:500px;height:236px;object-fit:cover;mix-blend-mode:multiply;filter:drop-shadow(0 22px 18px rgba(31,74,118,.18))}.skyline{position:absolute;right:0;bottom:104px;width:520px;height:180px;opacity:.34;background:linear-gradient(90deg,transparent,#8fbfe6 4% 7%,transparent 8% 16%,#75aee0 17% 22%,transparent 23% 33%,#5799d4 34% 38%,transparent 39% 48%,#97c6e9 49% 55%,transparent 56% 66%,#6aa7d8 67% 72%,transparent 73%)}.plane{position:absolute;left:64px;top:54px;width:80px;height:40px;transform:rotate(15deg)}.plane:before{content:"";position:absolute;left:0;right:0;top:17px;height:9px;border-radius:999px;background:#8ab7e5}.plane:after{content:"";position:absolute;left:32px;top:0;width:14px;height:40px;background:#8ab7e5;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%)}.home-main{position:relative;z-index:2;margin-top:-54px}.search-card{padding:18px 30px 24px;border:1px solid #dce6f2;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 20px 60px rgba(30,73,126,.12)}.tabs{height:42px;display:flex;align-items:flex-start;gap:42px;border-bottom:1px solid #e4edf6;margin-bottom:18px}.tabs button{height:42px;border:0;background:transparent;color:#172d4d;font-size:16px;font-weight:900;cursor:pointer}.tabs .active{position:relative;color:#0f6bff}.tabs .active:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:4px;border-radius:999px;background:#176bff}.tabs label{margin-left:auto;font-weight:700}.tabs input{width:16px;height:16px;vertical-align:-3px}.tabs small{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid #9eb1ca;color:#7b8aa3;font-size:11px}.form-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px 24px;align-items:end}.field{display:grid;gap:8px;min-width:0}.field.city{grid-column:span 3}.field.pickup,.field.return{grid-column:span 4}.field.date,.field.mini,.search-btn{grid-column:span 2}.field.short{grid-column:span 1}.field span{color:#66758d;font-size:13px}.field b{height:48px;display:flex;align-items:center;gap:8px;border:1px solid #dce6f2;border-radius:8px;background:#fff;padding:0 13px;color:#10213b;font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden}.field .el-icon{flex:0 0 auto;color:#384b67;font-size:18px}.field em{width:8px;height:8px;margin-left:auto;border-right:1px solid #627089;border-bottom:1px solid #627089;transform:rotate(45deg)}.search-btn{height:58px;border:0;border-radius:8px;background:#1268f4;color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 18px 32px rgba(18,104,244,.22);cursor:pointer}.benefit-row{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:20px 0 18px}.benefit-row article{height:72px;display:flex;align-items:center;gap:18px;padding:0 30px;border:1px solid #dfe8f5;border-radius:8px;background:#fff}.benefit-row .el-icon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#1468ff;background:#eef5ff;font-size:27px}.benefit-row b{display:block;font-size:16px}.benefit-row span{display:block;margin-top:4px;color:#64748b;font-size:13px}.cars-section h2,.why-section h2{margin:0 0 12px;font-size:24px}.car-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.home-car{height:148px;display:grid;grid-template-columns:170px 1fr;gap:16px;align-items:center;padding:14px 18px;border:1px solid #dfe8f5;border-radius:8px;background:#fff}.home-car img{width:170px;height:112px;object-fit:cover;border-radius:6px;mix-blend-mode:multiply}.home-car h3{margin:0 0 8px;font-size:18px}.home-car p{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 8px}.home-car p span{border-radius:4px;background:#edf1f7;color:#5c687b;padding:3px 7px;font-size:12px}.home-car small{display:block;color:#66758d;font-size:13px}.home-car strong{display:block;margin-top:7px;color:#ff6b00;font-size:22px}.home-car em{color:#64748b;font-size:13px;font-style:normal}.why-section{position:relative;margin-top:20px;padding:4px 0 42px}.why-section:before{content:"";position:absolute;left:-8vw;right:-8vw;top:34px;bottom:-90px;background:linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.78)),linear-gradient(12deg,#b9d99f 0 24%,#eef7ff 25% 62%,#cfe6fb 63%);z-index:-1}.why-flow{display:grid;grid-template-columns:1fr 130px 1fr 130px 1fr 130px 1fr;align-items:center;text-align:center;min-height:126px}.why-flow article{display:grid;justify-items:center;gap:6px}.why-flow i{width:58px;height:58px;border-radius:16px;display:block;background:linear-gradient(135deg,#70b7ff,#1f6fff)}.why-flow b{font-size:16px}.why-flow span{color:#526176;font-size:13px}.why-flow em{height:2px;border-top:2px dashed #86b8ff}.why-flow em:after{content:"";display:block;width:8px;height:8px;margin:-5px 0 0 auto;border-top:2px solid #86b8ff;border-right:2px solid #86b8ff;transform:rotate(45deg)}
.results-main{padding:24px 0 36px}.summary-bar{height:96px;display:grid;grid-template-columns:1.5fr 1.5fr 1.5fr 1.5fr .8fr .8fr 168px;align-items:center;padding:0 28px;border:1px solid #dce6f5;border-radius:12px;background:#fff;box-shadow:0 12px 34px rgba(25,68,128,.08)}.summary-bar article{height:50px;display:flex;flex-direction:column;justify-content:center;padding:0 26px 0 0;border-right:1px solid #e0e8f3}.summary-bar span{color:#6c7b91;font-size:13px}.summary-bar b{display:flex;align-items:center;gap:8px;margin-top:9px;color:#0c213e;font-size:16px}.summary-bar .el-icon{color:#10213b}.summary-bar button{height:48px;border:1px solid #1268f4;border-radius:8px;background:#fff;color:#1268f4;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer}.results-layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:24px;margin-top:24px}.category-tabs{display:flex;gap:16px;margin-bottom:18px}.category-tabs button{width:78px;height:38px;border:1px solid #d7e2f0;border-radius:7px;background:#f8fbff;color:#243955;font-weight:800;cursor:pointer}.category-tabs .active{background:#1268f4;border-color:#1268f4;color:#fff}.sort-row{display:flex;align-items:center;gap:12px;margin-bottom:14px}.sort-row button{height:38px;border:1px solid #d7e2f0;border-radius:7px;background:#fff;color:#172d4d;padding:0 18px;font-weight:800;cursor:pointer}.sort-row .active{color:#1268f4;border-color:#a9c7ff}.sort-row span{margin-left:auto;color:#4f5e78;font-size:14px}.result-list{display:grid;gap:6px}.result-card{position:relative;min-height:142px;display:grid;grid-template-columns:300px minmax(0,1fr) 170px;gap:22px;align-items:center;padding:16px 32px 16px 22px;border:1px solid #dce6f2;border-radius:9px;background:#fff}.result-card.selected{border:2px solid #3978ff;padding:15px 31px 15px 21px}.choose-dot{position:absolute;left:14px;top:50%;width:24px;height:24px;margin-top:-12px;border-radius:50%;display:grid;place-items:center;background:#1268f4;color:#fff}.car-label{position:absolute;left:14px;top:16px;border-radius:5px;color:#fff;padding:4px 10px;font-size:13px;font-weight:900}.car-label.green{background:#68c579}.car-label.purple{background:#7d6af2}.recommend{position:absolute;left:86px;top:16px;border-radius:5px;background:#2f75ff;color:#fff;padding:4px 10px;font-size:13px;font-weight:900}.result-card img{width:270px;height:105px;object-fit:cover;object-position:center;border-radius:5px;mix-blend-mode:multiply}.car-info h2{margin:0 0 12px;font-size:23px;line-height:1}.specs{display:flex;gap:24px;color:#1e3555;font-size:14px}.specs span{display:flex;align-items:center;gap:7px}.car-info p{display:flex;align-items:center;gap:8px;margin:12px 0 10px;color:#ff7a00}.car-info p b{color:#ff7a00}.car-info p em{font-style:normal;color:#243955}.service-tags{display:flex;gap:10px}.service-tags span{border-radius:6px;background:#f0f4fa;color:#5c6a80;padding:6px 13px;font-size:13px}.price-box{text-align:center}.price-box small{display:block;color:#748096}.price-box strong{color:#ff6b00;font-size:30px;font-weight:900}.price-box>span{color:#243955}.price-box button{display:block;width:122px;height:36px;margin:9px auto 8px;border:0;border-radius:6px;background:#1268f4;color:#fff;font-weight:900}.price-box a{color:#1268f4;font-size:13px;font-weight:800}.result-note{display:flex;align-items:center;gap:8px;margin:18px 0 0 330px;color:#748096}.result-note .el-icon{color:#1268f4}.results-side{display:grid;gap:14px;align-content:start}.map-card{height:210px;overflow:hidden;border-radius:12px 12px 0 0;background:#eaf5ff}.route-map{position:relative;height:100%;background:linear-gradient(90deg,rgba(82,154,233,.08) 1px,transparent 1px),linear-gradient(rgba(82,154,233,.08) 1px,transparent 1px),radial-gradient(circle at 78% 28%,#cce7ff,transparent 24%),radial-gradient(circle at 28% 78%,#d7f0df,transparent 24%);background-size:28px 28px,28px 28px,auto,auto}.route-map b{position:absolute;border-radius:18px;background:#fff;color:#10213b;padding:9px 14px;font-size:13px;font-weight:900;box-shadow:0 8px 18px rgba(24,64,113,.12)}.route-map .start{left:68px;top:28px}.route-map .end{right:30px;bottom:30px}.route-map i{position:absolute;left:125px;top:72px;width:140px;height:74px;border-right:6px dotted #2f75ff;border-bottom:6px dotted #2f75ff;border-radius:0 0 50px 0;transform:rotate(7deg)}.side-card{padding:20px;border:1px solid #dce6f2;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(25,68,128,.06)}.map-card+.side-card{margin-top:-14px;border-radius:0 0 12px 12px}.side-card h3{margin:0 0 18px;font-size:20px}.overview p{display:flex;justify-content:space-between;margin:14px 0;color:#6c7b91}.overview p b{text-align:right;color:#10213b}.timeline{padding-bottom:8px}.timeline p{display:grid;grid-template-columns:18px 50px 1fr;gap:8px;align-items:start;margin:0 0 14px}.timeline i{width:10px;height:10px;margin-top:4px;border-radius:50%;border:2px solid #42628c}.include-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 22px}.include-grid article{display:grid;grid-template-columns:42px 1fr;gap:3px 10px}.include-grid .el-icon{grid-row:span 2;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#eff5ff;color:#1268f4;font-size:23px}.include-grid b{font-size:15px}.include-grid span{color:#6c7b91;font-size:13px}.include footer{display:flex;align-items:center;gap:8px;margin:18px -20px -20px;padding:14px 20px;border-top:1px solid #e2e9f3;color:#63728a}.include footer .el-icon{color:#1268f4}
.detail-main{width:min(1500px,calc(100vw - 72px));margin:0 auto;padding:16px 0 36px}.back-link{height:32px;border:0;background:transparent;color:#172d4d;font-size:15px;cursor:pointer}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:10px}.detail-left{display:grid;gap:12px}.vehicle-hero-card{position:relative;min-height:280px;display:grid;grid-template-columns:390px minmax(0,1fr);overflow:hidden;border:1px solid #dce6f2;border-radius:10px;background:linear-gradient(90deg,#fff 0 32%,#eef7ff 58%,#dff0ff)}.favorite{position:absolute;right:22px;top:20px;z-index:3;height:36px;border:0;border-radius:18px;background:#fff;color:#10213b;font-weight:900;padding:0 16px;box-shadow:0 8px 18px rgba(24,64,113,.1)}.vehicle-copy{position:relative;z-index:2;padding:28px 28px}.vehicle-copy>span{display:inline-flex;border-radius:5px;background:#dff8e8;color:#19a25b;padding:4px 10px;font-size:13px;font-weight:900}.vehicle-copy h1{margin:12px 0 8px;color:#081c3d;font-size:37px;line-height:1.08}.vehicle-copy p{margin:0 0 16px;color:#415270;font-size:16px}.rating{display:flex;align-items:center;gap:9px;color:#ff7a00;font-size:16px}.rating em{color:#10213b;font-style:normal;font-weight:900;margin-left:16px}.vehicle-specs{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px;color:#10213b}.vehicle-specs span{display:flex;align-items:center;gap:9px}.vehicle-stage{position:relative}.vehicle-stage .city-bg{position:absolute;inset:0;background:linear-gradient(90deg,transparent,#8fbfe6 12% 16%,transparent 17% 25%,#75aee0 26% 31%,transparent 32% 42%,#5799d4 43% 48%,transparent 49%);opacity:.26}.vehicle-stage img{position:absolute;right:50px;bottom:14px;width:520px;height:240px;object-fit:cover;mix-blend-mode:multiply;filter:drop-shadow(0 24px 20px rgba(24,64,113,.2))}.thumb-row{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.thumb-row button{height:72px;border:1px solid #dce6f2;border-radius:8px;background:#f8fbff;overflow:hidden;cursor:pointer}.thumb-row .active{border:2px solid #1268f4}.thumb-row img{width:100%;height:100%;object-fit:cover}.thumb-row .more{position:relative;background:#2b3445;color:#fff;font-size:25px;font-weight:900}.feature-strip{height:58px;display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #dce6f2;border-radius:9px;background:#fff}.feature-strip article{display:grid;grid-template-columns:42px 1fr;gap:2px 10px;align-items:center;padding:0 26px}.feature-strip i{grid-row:span 2;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#eff5ff;color:#1268f4;font-style:normal;font-weight:900}.feature-strip b{font-size:15px}.feature-strip span{color:#6c7b91}.plan-section h2{margin:0 0 10px;font-size:19px}.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.plan-grid article{min-height:128px;border:1px solid #dce6f2;border-radius:9px;background:#fff;padding:18px 22px}.plan-grid .picked{border:2px solid #1268f4;padding:17px 21px}.plan-grid h3{display:flex;align-items:center;gap:8px;margin:0 0 12px;font-size:16px}.plan-grid em{border-radius:999px;background:#dff8e8;color:#19a25b;font-size:12px;font-style:normal;padding:3px 8px}.plan-grid strong{margin-left:auto;color:#1268f4}.plan-grid p{margin:6px 0;color:#31435d;font-size:13px}.plan-grid a{display:inline-block;margin-top:8px;color:#1268f4;font-size:13px;font-weight:900}.detail-info-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:10px}.fee-include,.tips-box,.store-card,.days-card{border:1px solid #dce6f2;border-radius:9px;background:#fff;padding:16px 20px}.fee-include h3,.tips-box h3,.store-card h3{margin:0 0 12px;font-size:17px}.fee-include div{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.fee-include span{display:flex;align-items:center;gap:8px;color:#243955}.tips-box ul{margin:0;padding-left:18px;color:#31435d;line-height:1.6}.store-card{min-height:100px}.store-card h3{display:flex;justify-content:space-between}.store-card a{color:#1268f4;font-size:14px}.store-card p{margin:0 0 10px;color:#6c7b91;line-height:1.5}.store-card b{color:#10213b}.store-card strong{display:flex;align-items:center;gap:8px;font-size:17px}.days-card{display:grid;place-items:center;text-align:center}.days-card span{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;border:1px solid #cfe0ff;color:#1268f4;font-size:28px}.days-card b{font-size:18px}.bottom-guarantees{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #dce6f2;border-radius:9px;background:#fff}.bottom-guarantees article{display:grid;grid-template-columns:40px 1fr;gap:2px 10px;padding:12px 20px;border-right:1px solid #e2e9f3}.bottom-guarantees article:last-child{border-right:0}.bottom-guarantees .el-icon{grid-row:span 2;color:#1268f4;font-size:23px}.bottom-guarantees b{font-size:15px}.bottom-guarantees span{color:#6c7b91;font-size:13px}.order-aside{align-self:start;position:sticky;top:90px}.order-card{border:1px solid #dce6f2;border-radius:10px;background:#fff;padding:22px;box-shadow:0 18px 44px rgba(24,64,113,.08)}.order-card header{display:flex;justify-content:space-between;align-items:center}.order-card h2{margin:0;font-size:22px}.order-card a{color:#1268f4;font-weight:900}.order-route{padding:22px 0 14px;border-bottom:1px solid #e2e9f3}.order-route p{display:grid;grid-template-columns:14px 42px 1fr;gap:8px;margin:0 0 18px}.order-route i{width:10px;height:10px;margin-top:5px;border-radius:50%;background:#1268f4}.order-route p:last-child i{background:#b9c4d3}.order-route span{color:#31435d}.order-route b{line-height:1.55}.order-route em{font-style:normal;color:#31435d;font-weight:500}.order-meta,.cost-detail,.compare-box{padding:14px 0;border-bottom:1px solid #e2e9f3}.order-meta p,.cost-detail p,.compare-box p{display:flex;justify-content:space-between;margin:10px 0;color:#31435d}.order-meta b,.cost-detail b,.compare-box b{color:#10213b}.cost-detail h3,.compare-box h3{margin:0 0 10px;font-size:17px}.cost-detail small,.compare-box small{color:#6c7b91;font-weight:500}.compare-box p{height:30px;align-items:center;padding:0 10px;border-radius:5px}.compare-box .best{background:#f8fbff;border:1px solid #e2e9f3}.compare-box em{margin-left:8px;border-radius:5px;background:#3778ff;color:#fff;font-style:normal;font-size:12px;padding:2px 7px}.compare-box .best b{color:#ff6b00}.total-box{text-align:right;padding:16px 0}.total-box span,.total-box small{display:block;color:#6c7b91}.total-box strong{display:block;color:#ff6b00;font-size:40px;line-height:1}.book-now,.compare-now{width:100%;height:44px;border-radius:7px;font-size:17px;font-weight:900;cursor:pointer}.book-now{border:0;background:#1268f4;color:#fff}.compare-now{margin-top:12px;border:1px solid #1268f4;background:#fff;color:#1268f4}.order-card footer{display:flex;justify-content:center;gap:8px;margin-top:18px;color:#10b981;font-weight:900}
.field input,.field select{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#10213b;font:inherit;font-weight:800}.field input:disabled{color:#8b98aa}.field input[type=date],.field input[type=time]{font-size:14px}.plan-grid article{cursor:pointer}.book-now:disabled,.search-btn:disabled{opacity:.72;cursor:not-allowed}.price-box a{cursor:pointer}.inline-fee-detail{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,1fr);gap:8px 28px;margin-top:2px;padding:14px 18px;border-top:1px solid #e5edf7;background:#f8fbff;border-radius:0 0 8px 8px}.inline-fee-detail p,.inline-fee-detail strong{display:flex;justify-content:space-between;gap:14px;margin:0;color:#64748b;font-size:13px}.inline-fee-detail b{color:#10213b}.inline-fee-detail strong{color:#10213b}.inline-fee-detail strong b{color:#ff6b00;font-size:16px}.inline-fee-detail em{grid-column:1/-1;color:#7b8aa3;font-size:12px;font-style:normal}
@media(max-width:1180px){.home-hero{height:auto}.home-hero-inner,.results-layout{grid-template-columns:1fr}.home-hero-inner{padding-bottom:82px}.hero-art{display:none}.home-main,.home-hero-inner,.results-main{width:calc(100vw - 40px)}.form-grid,.benefit-row,.car-grid{grid-template-columns:1fr 1fr}.field,.field.city,.field.pickup,.field.return,.field.date,.field.short,.field.mini,.search-btn{grid-column:auto}.summary-bar{height:auto;grid-template-columns:1fr 1fr;padding:18px}.summary-bar article{border-right:0}.results-side{grid-template-columns:1fr 1fr}.map-card{grid-column:1/-1}.map-card+.side-card{margin-top:0;border-radius:12px}}@media(max-width:760px){.hero-copy h1{font-size:36px}.hero-promises,.form-grid,.benefit-row,.car-grid,.why-flow,.summary-bar,.results-side,.inline-fee-detail{grid-template-columns:1fr}.search-card{padding:16px}.tabs{gap:22px}.tabs label{margin-left:0}.home-car,.result-card{grid-template-columns:1fr;height:auto}.result-card{padding:20px}.result-card.selected{padding:19px}.result-card img{width:100%;height:150px}.price-box{text-align:left}.price-box button{margin-left:0}.sort-row,.category-tabs{flex-wrap:wrap}.result-note{margin-left:0}}
</style>
