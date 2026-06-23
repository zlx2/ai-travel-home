<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Calendar, Check, Clock, Location, Money, Search, Suitcase, Switch, User, Van } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

type Car = {
  id: number
  name: string
  category: string
  description: string
  suitable: string
  seats: number
  luggage: number
  transmission: string
  energy: string
  price: number
  originalPrice?: number
  score: number
  orders: number
  tags: string[]
  services: string[]
  tone: 'blue' | 'teal' | 'gold' | 'slate'
}

const tomorrow = new Date(Date.now() + 86400000)
const threeDaysLater = new Date(Date.now() + 4 * 86400000)
const formatDate = (date: Date) => date.toISOString().slice(0, 10)

const searchForm = reactive({
  city: '杭州',
  pickupLocation: '杭州萧山国际机场',
  returnLocation: '杭州萧山国际机场',
  dates: [formatDate(tomorrow), formatDate(threeDaysLater)] as string[],
  peopleCount: 2,
  routeHint: '西湖周边、灵隐寺、京杭大运河',
  differentReturn: false,
})
const activeType = ref('全部车型')
const sortBy = ref('推荐排序')
const bookingVisible = ref(false)
const selectedCar = ref<Car | null>(null)
const searched = ref(false)

const carTypes = ['全部车型', '经济型', '舒适型', 'SUV', '新能源', '商务型']
const cars: Car[] = [
  { id: 1, name: '大众 朗逸', category: '经济型', description: '同组车型：轩逸 / 卡罗拉', suitable: '2-3 人城市轻松游', seats: 5, luggage: 2, transmission: '自动挡', energy: '汽油', price: 168, originalPrice: 198, score: 4.9, orders: 1260, tags: ['推荐套餐', '基础保障'], services: ['基本保险', '免费取消', '24h 道路救援'], tone: 'blue' },
  { id: 2, name: '丰田 凯美瑞', category: '舒适型', description: '同组车型：雅阁 / 帕萨特', suitable: '带父母或长途更舒适', seats: 5, luggage: 3, transmission: '自动挡', energy: '汽油', price: 268, score: 4.8, orders: 896, tags: ['舒适首选', '免费取消'], services: ['基本保险', '舒适座舱', '免费取消'], tone: 'slate' },
  { id: 3, name: '比亚迪 宋 PLUS', category: 'SUV', description: '城市 SUV · 大空间出行', suitable: '周边自然风光与山路', seats: 5, luggage: 4, transmission: '自动挡', energy: '混动', price: 298, originalPrice: 328, score: 4.9, orders: 734, tags: ['热门车型', '里程无忧'], services: ['基本保险', '无限里程', '空间充足'], tone: 'teal' },
  { id: 4, name: '特斯拉 Model 3', category: '新能源', description: '智能电动 · 续航 556km', suitable: '城市通勤与短途自驾', seats: 5, luggage: 2, transmission: '自动挡', energy: '纯电', price: 358, score: 4.8, orders: 528, tags: ['新能源', '免加油'], services: ['基础保险', '充电友好', '免费取消'], tone: 'blue' },
  { id: 5, name: '别克 GL8', category: '商务型', description: '宽适七座 · 家庭商务皆宜', suitable: '家庭多人或商务出行', seats: 7, luggage: 4, transmission: '自动挡', energy: '汽油', price: 468, score: 4.9, orders: 642, tags: ['七座优选', '宽敞舒适'], services: ['基本保险', '大空间', '24h 道路救援'], tone: 'gold' },
  { id: 6, name: '本田 CR-V', category: 'SUV', description: '同组车型：RAV4 / 途观 L', suitable: '家庭出游与郊区路线', seats: 5, luggage: 4, transmission: '自动挡', energy: '汽油', price: 328, score: 4.7, orders: 479, tags: ['家庭出行', '基础保障'], services: ['基本保险', '免费取消', '空间充足'], tone: 'teal' },
]

const filteredCars = computed(() => {
  const list = activeType.value === '全部车型' ? [...cars] : cars.filter(car => car.category === activeType.value)
  if (sortBy.value === '价格从低到高') return list.sort((a, b) => a.price - b.price)
  if (sortBy.value === '评分最高') return list.sort((a, b) => b.score - a.score)
  if (sortBy.value === '空间优先') return list.sort((a, b) => b.luggage + b.seats - (a.luggage + a.seats))
  return list
})
const rentalDays = computed(() => {
  if (!searchForm.dates?.[0] || !searchForm.dates?.[1]) return 1
  return Math.max(1, Math.ceil((new Date(searchForm.dates[1]).getTime() - new Date(searchForm.dates[0]).getTime()) / 86400000))
})
const selectedTotal = computed(() => selectedCar.value ? selectedCar.value.price * rentalDays.value + 40 : 0)
const recommendedType = computed(() => {
  if (searchForm.peopleCount >= 5) return '商务型'
  if (/山|周边|自驾|自然/.test(searchForm.routeHint)) return 'SUV'
  return '舒适型'
})

const searchCars = () => {
  searched.value = true
  if (!selectedCar.value) selectedCar.value = filteredCars.value[0] || null
  ElMessage.success(`已为你匹配 ${filteredCars.value.length} 个租车方案`)
  setTimeout(() => document.querySelector('.rental-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}
const chooseCar = (car: Car) => {
  selectedCar.value = car
  searched.value = true
}
const submitBooking = () => {
  bookingVisible.value = false
  ElMessage.success('用车需求已保存（演示模式，未产生真实订单）')
}
</script>

<template>
  <div class="rental-page">
    <section class="rental-workspace">
      <div class="container rental-shell">
        <div class="rental-heading">
          <div>
            <span class="eyebrow">CAR TRAVEL</span>
            <h1>租车出行</h1>
            <p>按城市、门店、日期和路线，为你的旅程匹配合适车型。</p>
          </div>
          <div class="heading-badge">
            <el-icon><Check /></el-icon>
            <span>价格透明 · 可免费取消 · 演示模式</span>
          </div>
        </div>

        <section class="search-workbench rental-card">
          <div class="search-main">
            <div class="search-tabs">
              <button class="active">国内租车</button>
              <button disabled>海外租车 <small>即将开放</small></button>
            </div>
            <div class="search-fields">
              <label>
                <span>取车城市</span>
                <el-input v-model="searchForm.city" size="large">
                  <template #prefix><el-icon><Location /></el-icon></template>
                </el-input>
              </label>
              <label>
                <span>取车门店</span>
                <el-input v-model="searchForm.pickupLocation" size="large">
                  <template #prefix><el-icon><Van /></el-icon></template>
                </el-input>
              </label>
              <label>
                <span>还车门店</span>
                <el-input v-model="searchForm.returnLocation" size="large" :disabled="!searchForm.differentReturn">
                  <template #prefix><el-icon><Location /></el-icon></template>
                </el-input>
              </label>
              <label class="date-field">
                <span>取还车日期</span>
                <el-date-picker v-model="searchForm.dates" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="取车日期" end-placeholder="还车日期" size="large" />
              </label>
              <label>
                <span>同行人数</span>
                <el-input-number v-model="searchForm.peopleCount" :min="1" :max="9" size="large" />
              </label>
              <label class="route-field">
                <span>路线偏好</span>
                <el-input v-model="searchForm.routeHint" size="large" placeholder="如：机场、景区、周边自驾" />
              </label>
            </div>
            <div class="search-actions">
              <el-checkbox v-model="searchForm.differentReturn">异地还车</el-checkbox>
              <span>默认同门店取还，费用更稳定。</span>
              <el-button class="primary-button" type="primary" size="large" @click="searchCars">
                <el-icon><Search /></el-icon>搜索车辆
              </el-button>
            </div>
          </div>

          <aside class="trip-context">
            <div class="context-title">
              <span>出行摘要</span>
              <b>{{ searchForm.city }} · {{ rentalDays }} 天用车</b>
            </div>
            <div class="context-grid">
              <div><small>推荐车型</small><strong>{{ recommendedType }}</strong></div>
              <div><small>同行人数</small><strong>{{ searchForm.peopleCount }} 人</strong></div>
              <div><small>取车点</small><strong>{{ searchForm.pickupLocation }}</strong></div>
              <div><small>路线</small><strong>{{ searchForm.routeHint }}</strong></div>
            </div>
            <p>如果从 AI 行程规划进入，这里后续可自动带入目的地、日期、路线和已选租车意图。</p>
          </aside>
        </section>

        <section class="service-strip rental-card">
          <article><el-icon><Van /></el-icon><b>车型覆盖</b><span>经济轿车、SUV、新能源、七座商务</span></article>
          <article><el-icon><Money /></el-icon><b>费用透明</b><span>租金、保障服务与税费分开展示</span></article>
          <article><el-icon><Clock /></el-icon><b>灵活取消</b><span>取车前 24 小时可免费取消</span></article>
          <article><el-icon><Location /></el-icon><b>门店适配</b><span>机场、高铁站、核心商圈优先推荐</span></article>
        </section>

        <section class="rental-results">
          <div class="results-head">
            <div>
              <span class="eyebrow">MATCHED QUOTES</span>
              <h2>{{ searchForm.city }}租车方案</h2>
              <p>{{ searchForm.dates[0] }} 至 {{ searchForm.dates[1] }} · {{ rentalDays }} 天 · {{ searchForm.peopleCount }} 人</p>
            </div>
            <div class="filter-actions">
              <div class="type-tabs">
                <button v-for="type in carTypes" :key="type" :class="{ active: activeType === type }" @click="activeType = type">{{ type }}</button>
              </div>
              <el-select v-model="sortBy" style="width: 148px">
                <el-option v-for="item in ['推荐排序','价格从低到高','评分最高','空间优先']" :key="item" :label="item" :value="item" />
              </el-select>
            </div>
          </div>

          <div class="result-layout">
            <div class="quote-list">
              <article v-for="car in filteredCars" :key="car.id" class="quote-card rental-card" :class="[{ selected: selectedCar?.id === car.id }, car.tone]" @click="chooseCar(car)">
                <div class="quote-visual">
                  <span>{{ car.category }}</span>
                  <el-icon><Van /></el-icon>
                </div>
                <div class="quote-info">
                  <div class="quote-title">
                    <div>
                      <em>{{ car.tags[0] }}</em>
                      <h3>{{ car.name }}</h3>
                      <p>{{ car.description }} · {{ car.suitable }}</p>
                    </div>
                    <span class="selected-mark" :class="{ on: selectedCar?.id === car.id }"><el-icon><Check /></el-icon></span>
                  </div>
                  <div class="specs">
                    <span><el-icon><User /></el-icon>{{ car.seats }} 座</span>
                    <span><el-icon><Suitcase /></el-icon>{{ car.luggage }} 行李</span>
                    <span><el-icon><Switch /></el-icon>{{ car.transmission }}</span>
                    <span>{{ car.energy }}</span>
                    <span>{{ car.score }} 分 · {{ car.orders }} 人选择</span>
                  </div>
                  <div class="store-route">
                    <div><small>取车</small><b>{{ searchForm.pickupLocation }}</b><span>{{ searchForm.dates[0] }} 10:00</span></div>
                    <i></i>
                    <div><small>还车</small><b>{{ searchForm.differentReturn ? searchForm.returnLocation : searchForm.pickupLocation }}</b><span>{{ searchForm.dates[1] }} 10:00</span></div>
                  </div>
                  <div class="quote-bottom">
                    <div class="services"><span v-for="service in car.services" :key="service">{{ service }}</span></div>
                    <div class="price">
                      <small v-if="car.originalPrice">日均原价 ¥{{ car.originalPrice }}</small>
                      <strong>¥{{ car.price }}</strong><span>/日均</span>
                    </div>
                  </div>
                </div>
              </article>
              <el-empty v-if="!filteredCars.length" description="暂时没有该车型，换个分类看看吧" />
            </div>

            <aside class="selected-panel rental-card">
              <template v-if="selectedCar">
                <div class="panel-head">
                  <span>已选方案</span>
                  <b>{{ selectedCar.name }}</b>
                  <p>{{ selectedCar.category }} · {{ selectedCar.suitable }}</p>
                </div>
                <div class="panel-specs">
                  <span>{{ selectedCar.seats }} 座</span>
                  <span>{{ selectedCar.luggage }} 行李</span>
                  <span>{{ selectedCar.transmission }}</span>
                  <span>{{ selectedCar.energy }}</span>
                </div>
                <div class="panel-route">
                  <p><small>取车</small><b>{{ searchForm.pickupLocation }}</b><em>{{ searchForm.dates[0] }} 10:00</em></p>
                  <p><small>还车</small><b>{{ searchForm.differentReturn ? searchForm.returnLocation : searchForm.pickupLocation }}</b><em>{{ searchForm.dates[1] }} 10:00</em></p>
                </div>
                <div class="cost-lines">
                  <p><span>车辆租金</span><b>¥{{ selectedCar.price }} × {{ rentalDays }} 天</b></p>
                  <p><span>基础保障服务费</span><b>¥40</b></p>
                  <p><span>税费与手续费</span><b>已包含</b></p>
                  <strong><span>预估总价</span><em>¥{{ selectedTotal }}</em></strong>
                </div>
                <div class="panel-services">
                  <span v-for="service in selectedCar.services" :key="service"><el-icon><Check /></el-icon>{{ service }}</span>
                </div>
                <el-button class="primary-button confirm-button" type="primary" size="large" @click="bookingVisible = true">确认用车方案</el-button>
                <p class="demo-note">当前为前端演示，不会提交真实订单或产生费用。</p>
              </template>
              <template v-else>
                <el-empty description="选择一个租车方案后查看费用明细" :image-size="86" />
              </template>
            </aside>
          </div>
        </section>
      </div>
    </section>

    <el-dialog v-model="bookingVisible" width="520px" class="booking-dialog" title="确认用车信息">
      <div v-if="selectedCar" class="booking-content">
        <div class="booking-car">
          <div><b>{{ selectedCar.name }}</b><span>{{ selectedCar.category }} · {{ selectedCar.transmission }} · {{ selectedCar.seats }}座</span></div>
          <strong>¥{{ selectedCar.price }}<small>/天</small></strong>
        </div>
        <div class="booking-route">
          <div><i></i><span><small>取车</small><b>{{ searchForm.dates[0] }} 10:00</b><p>{{ searchForm.pickupLocation }}</p></span></div>
          <div><i></i><span><small>还车</small><b>{{ searchForm.dates[1] }} 10:00</b><p>{{ searchForm.differentReturn ? searchForm.returnLocation : searchForm.pickupLocation }}</p></span></div>
        </div>
        <div class="booking-total">
          <span>车辆租金 ¥{{ selectedCar.price }} × {{ rentalDays }} 天<br><small>基础保障服务费 ¥40</small></span>
          <div>预估总价 <b>¥{{ selectedTotal }}</b></div>
        </div>
        <p class="demo-tip">当前为页面演示，不会提交订单或产生实际费用。</p>
      </div>
      <template #footer>
        <el-button @click="bookingVisible = false">再看看</el-button>
        <el-button type="primary" class="primary-button" @click="submitBooking">确认用车</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.rental-page{flex:1;background:#f5f7fa;color:#172033}.rental-workspace{min-height:calc(100vh - 72px);position:relative;padding:28px 0 78px;background:radial-gradient(circle at 12% 0%,rgba(37,99,235,.055),transparent 28%),radial-gradient(circle at 88% 3%,rgba(5,150,105,.045),transparent 24%),linear-gradient(180deg,#fff 0%,#f7f9fc 40%,#f5f7fa 100%);overflow:hidden}.rental-workspace:before{content:"";position:fixed;inset:72px 0 0;pointer-events:none;opacity:.08;background-image:linear-gradient(rgba(100,116,139,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(100,116,139,.18) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to bottom,#000 0%,transparent 70%)}.rental-shell{position:relative;z-index:1;max-width:1240px}.rental-card{background:#fff;border:1px solid rgba(230,234,240,.96);border-radius:24px;box-shadow:0 16px 48px rgba(15,23,42,.06)}.rental-heading{display:flex;align-items:end;justify-content:space-between;margin-bottom:18px}.rental-heading h1{font-size:32px;margin:7px 0 6px;color:#111827}.rental-heading p{margin:0;color:#64748b}.heading-badge{display:flex;align-items:center;gap:8px;border:1px solid #d7efe8;border-radius:999px;background:#f1fbf8;color:#047857;padding:9px 13px;font-size:13px}.search-workbench{display:grid;grid-template-columns:minmax(0,1fr) 302px;gap:16px;padding:20px}.search-main{border:1px solid #e2e8f0;border-radius:20px;padding:16px;background:linear-gradient(180deg,#fff,#fbfcfe)}.search-tabs{display:flex;align-items:center;gap:24px;margin-bottom:16px}.search-tabs button{border:0;background:transparent;color:#7b8798;font-weight:800;cursor:pointer}.search-tabs button.active{color:#2563eb}.search-tabs button:disabled{cursor:not-allowed}.search-tabs small{margin-left:5px;border-radius:6px;background:#eef2f7;color:#98a2b3;padding:2px 6px;font-size:10px}.search-fields{display:grid;grid-template-columns:150px 1fr 1fr 1.3fr 120px;gap:14px}.search-fields label>span{display:block;margin-bottom:7px;color:#64748b;font-size:12px}.search-fields :deep(.el-input__wrapper),.search-fields :deep(.el-range-editor.el-input__wrapper){height:44px;border-radius:12px;box-shadow:0 0 0 1px #dfe6ef inset}.search-fields :deep(.el-input-number){width:100%}.date-field :deep(.el-date-editor){width:100%}.route-field{grid-column:2 / -1}.search-actions{display:flex;align-items:center;gap:12px;margin-top:15px;color:#8290a3;font-size:13px}.search-actions .el-button{margin-left:auto}.primary-button{border:0!important;border-radius:12px!important;background:linear-gradient(135deg,#2563eb,#0d9488)!important;color:#fff!important;box-shadow:0 10px 22px rgba(37,99,235,.16)}.trip-context{border:1px solid #e8dfd1;border-radius:22px;background:linear-gradient(180deg,#fffaf3,#fff 78%);padding:18px}.context-title span,.context-title b{display:block}.context-title span{color:#a36d24;font-size:12px;font-weight:800}.context-title b{margin-top:5px;color:#1f2937;font-size:19px}.context-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.context-grid div{border:1px solid #f0e7dc;border-radius:13px;background:#fff;padding:10px}.context-grid small,.context-grid strong{display:block}.context-grid small{color:#8b95a4;font-size:11px}.context-grid strong{margin-top:5px;color:#172033;font-size:13px;line-height:1.35}.trip-context p{margin:0;padding-top:14px;border-top:1px solid #f0e7dc;color:#758195;font-size:12px;line-height:1.7}.service-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:18px;padding:18px 22px}.service-strip article{display:grid;grid-template-columns:38px 1fr;gap:3px 12px;align-items:center;padding:0 18px;border-right:1px solid #edf0f4}.service-strip article:first-child{padding-left:0}.service-strip article:last-child{border-right:0}.service-strip .el-icon{grid-row:span 2;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#eff6ff;color:#2563eb;font-size:20px}.service-strip b{color:#1f2937}.service-strip span{color:#7c8796;font-size:12px}.rental-results{padding-top:34px;scroll-margin-top:86px}.results-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:16px}.results-head h2{font-size:28px;margin:7px 0;color:#111827}.results-head p{margin:0;color:#64748b}.filter-actions{display:flex;align-items:center;gap:12px}.type-tabs{display:flex;gap:8px;flex-wrap:wrap}.type-tabs button{border:1px solid #e0e7ef;background:#fff;border-radius:999px;padding:8px 13px;color:#596779;cursor:pointer}.type-tabs button.active{color:#fff;border-color:transparent;background:#2563eb}.result-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:start}.quote-list{display:grid;gap:14px}.quote-card{display:grid;grid-template-columns:150px 1fr;gap:18px;padding:16px;cursor:pointer;transition:.2s}.quote-card:hover{transform:translateY(-2px);box-shadow:0 20px 55px rgba(15,23,42,.08)}.quote-card.selected{border-color:#2563eb;box-shadow:0 18px 50px rgba(37,99,235,.12)}.quote-visual{height:132px;border-radius:18px;display:grid;place-items:center;position:relative;background:linear-gradient(180deg,#eff6ff,#fff)}.quote-card.teal .quote-visual{background:linear-gradient(180deg,#ecfdf5,#fff)}.quote-card.gold .quote-visual{background:linear-gradient(180deg,#fff7ed,#fff)}.quote-card.slate .quote-visual{background:linear-gradient(180deg,#f1f5f9,#fff)}.quote-visual>span{position:absolute;left:12px;top:12px;border-radius:999px;background:#ffffffd9;color:#64748b;padding:5px 9px;font-size:11px;font-weight:800}.quote-visual .el-icon{font-size:70px;color:#536273}.quote-title{display:flex;justify-content:space-between;gap:12px}.quote-title em{font-style:normal;border-radius:999px;background:#f6eadb;color:#a16207;padding:5px 9px;font-size:12px;font-weight:800}.quote-title h3{margin:10px 0 5px;color:#111827;font-size:20px}.quote-title p{margin:0;color:#667386;font-size:13px}.selected-mark{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:1px solid #d6dee8;color:transparent;flex:0 0 24px}.selected-mark.on{background:#2563eb;border-color:#2563eb;color:#fff}.specs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.specs span{display:inline-flex;align-items:center;gap:4px;border-radius:8px;background:#f6f8fb;color:#596779;padding:5px 8px;font-size:12px}.store-route{display:grid;grid-template-columns:1fr 46px 1fr;gap:12px;padding-top:13px;border-top:1px solid #edf0f4}.store-route div{display:flex;flex-direction:column;gap:3px}.store-route small{color:#8a96a8}.store-route b{color:#1f2937;font-size:13px}.store-route span{color:#7a8698;font-size:12px}.store-route i{height:1px;background:#cbd5e1;align-self:center;position:relative}.store-route i:after{content:"";position:absolute;right:0;top:-3px;width:7px;height:7px;border-top:1px solid #94a3b8;border-right:1px solid #94a3b8;transform:rotate(45deg)}.quote-bottom{display:flex;align-items:end;justify-content:space-between;margin-top:13px}.services{display:flex;gap:7px;flex-wrap:wrap}.services span{border-radius:999px;background:#f1f5f9;color:#526174;padding:6px 9px;font-size:12px}.price{text-align:right}.price small{display:block;text-decoration:line-through;color:#a1aab6;font-size:11px}.price strong{font-size:26px;color:#f97316}.price span{color:#7b8796;font-size:12px}.selected-panel{position:sticky;top:92px;padding:20px}.panel-head span{color:#2563eb;font-size:12px;font-weight:800}.panel-head b{display:block;margin-top:7px;color:#111827;font-size:22px}.panel-head p{margin:7px 0 0;color:#64748b}.panel-specs{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}.panel-specs span{border-radius:8px;background:#f6f8fb;color:#596779;padding:6px 8px;font-size:12px}.panel-route{display:grid;gap:10px;border-top:1px solid #edf0f4;border-bottom:1px solid #edf0f4;padding:15px 0}.panel-route p{margin:0}.panel-route small,.panel-route b,.panel-route em{display:block}.panel-route small{color:#8a96a8}.panel-route b{margin:4px 0;color:#1f2937}.panel-route em{font-style:normal;color:#7a8698;font-size:12px}.cost-lines{padding:14px 0}.cost-lines p,.cost-lines strong{display:flex;justify-content:space-between;gap:12px;margin:9px 0;color:#718096}.cost-lines b{color:#1f2937}.cost-lines strong{border-top:1px solid #edf0f4;padding-top:13px;color:#1f2937}.cost-lines em{font-style:normal;color:#2563eb;font-size:25px}.panel-services{display:grid;gap:8px;margin-bottom:16px}.panel-services span{display:flex;align-items:center;gap:8px;color:#475569;font-size:13px}.panel-services .el-icon{color:#10b981}.confirm-button{width:100%;height:44px}.demo-note{margin:12px 0 0;color:#9aa3af;font-size:12px;text-align:center}.booking-content{padding:0 4px}.booking-car{display:flex;justify-content:space-between;padding:17px;background:#f2f8fd;border-radius:12px}.booking-car b,.booking-car span{display:block}.booking-car span{font-size:12px;color:#7c8998;margin-top:5px}.booking-car strong{font-size:22px;color:#f17538}.booking-car strong small{font-size:11px;color:#83909e}.booking-route{padding:22px 12px 8px}.booking-route>div{display:flex;gap:13px;position:relative;padding-bottom:19px}.booking-route>div:first-child:after{content:"";position:absolute;left:5px;top:14px;bottom:-3px;border-left:1px dashed #adc1d2}.booking-route i{width:11px;height:11px;border:3px solid #2f80ed;border-radius:50%;margin-top:4px;z-index:1;background:#fff}.booking-route>div:last-child i{border-color:#00b894}.booking-route small,.booking-route b,.booking-route p{display:block}.booking-route small{font-size:11px;color:#8d98a5}.booking-route b{font-size:14px;margin:3px 0}.booking-route p{margin:0;font-size:12px;color:#778493}.booking-total{display:flex;justify-content:space-between;align-items:end;border-top:1px solid #ebeff3;padding-top:16px;font-size:12px;color:#687586}.booking-total>span{line-height:1.7}.booking-total div b{font-size:25px;color:#f17538}.demo-tip{font-size:11px;color:#a0a8b2;background:#f8f9fa;padding:9px 11px;border-radius:7px;margin:16px 0 0}@media(max-width:1180px){.search-workbench,.result-layout{grid-template-columns:1fr}.selected-panel{position:static}.search-fields{grid-template-columns:1fr 1fr}.route-field{grid-column:auto}.service-strip{grid-template-columns:1fr 1fr;gap:14px}.service-strip article{border:0;padding:0}.results-head{align-items:flex-start;flex-direction:column}.filter-actions{align-items:flex-start;flex-direction:column}}@media(max-width:760px){.rental-heading{align-items:flex-start;flex-direction:column;gap:12px}.search-fields,.service-strip,.quote-card{grid-template-columns:1fr}.search-actions{align-items:flex-start;flex-direction:column}.search-actions .el-button{width:100%;margin-left:0}.quote-visual{height:110px}.store-route{grid-template-columns:1fr}.store-route i{display:none}.booking-total{align-items:flex-start;flex-direction:column;gap:10px}}
</style>
