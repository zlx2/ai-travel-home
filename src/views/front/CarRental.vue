<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Calendar, Check, Clock, Location, Search, Suitcase, Switch, User, Van } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

type Car = {
  id: number
  name: string
  category: string
  description: string
  seats: number
  luggage: number
  transmission: string
  energy: string
  price: number
  originalPrice?: number
  score: number
  orders: number
  tags: string[]
  color: string
  accent: string
}

const tomorrow = new Date(Date.now() + 86400000)
const threeDaysLater = new Date(Date.now() + 4 * 86400000)
const formatDate = (date: Date) => date.toISOString().slice(0, 10)
const searchForm = reactive({ city: '重庆', location: '重庆江北机场', dates: [formatDate(tomorrow), formatDate(threeDaysLater)] as string[], differentReturn: false })
const activeType = ref('全部车型')
const sortBy = ref('推荐排序')
const bookingVisible = ref(false)
const selectedCar = ref<Car | null>(null)
const searched = ref(false)

const carTypes = ['全部车型', '经济型', '舒适型', 'SUV', '新能源', '商务型']
const cars: Car[] = [
  { id: 1, name: '大众 朗逸', category: '经济型', description: '同组车型：轩逸 / 卡罗拉', seats: 5, luggage: 2, transmission: '自动挡', energy: '汽油', price: 168, originalPrice: 198, score: 4.9, orders: 1260, tags: ['限时特惠', '基础保障'], color: '#dae6f1', accent: '#62778b' },
  { id: 2, name: '丰田 凯美瑞', category: '舒适型', description: '同组车型：雅阁 / 帕萨特', seats: 5, luggage: 3, transmission: '自动挡', energy: '汽油', price: 268, score: 4.8, orders: 896, tags: ['舒适首选', '免费取消'], color: '#e5e8eb', accent: '#56616d' },
  { id: 3, name: '比亚迪 宋 PLUS', category: 'SUV', description: '城市 SUV · 大空间出行', seats: 5, luggage: 4, transmission: '自动挡', energy: '混动', price: 298, originalPrice: 328, score: 4.9, orders: 734, tags: ['热门车型', '里程无忧'], color: '#d9e3e8', accent: '#4f6773' },
  { id: 4, name: '特斯拉 Model 3', category: '新能源', description: '智能电动 · 续航 556km', seats: 5, luggage: 2, transmission: '自动挡', energy: '纯电', price: 358, score: 4.8, orders: 528, tags: ['新能源', '免加油'], color: '#dce0e5', accent: '#3d4852' },
  { id: 5, name: '别克 GL8', category: '商务型', description: '宽适七座 · 家庭商务皆宜', seats: 7, luggage: 4, transmission: '自动挡', energy: '汽油', price: 468, score: 4.9, orders: 642, tags: ['七座优选', '到店取车'], color: '#d3dae0', accent: '#445563' },
  { id: 6, name: '本田 CR-V', category: 'SUV', description: '同组车型：RAV4 / 途观 L', seats: 5, luggage: 4, transmission: '自动挡', energy: '汽油', price: 328, score: 4.7, orders: 479, tags: ['家庭出行', '基础保障'], color: '#d8e1dd', accent: '#536a61' },
]

const filteredCars = computed(() => {
  const list = activeType.value === '全部车型' ? [...cars] : cars.filter(car => car.category === activeType.value)
  if (sortBy.value === '价格从低到高') return list.sort((a, b) => a.price - b.price)
  if (sortBy.value === '评分最高') return list.sort((a, b) => b.score - a.score)
  return list
})
const rentalDays = computed(() => {
  if (!searchForm.dates?.[0] || !searchForm.dates?.[1]) return 1
  return Math.max(1, Math.ceil((new Date(searchForm.dates[1]).getTime() - new Date(searchForm.dates[0]).getTime()) / 86400000))
})
const totalPrice = computed(() => (selectedCar.value?.price || 0) * rentalDays.value + 40)

const searchCars = () => {
  searched.value = true
  ElMessage.success(`已为你找到 ${filteredCars.value.length} 辆可用车辆`)
  setTimeout(() => document.querySelector('.cars-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}
const chooseCar = (car: Car) => {
  selectedCar.value = car
  bookingVisible.value = true
}
const submitBooking = () => {
  bookingVisible.value = false
  ElMessage.success('用车需求已保存（演示模式，未产生真实订单）')
}
</script>

<template>
  <div class="rental-page">
    <section class="rental-hero">
      <div class="container hero-layout">
        <div class="hero-copy">
          <span class="eyebrow">DRIVE YOUR JOURNEY</span>
          <h1>一程一景，<span>自在出发</span></h1>
          <p>安心租车，自驾探索每一处心动风景<br>价格透明 · 车型丰富 · 全程保障</p>
          <div class="hero-points"><span><el-icon><Check /></el-icon>无隐藏费用</span><span><el-icon><Check /></el-icon>24 小时服务</span><span><el-icon><Check /></el-icon>芝麻免押可选</span></div>
        </div>
        <div class="road-visual" aria-hidden="true">
          <div class="sun"></div><div class="mountain one"></div><div class="mountain two"></div><div class="road"></div>
          <div class="hero-car"><svg viewBox="0 0 420 180"><path d="M63 110 94 58c7-12 18-19 32-20h150c14 0 26 7 35 20l34 48 30 11c13 5 20 15 20 29v8H27v-14c0-15 11-26 26-29l10-1Z" fill="#f8fbff"/><path d="m119 57-25 48h108V57h-83Zm101 0v48h96l-33-43c-3-3-8-5-13-5h-50Z" fill="#b7d9e9"/><path d="M46 121h328c11 0 20 9 20 20v13H27v-14c0-10 8-19 19-19Z" fill="#eef5f8"/><circle cx="105" cy="148" r="29" fill="#243342"/><circle cx="105" cy="148" r="13" fill="#b7c4ce"/><circle cx="317" cy="148" r="29" fill="#243342"/><circle cx="317" cy="148" r="13" fill="#b7c4ce"/><path d="M43 125h22" stroke="#ffd77b" stroke-width="9" stroke-linecap="round"/></svg></div>
        </div>
      </div>
    </section>

    <section class="container search-card card">
      <div class="search-tabs"><button class="active">国内租车</button><button>海外租车 <small>即将开放</small></button></div>
      <div class="search-fields">
        <label><span>取车城市</span><el-input v-model="searchForm.city" size="large"><template #prefix><el-icon><Location /></el-icon></template></el-input></label>
        <label class="location-field"><span>取车门店</span><el-input v-model="searchForm.location" size="large"><template #prefix><el-icon><Van /></el-icon></template></el-input></label>
        <label class="date-field"><span>取还车日期</span><el-date-picker v-model="searchForm.dates" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="取车日期" end-placeholder="还车日期" size="large" /></label>
        <el-button class="search-button gradient-button" type="primary" @click="searchCars"><el-icon><Search /></el-icon>搜索车辆</el-button>
      </div>
      <div class="different-return"><el-checkbox v-model="searchForm.differentReturn">异地还车</el-checkbox><span>当前为同门店取还，更省心</span></div>
    </section>

    <section class="container benefits">
      <article><i><el-icon><Van /></el-icon></i><div><b>车型丰富</b><span>经济轿车到七座商务</span></div></article>
      <article><i><el-icon><Check /></el-icon></i><div><b>费用透明</b><span>价格清晰，无隐形消费</span></div></article>
      <article><i><el-icon><Clock /></el-icon></i><div><b>灵活取消</b><span>取车前 24 小时免费取消</span></div></article>
      <article><i><el-icon><Location /></el-icon></i><div><b>全国门店</b><span>覆盖 300+ 城市与机场</span></div></article>
    </section>

    <section class="container cars-section">
      <div class="section-heading"><div><span class="eyebrow">POPULAR CARS</span><h2>{{ searchForm.city }}热门车型</h2><p>已为你精选口碑好车，全部支持到店取车</p></div><div class="result-note" v-if="searched">{{ searchForm.dates[0] }} 至 {{ searchForm.dates[1] }} · {{ rentalDays }} 天</div></div>
      <div class="filter-bar">
        <div class="type-tabs"><button v-for="type in carTypes" :key="type" :class="{ active: activeType === type }" @click="activeType = type">{{ type }}</button></div>
        <el-select v-model="sortBy" style="width: 150px"><el-option v-for="item in ['推荐排序','价格从低到高','评分最高']" :key="item" :label="item" :value="item" /></el-select>
      </div>

      <div class="car-grid">
        <article v-for="car in filteredCars" :key="car.id" class="car-card card">
          <div class="car-picture" :style="{ background: `linear-gradient(145deg, #f8fbfd, ${car.color})` }">
            <span>{{ car.category }}</span>
            <svg viewBox="0 0 420 180" :style="{ color: car.accent }"><path d="M63 110 94 58c7-12 18-19 32-20h150c14 0 26 7 35 20l34 48 30 11c13 5 20 15 20 29v8H27v-14c0-15 11-26 26-29l10-1Z" fill="currentColor"/><path d="m119 57-25 48h108V57h-83Zm101 0v48h96l-33-43c-3-3-8-5-13-5h-50Z" fill="#cbe1ec"/><path d="M46 121h328c11 0 20 9 20 20v13H27v-14c0-10 8-19 19-19Z" fill="currentColor" opacity=".85"/><circle cx="105" cy="148" r="29" fill="#24313e"/><circle cx="105" cy="148" r="13" fill="#aebbc5"/><circle cx="317" cy="148" r="29" fill="#24313e"/><circle cx="317" cy="148" r="13" fill="#aebbc5"/></svg>
          </div>
          <div class="car-content"><div class="car-title"><div><h3>{{ car.name }}</h3><p>{{ car.description }}</p></div><div class="rating"><b>{{ car.score }}</b><span>{{ car.orders }} 人选择</span></div></div>
            <div class="specs"><span><el-icon><User /></el-icon>{{ car.seats }}座</span><span><el-icon><Suitcase /></el-icon>{{ car.luggage }}行李</span><span><el-icon><Switch /></el-icon>{{ car.transmission }}</span><span>{{ car.energy }}</span></div>
            <div class="car-tags"><el-tag v-for="tag in car.tags" :key="tag" size="small" effect="light">{{ tag }}</el-tag></div>
            <div class="price-row"><div><small v-if="car.originalPrice">原价 ¥{{ car.originalPrice }}</small><strong><i>¥</i>{{ car.price }}</strong><span>/日均</span></div><el-button type="primary" class="gradient-button" @click="chooseCar(car)">立即租车</el-button></div>
          </div>
        </article>
      </div>
      <el-empty v-if="!filteredCars.length" description="暂时没有该车型，换个分类看看吧" />
    </section>

    <section class="container travel-banner"><div><span>自驾灵感</span><h2>山城公路，风景正好</h2><p>从重庆出发，沿江而行，用方向盘打开旅途的另一种可能。</p></div><button>查看推荐路线 <span>→</span></button></section>

    <el-dialog v-model="bookingVisible" width="520px" class="booking-dialog" title="确认用车信息">
      <div v-if="selectedCar" class="booking-content"><div class="booking-car"><div><b>{{ selectedCar.name }}</b><span>{{ selectedCar.category }} · {{ selectedCar.transmission }} · {{ selectedCar.seats }}座</span></div><strong>¥{{ selectedCar.price }}<small>/天</small></strong></div>
        <div class="booking-route"><div><i></i><span><small>取车</small><b>{{ searchForm.dates[0] }} 10:00</b><p>{{ searchForm.location }}</p></span></div><div><i></i><span><small>还车</small><b>{{ searchForm.dates[1] }} 10:00</b><p>{{ searchForm.differentReturn ? '待选择异地还车门店' : searchForm.location }}</p></span></div></div>
        <div class="booking-total"><span>车辆租金 ¥{{ selectedCar.price }} × {{ rentalDays }} 天<br><small>基础保障服务费 ¥40</small></span><div>预估总价 <b>¥{{ totalPrice }}</b></div></div>
        <p class="demo-tip">当前为页面演示，不会提交订单或产生实际费用。</p>
      </div>
      <template #footer><el-button @click="bookingVisible = false">再看看</el-button><el-button type="primary" class="gradient-button" @click="submitBooking">确认用车</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.rental-page{flex:1;background:#f6f9fc;color:#172033}.rental-hero{height:370px;overflow:hidden;position:relative;background:linear-gradient(115deg,#eefaff 0%,#dff4f5 52%,#bee1de 100%)}.hero-layout{height:100%;display:grid;grid-template-columns:.9fr 1.1fr;align-items:center}.hero-copy{z-index:2;padding-left:18px}.hero-copy h1{font-size:48px;line-height:1.15;margin:11px 0 17px;letter-spacing:-1px}.hero-copy h1 span{background:var(--gradient);-webkit-background-clip:text;color:transparent}.hero-copy p{font-size:16px;line-height:1.8;color:#5d6f7e;margin:0}.hero-points{display:flex;gap:24px;margin-top:22px;color:#587080;font-size:13px}.hero-points span{display:flex;align-items:center;gap:5px}.hero-points .el-icon{width:18px;height:18px;background:#fff;border-radius:50%;color:#00a785}.road-visual{height:100%;position:relative}.sun{position:absolute;width:115px;height:115px;border-radius:50%;background:#fff6cf;right:13%;top:35px;box-shadow:0 0 60px #fff4b9}.mountain{position:absolute;bottom:104px;width:430px;height:220px;background:#9fcac0;clip-path:polygon(0 100%,30% 38%,43% 70%,65% 20%,100% 100%)}.mountain.one{right:16%;opacity:.45}.mountain.two{right:-8%;bottom:89px;background:#71ad9f;opacity:.5;transform:scale(.9)}.road{position:absolute;bottom:-55px;left:4%;width:92%;height:185px;border-radius:50% 50% 0 0;background:#8aa8a4;transform:perspective(300px) rotateX(58deg);box-shadow:inset 0 0 0 36px #c3ded5}.hero-car{position:absolute;width:430px;right:9%;bottom:48px;filter:drop-shadow(0 18px 14px #426b6544)}
.search-card{position:relative;z-index:3;margin-top:-37px;padding:0 28px 20px;border-radius:18px}.search-tabs{height:58px;display:flex;align-items:center;gap:32px;border-bottom:1px solid #edf0f3;margin-bottom:18px}.search-tabs button{height:100%;position:relative;background:none;border:0;font-size:16px;font-weight:700;color:#8a95a3;cursor:pointer}.search-tabs button.active{color:#1d6fdc}.search-tabs button.active:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--gradient);border-radius:4px}.search-tabs small{font-size:9px;background:#eef2f5;color:#9ba4af;padding:2px 6px;border-radius:5px}.search-fields{display:grid;grid-template-columns:150px 1.1fr 1.5fr 150px;gap:14px;align-items:end}.search-fields label>span{display:block;font-size:12px;color:#667385;margin-bottom:7px}.search-fields :deep(.el-input__wrapper),.search-fields :deep(.el-range-editor.el-input__wrapper){height:46px;box-shadow:0 0 0 1px #dde4eb inset;border-radius:9px}.date-field :deep(.el-date-editor){width:100%}.search-button{height:46px;border-radius:9px;font-size:15px}.different-return{display:flex;gap:13px;align-items:center;margin-top:11px;font-size:12px;color:#9aa3ae}.different-return :deep(.el-checkbox__label){font-size:12px;color:#596777}
.benefits{display:grid;grid-template-columns:repeat(4,1fr);margin-top:28px;background:#fff;border:1px solid #edf0f4;border-radius:14px;padding:23px 28px}.benefits article{display:flex;align-items:center;gap:13px;padding-left:28px;border-right:1px solid #edf0f4}.benefits article:first-child{padding-left:0}.benefits article:last-child{border:0}.benefits i{width:42px;height:42px;border-radius:13px;background:#eaf5ff;color:#2f80ed;display:grid;place-items:center;font-size:20px}.benefits article:nth-child(even) i{background:#e9faf5;color:#00a986}.benefits b,.benefits span{display:block}.benefits b{font-size:14px;margin-bottom:4px}.benefits span{font-size:12px;color:#8993a0}
.cars-section{padding-top:56px;scroll-margin-top:80px}.section-heading{display:flex;justify-content:space-between;align-items:end}.section-heading h2{font-size:30px;margin:8px 0}.section-heading p{color:#7d8998;margin:0}.result-note{font-size:13px;color:#66758a;background:#fff;border:1px solid #e4eaf0;padding:10px 14px;border-radius:9px}.filter-bar{display:flex;justify-content:space-between;align-items:center;margin:25px 0 20px}.type-tabs{display:flex;gap:8px}.type-tabs button{border:1px solid #e0e6ed;background:#fff;border-radius:8px;padding:9px 18px;color:#596779;cursor:pointer}.type-tabs button.active{color:#fff;border-color:transparent;background:var(--gradient);box-shadow:0 6px 14px #2f80ed28}.car-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.car-card{border-radius:15px;overflow:hidden;transition:.25s}.car-card:hover{transform:translateY(-4px);box-shadow:0 18px 38px rgba(48,72,108,.13)}.car-picture{height:175px;position:relative;display:flex;align-items:center;justify-content:center}.car-picture>span{position:absolute;left:15px;top:14px;padding:5px 9px;border-radius:6px;background:#ffffffd9;color:#5c6c79;font-size:11px;font-weight:700}.car-picture svg{width:275px;filter:drop-shadow(0 13px 8px #3647542a)}.car-content{padding:18px}.car-title{display:flex;justify-content:space-between;gap:10px}.car-title h3{font-size:19px;margin:0 0 6px}.car-title p{font-size:12px;color:#8a94a2;margin:0}.rating{text-align:right;white-space:nowrap}.rating b{display:block;font-size:15px;color:#f59b23}.rating b:before{content:"★ ";font-size:12px}.rating span{font-size:10px;color:#a1a9b3}.specs{display:flex;gap:13px;margin:18px 0 14px;color:#647386;font-size:12px}.specs span{display:flex;align-items:center;gap:3px}.specs .el-icon{color:#8295a8}.car-tags{height:24px}.car-tags .el-tag{border:0;margin-right:6px}.price-row{display:flex;align-items:end;justify-content:space-between;border-top:1px solid #edf0f3;margin-top:14px;padding-top:15px}.price-row small{display:block;text-decoration:line-through;color:#a2aab4;font-size:10px}.price-row strong{font-size:26px;color:#f17538}.price-row strong i{font-size:13px;font-style:normal}.price-row span{font-size:11px;color:#8d97a3}.price-row .el-button{border-radius:8px}
.travel-banner{height:175px;margin-top:56px;margin-bottom:10px;border-radius:18px;padding:30px 46px;color:#fff;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(90deg,rgba(15,75,94,.94),rgba(17,129,122,.72)),url('/assets/hq/yunnan.jpg') center 45%/cover;box-shadow:0 14px 35px #2c74702c}.travel-banner h2{font-size:27px;margin:8px 0}.travel-banner p{margin:0;color:#e1f2ef}.travel-banner>div>span{font-size:11px;letter-spacing:3px}.travel-banner button{border:1px solid #ffffffaa;background:#ffffff18;color:#fff;padding:12px 20px;border-radius:8px;cursor:pointer}.travel-banner button span{margin-left:14px}
.booking-content{padding:0 4px}.booking-car{display:flex;justify-content:space-between;padding:17px;background:#f2f8fd;border-radius:12px}.booking-car b,.booking-car span{display:block}.booking-car span{font-size:12px;color:#7c8998;margin-top:5px}.booking-car strong{font-size:22px;color:#f17538}.booking-car strong small{font-size:11px;color:#83909e}.booking-route{padding:22px 12px 8px}.booking-route>div{display:flex;gap:13px;position:relative;padding-bottom:19px}.booking-route>div:first-child:after{content:"";position:absolute;left:5px;top:14px;bottom:-3px;border-left:1px dashed #adc1d2}.booking-route i{width:11px;height:11px;border:3px solid #2f80ed;border-radius:50%;margin-top:4px;z-index:1;background:#fff}.booking-route>div:last-child i{border-color:#00b894}.booking-route small,.booking-route b,.booking-route p{display:block}.booking-route small{font-size:11px;color:#8d98a5}.booking-route b{font-size:14px;margin:3px 0}.booking-route p{margin:0;font-size:12px;color:#778493}.booking-total{display:flex;justify-content:space-between;align-items:end;border-top:1px solid #ebeff3;padding-top:16px;font-size:12px;color:#687586}.booking-total>span{line-height:1.7}.booking-total div b{font-size:25px;color:#f17538}.demo-tip{font-size:11px;color:#a0a8b2;background:#f8f9fa;padding:9px 11px;border-radius:7px;margin:16px 0 0}
@media(max-width:1200px){.hero-copy h1{font-size:42px}.hero-car{right:0}.search-fields{grid-template-columns:130px 1fr 1.4fr 135px}.car-picture svg{width:235px}.type-tabs button{padding:9px 13px}}
</style>
