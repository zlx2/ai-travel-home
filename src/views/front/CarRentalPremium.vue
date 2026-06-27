<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Headset,
  Location,
  Lock,
  Money,
  Search,
  StarFilled,
  Suitcase,
  Switch,
  User,
  Van,
} from '@element-plus/icons-vue'

type ViewMode = 'home' | 'results' | 'detail'
type Car = {
  id: number
  name: string
  brand: string
  type: string
  badge: string
  tone: string
  price: number
  score: string
  reviews: number
  seats: number
  bags: number
  energy: string
  gearbox: string
  desc: string
  highlight: string
}

const mode = ref<ViewMode>('home')
const activeType = ref('全部')
const activeCarId = ref(4)

const types = ['全部', '经济型', '舒适型', 'SUV', '新能源', '商务型']
const cars: Car[] = [
  { id: 1, name: '大众 朗逸', brand: 'Volkswagen', type: '经济型', badge: '经济型', tone: 'silver', price: 168, score: '4.8', reviews: 126, seats: 5, bags: 2, energy: '汽油', gearbox: '自动挡', desc: '经济省油，适合城市通勤和短途自驾', highlight: '城市轻松游首选' },
  { id: 2, name: '丰田 凯美瑞', brand: 'Toyota', type: '舒适型', badge: '舒适型', tone: 'pearl', price: 268, score: '4.9', reviews: 215, seats: 5, bags: 3, energy: '汽油', gearbox: '自动挡', desc: '座舱安静，长途驾驶更稳更舒适', highlight: '商务与家庭兼顾' },
  { id: 3, name: '本田 CR-V', brand: 'Honda', type: 'SUV', badge: 'SUV', tone: 'graphite', price: 358, score: '4.8', reviews: 182, seats: 5, bags: 3, energy: '汽油', gearbox: '自动挡', desc: '后备箱空间充足，适合亲子和周边路线', highlight: '空间宽敞' },
  { id: 4, name: '特斯拉 Model 3', brand: 'Tesla', type: '新能源', badge: '新能源', tone: 'white', price: 358, score: '4.9', reviews: 97, seats: 5, bags: 2, energy: '纯电', gearbox: '自动挡', desc: '智能电动，动力响应快，城市与高速都从容', highlight: '智能电动推荐' },
  { id: 5, name: '奥迪 Q5L', brand: 'Audi', type: 'SUV', badge: '商务型', tone: 'black', price: 598, score: '4.9', reviews: 88, seats: 5, bags: 3, energy: '汽油', gearbox: '自动挡', desc: '豪华 SUV，适合品质出行与商务接待', highlight: '豪华品质之选' },
]

const filteredCars = computed(() => activeType.value === '全部' ? cars : cars.filter(car => car.type === activeType.value || car.badge === activeType.value))
const activeCar = computed(() => cars.find(car => car.id === activeCarId.value) || cars[0])
const rentalDays = 2
const protectionFee = 120
const serviceFee = 30
const totalPrice = computed(() => activeCar.value.price * rentalDays + protectionFee + serviceFee)

const switchView = (next: ViewMode, id?: number) => {
  if (id) activeCarId.value = id
  mode.value = next
  setTimeout(() => document.querySelector(`.${next}-view`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20)
}
</script>

<template>
  <div class="rental-page">
    <section v-if="mode === 'home'" class="hero-section home-view">
      <div class="hero-bg"></div>
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">PLANGO RENTAL</span>
          <h1>轻松租车，自在出行</h1>
          <p>覆盖机场、高铁站与城市门店，透明报价、灵活取还，把租车体验做得像订酒店一样清楚。</p>
          <div class="hero-metrics">
            <article><strong>200+</strong><span>覆盖城市</span></article>
            <article><strong>2000+</strong><span>精选网点</span></article>
            <article><strong>24h</strong><span>客服支持</span></article>
          </div>
        </div>
        <div class="hero-stage">
          <div class="flight-mark"></div>
          <div class="city-line"></div>
          <div class="vehicle-render vehicle-blue vehicle-xl"><i></i></div>
          <div class="road-line"></div>
        </div>
      </div>
    </section>

    <section v-if="mode === 'home'" class="container search-panel">
      <div class="search-top">
        <div class="search-tabs"><button class="active">国内租车</button><button>海外租车</button></div>
        <label class="checkline"><input type="checkbox"> 异地还车</label>
      </div>
      <div class="search-grid">
        <label><span>取车城市</span><b><el-icon><Location /></el-icon>上海</b></label>
        <label><span>取车地点</span><b><el-icon><Location /></el-icon>虹桥机场 T2 航站楼</b></label>
        <label><span>还车地点</span><b><el-icon><Location /></el-icon>与取车地点相同</b></label>
        <label><span>取车时间</span><b><el-icon><Calendar /></el-icon>2025-06-01 周日</b></label>
        <label><span>还车时间</span><b><el-icon><Calendar /></el-icon>2025-06-03 周二</b></label>
        <label><span>乘车人数</span><b><el-icon><User /></el-icon>2 人</b></label>
        <label><span>车型类型</span><b><el-icon><Van /></el-icon>不限车型</b></label>
        <button class="primary-action" @click="switchView('results')"><el-icon><Search /></el-icon>搜索车辆</button>
      </div>
    </section>

    <section v-if="mode === 'home'" class="container landing-content">
      <div class="promise-row">
        <article><el-icon><Money /></el-icon><div><b>价格透明</b><span>明码标价，无隐形消费</span></div></article>
        <article><el-icon><Check /></el-icon><div><b>灵活取消</b><span>取车前 24 小时可免费取消</span></div></article>
        <article><el-icon><Location /></el-icon><div><b>多网点取还</b><span>机场、高铁站、商圈覆盖</span></div></article>
        <article><el-icon><Headset /></el-icon><div><b>专属服务</b><span>全天候在线协助</span></div></article>
      </div>

      <div class="section-head">
        <div><h2>热门车型推荐</h2><p>先用静态数据打磨体验，后续可直接对接真实库存。</p></div>
        <button @click="switchView('results')">查看全部车型</button>
      </div>
      <div class="featured-grid">
        <article v-for="car in cars.slice(0, 4)" :key="car.id" class="featured-card" @click="switchView('detail', car.id)">
          <div class="featured-visual" :class="`tone-${car.tone}`"><div class="vehicle-render"><i></i></div></div>
          <div class="featured-info">
            <span>{{ car.badge }}</span>
            <h3>{{ car.name }}</h3>
            <p>{{ car.desc }}</p>
            <div><b>¥{{ car.price }}</b><small>/天起</small></div>
          </div>
        </article>
      </div>

      <div class="process-band">
        <h2>为什么选择 PlanGo</h2>
        <div class="process-steps">
          <article><span>01</span><b>全国覆盖</b><small>200+ 城市 · 2000+ 网点</small></article>
          <i></i>
          <article><span>02</span><b>快速确认</b><small>静态流程清晰，后续可接库存</small></article>
          <i></i>
          <article><span>03</span><b>优质车源</b><small>车型、保障、价格统一展示</small></article>
          <i></i>
          <article><span>04</span><b>安心保障</b><small>保险、救援、取消规则前置</small></article>
        </div>
      </div>
    </section>

    <section v-if="mode === 'results'" class="container results-view page-view">
      <div class="summary-card">
        <article><span>取车地点</span><b>上海虹桥机场 T2 航站楼</b></article>
        <article><span>还车地点</span><b>杭州萧山国际机场</b></article>
        <article><span>取车时间</span><b>2025-06-01 周日 10:00</b></article>
        <article><span>还车时间</span><b>2025-06-03 周二 10:00</b></article>
        <article><span>行程时长</span><b>2 天</b></article>
        <article><span>乘车人数</span><b>2 人</b></article>
        <button @click="switchView('home')">修改搜索</button>
      </div>

      <div class="toolbar-row">
        <div class="category-tabs">
          <button v-for="type in types" :key="type" :class="{ active: activeType === type }" @click="activeType = type">{{ type }}</button>
        </div>
        <div class="sort-tabs"><button class="active">推荐排序</button><button>价格从低到高</button><button>评分最高</button><button>更多筛选</button></div>
      </div>

      <div class="results-layout">
        <div class="quote-list">
          <article v-for="car in filteredCars" :key="car.id" class="quote-card" :class="{ selected: activeCarId === car.id }" @click="activeCarId = car.id">
            <span class="quote-badge">{{ car.badge }}</span>
            <div class="quote-visual" :class="`tone-${car.tone}`"><div class="vehicle-render"><i></i></div></div>
            <div class="quote-main">
              <h3>{{ car.name }}</h3>
              <p>{{ car.highlight }} · {{ car.desc }}</p>
              <div class="spec-line">
                <span><el-icon><User /></el-icon>{{ car.seats }} 座</span>
                <span><el-icon><Suitcase /></el-icon>{{ car.bags }} 行李箱</span>
                <span><el-icon><Switch /></el-icon>{{ car.gearbox }}</span>
                <span>{{ car.energy }}</span>
              </div>
              <div class="rating-line"><el-icon><StarFilled /></el-icon>{{ car.score }} 分 <em>{{ car.reviews }} 条评价</em></div>
              <div class="service-tags"><span>免费取消</span><span>基础保险</span><span>24h 道路救援</span></div>
            </div>
            <div class="quote-price">
              <small>单价低至</small>
              <strong>¥{{ car.price }}</strong><span>/天起</span>
              <button @click.stop="switchView('detail', car.id)">查看详情</button>
              <a>价格明细</a>
            </div>
          </article>
        </div>

        <aside class="trip-aside">
          <div class="map-panel">
            <div class="map-grid"></div>
            <b class="pin-start">上海虹桥机场 T2 航站楼</b>
            <i></i>
            <b class="pin-end">杭州萧山国际机场</b>
          </div>
          <div class="aside-card">
            <h3>行程概览</h3>
            <p><span>取车</span><b>2025-06-01 周日 10:00<br>上海虹桥机场 T2 航站楼</b></p>
            <p><span>还车</span><b>2025-06-03 周二 10:00<br>杭州萧山国际机场</b></p>
            <p><span>行程时长</span><b>2 天</b></p>
            <p><span>预计里程</span><b>约 200 公里</b></p>
          </div>
          <div class="aside-card include-card">
            <h3>费用包含</h3>
            <div><span><el-icon><Lock /></el-icon>基础保险</span><span><el-icon><Headset /></el-icon>道路救援</span><span><el-icon><Van /></el-icon>车辆清洁</span><span><el-icon><Clock /></el-icon>不限里程</span></div>
          </div>
        </aside>
      </div>
    </section>

    <section v-if="mode === 'detail'" class="container detail-view page-view">
      <button class="back-button" @click="switchView('results')"><el-icon><ArrowLeft /></el-icon>返回搜索结果</button>
      <div class="detail-layout">
        <main class="detail-content">
          <section class="detail-hero-card">
            <div class="detail-copy">
              <span>{{ activeCar.badge }}</span>
              <h2>{{ activeCar.name }}</h2>
              <p>{{ activeCar.desc }} · 自动驾驶辅助 · {{ activeCar.highlight }}</p>
              <b><el-icon><StarFilled /></el-icon>{{ activeCar.score }} 分　980+ 评价</b>
              <div class="detail-specs">
                <span><el-icon><User /></el-icon>{{ activeCar.seats }} 座</span>
                <span><el-icon><Suitcase /></el-icon>{{ activeCar.bags }} 行李箱</span>
                <span>{{ activeCar.energy }}</span>
                <span>{{ activeCar.gearbox }}</span>
              </div>
            </div>
            <div class="detail-stage" :class="`tone-${activeCar.tone}`"><div class="city-line"></div><div class="vehicle-render vehicle-xl"><i></i></div></div>
          </section>

          <div class="gallery-row">
            <span v-for="item in ['外观', '侧面', '尾部', '中控', '驾驶舱', '+6']" :key="item" :class="{ active: item === '外观' }"><div class="vehicle-render vehicle-thumb"><i></i></div><b>{{ item }}</b></span>
          </div>

          <div class="feature-grid">
            <article><el-icon><Clock /></el-icon><b>超长续航</b><span>554km CLTC</span></article>
            <article><el-icon><Switch /></el-icon><b>智能驾驶辅助</b><span>Autopilot</span></article>
            <article><el-icon><Van /></el-icon><b>舒适座舱</b><span>15 英寸中控屏</span></article>
            <article><el-icon><Money /></el-icon><b>费用透明</b><span>明细逐项展示</span></article>
          </div>

          <h3 class="block-title">租车方案</h3>
          <div class="package-grid">
            <article><h4>基础保险 <em>已包含</em></h4><p>基础险、第三者责任险、7×24 小时客服支持。</p><a>保障详情</a></article>
            <article class="picked"><h4>安心保障套餐 <em>推荐</em><strong>¥60/天</strong></h4><p>车辆损失险、轮胎玻璃保障、道路救援，适合多数自驾场景。</p><a>保障详情</a></article>
            <article><h4>尊享无忧套餐 <strong>¥120/天</strong></h4><p>包含安心保障全部内容，并增加车上人员险与优先客服。</p><a>保障详情</a></article>
          </div>

          <div class="info-grid">
            <article><h3>取车信息</h3><p>杭州萧山国际机场店<br>萧山区迎宾大道 600 号，T3 航站楼停车场内</p><b>2025-06-01 周日 10:00</b></article>
            <article><h3>还车信息</h3><p>杭州萧山国际机场店<br>萧山区迎宾大道 600 号，T3 航站楼停车场内</p><b>2025-06-03 周二 10:00</b></article>
          </div>
        </main>

        <aside class="order-panel">
          <div class="order-head"><h3>订单概览</h3><button @click="switchView('home')">修改行程</button></div>
          <div class="timeline">
            <p><i></i><span>取车</span><b>杭州萧山国际机场店<br>6月01日 周日 10:00</b></p>
            <p><i></i><span>还车</span><b>杭州萧山国际机场店<br>6月03日 周二 10:00</b></p>
          </div>
          <div class="cost-list">
            <p><span>租期</span><b>2 天</b></p>
            <p><span>乘车人数</span><b>2 人</b></p>
            <p><span>车辆租金</span><b>¥{{ activeCar.price * rentalDays }}</b></p>
            <p><span>安心保障套餐</span><b>¥{{ protectionFee }}</b></p>
            <p><span>手续费</span><b>¥{{ serviceFee }}</b></p>
          </div>
          <div class="price-compare">
            <h4>价格对比</h4>
            <p><span>PlanGo</span><b>¥{{ totalPrice }}</b></p>
            <p><span>一嗨租车</span><b>¥{{ totalPrice + 10 }}</b></p>
            <p><span>神州租车</span><b>¥{{ totalPrice + 17 }}</b></p>
          </div>
          <div class="final-price"><span>预估总价</span><strong>¥{{ totalPrice }}</strong><small>价格已包含税费及手续费</small></div>
          <button class="book-button">立即预订</button>
          <button class="compare-button">加入对比</button>
          <em><el-icon><Check /></el-icon>现在预订可免费取消</em>
        </aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rental-page{flex:1;background:#f5f8fc;color:#0e1f3b;padding-bottom:58px}.hero-section{position:relative;min-height:332px;overflow:hidden;background:#eaf5ff}.hero-bg{position:absolute;inset:0;background:radial-gradient(circle at 72% 0%,rgba(255,255,255,.95),transparent 28%),linear-gradient(180deg,#e8f5ff 0%,#f8fcff 72%,#fff 100%)}.hero-bg:after{content:"";position:absolute;left:-4%;right:-4%;bottom:-68px;height:156px;border-radius:50% 50% 0 0;background:linear-gradient(10deg,#d7ecd1 0 35%,#f7fbff 36% 62%,#dcefff 63%)}.hero-grid{position:relative;z-index:1;min-height:332px;display:grid;grid-template-columns:minmax(0,1fr) 520px;gap:48px;align-items:start;padding-top:42px}.eyebrow{display:inline-flex;margin-bottom:12px;color:#0f6bff;font-size:12px;font-weight:900;letter-spacing:1.5px}.hero-copy h1{margin:0;color:#0b1b37;font-size:48px;line-height:1.08;font-weight:900;letter-spacing:0}.hero-copy p{width:min(560px,100%);margin:16px 0 24px;color:#415270;font-size:18px;line-height:1.7}.hero-metrics{display:flex;gap:14px}.hero-metrics article{min-width:132px;padding:14px 18px;border:1px solid rgba(205,219,239,.95);border-radius:8px;background:rgba(255,255,255,.78);box-shadow:0 16px 42px rgba(35,91,150,.08)}.hero-metrics strong{display:block;color:#0f6bff;font-size:24px;line-height:1}.hero-metrics span{display:block;margin-top:7px;color:#61708a}.hero-stage{position:relative;height:270px}.flight-mark{position:absolute;left:38px;top:20px;width:58px;height:28px;transform:rotate(13deg)}.flight-mark:before{content:"";position:absolute;inset:12px 0 8px;background:#5790d7;border-radius:999px}.flight-mark:after{content:"";position:absolute;left:22px;top:0;width:12px;height:28px;background:#5790d7;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%)}.city-line{position:absolute;right:18px;bottom:70px;width:350px;height:150px;opacity:.32;background:linear-gradient(90deg,transparent,#77acd9 10% 14%,transparent 15% 23%,#5e9bd1 24% 30%,transparent 31% 41%,#8dbce1 42% 47%,transparent 48% 55%,#6fa9d5 56% 62%,transparent 63%)}.road-line{position:absolute;right:0;left:40px;bottom:40px;height:14px;border-top:2px solid rgba(63,108,151,.2);border-bottom:1px solid rgba(63,108,151,.12)}.vehicle-render{position:relative;width:224px;height:84px}.vehicle-render:before{content:"";position:absolute;left:18px;right:18px;bottom:22px;height:44px;border-radius:54px 58px 16px 16px;background:linear-gradient(180deg,#fff,#e9eef5);border:1px solid #d7e0ec;box-shadow:0 20px 34px rgba(14,31,59,.18)}.vehicle-render:after{content:"";position:absolute;left:70px;right:68px;bottom:60px;height:36px;border-radius:50px 50px 0 0;background:linear-gradient(180deg,#eaf5ff,#cbdff2);border:1px solid #cbd9e8;border-bottom:0}.vehicle-render i:before,.vehicle-render i:after{content:"";position:absolute;bottom:6px;width:38px;height:38px;border-radius:50%;background:#182334;border:9px solid #d6deea;z-index:2}.vehicle-render i:before{left:46px}.vehicle-render i:after{right:46px}.vehicle-xl{position:absolute;right:16px;bottom:42px;width:390px;height:144px}.vehicle-xl:before{height:62px;bottom:28px;border-radius:80px 84px 20px 20px}.vehicle-xl:after{left:118px;right:116px;bottom:88px;height:56px}.vehicle-xl i:before,.vehicle-xl i:after{width:54px;height:54px;bottom:2px;border-width:11px}.vehicle-xl i:before{left:70px}.vehicle-xl i:after{right:70px}.vehicle-blue:before{background:linear-gradient(180deg,#2c91ff,#096be4);border-color:#0869d8}.vehicle-blue:after{background:linear-gradient(180deg,#e7f4ff,#b9dbf6);border-color:#0869d8}.tone-white .vehicle-render:before,.tone-white.vehicle-render:before{background:linear-gradient(180deg,#fff,#f1f5f9)}.tone-silver .vehicle-render:before,.tone-silver.vehicle-render:before{background:linear-gradient(180deg,#fefefe,#e4e9ef)}.tone-pearl .vehicle-render:before,.tone-pearl.vehicle-render:before{background:linear-gradient(180deg,#fff,#edf4f9)}.tone-graphite .vehicle-render:before,.tone-graphite.vehicle-render:before{background:linear-gradient(180deg,#f7fafc,#cbd5e1)}.tone-black .vehicle-render:before,.tone-black.vehicle-render:before{background:linear-gradient(180deg,#3a4657,#141b27);border-color:#2a3545}.search-panel{position:relative;z-index:2;margin-top:-44px;padding:22px 28px;border:1px solid #dbe6f3;border-radius:8px;background:rgba(255,255,255,.96);box-shadow:0 22px 60px rgba(30,73,126,.12)}.search-top{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e6edf6;padding-bottom:14px;margin-bottom:20px}.search-tabs{display:flex;gap:34px}.search-tabs button{border:0;background:transparent;color:#1d3554;font-weight:900;font-size:17px;cursor:pointer}.search-tabs button.active{color:#0f6bff}.checkline{color:#34455f}.search-grid{display:grid;grid-template-columns:1.2fr 1.6fr 1.6fr 1fr;gap:16px 18px}.search-grid span{display:block;margin-bottom:8px;color:#677790;font-size:13px}.search-grid b{height:52px;display:flex;align-items:center;gap:8px;border:1px solid #dce6f2;border-radius:8px;background:#fff;padding:0 14px;color:#071936;font-size:18px}.primary-action{grid-column:4;grid-row:2;height:64px;border:0;border-radius:8px;background:#1169f5;color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 16px 30px rgba(17,105,245,.22)}.landing-content{padding-top:28px}.promise-row{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.promise-row article{display:flex;gap:16px;align-items:center;padding:18px 22px;border:1px solid #dfe8f5;border-radius:8px;background:#fff;box-shadow:0 14px 38px rgba(24,64,113,.07)}.promise-row .el-icon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#eef5ff;color:#0f6bff;font-size:27px}.promise-row b{display:block;font-size:17px}.promise-row span{display:block;margin-top:4px;color:#65758e}.section-head{display:flex;align-items:end;justify-content:space-between;margin:28px 0 16px}.section-head h2,.process-band h2{margin:0;color:#0b1b37;font-size:24px}.section-head p{margin:6px 0 0;color:#65758e}.section-head button{border:1px solid #cfe0f5;border-radius:8px;background:#fff;color:#0f6bff;font-weight:800;padding:10px 16px;cursor:pointer}.featured-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.featured-card{overflow:hidden;border:1px solid #dfe8f5;border-radius:8px;background:#fff;box-shadow:0 14px 38px rgba(24,64,113,.07);cursor:pointer;transition:.2s}.featured-card:hover{transform:translateY(-3px);box-shadow:0 22px 50px rgba(24,64,113,.12)}.featured-visual{height:148px;display:grid;place-items:center;background:linear-gradient(135deg,#f8fbff,#e9f2ff)}.featured-info{padding:16px}.featured-info span,.quote-badge,.detail-copy>span,.package-grid em{display:inline-flex;border-radius:4px;background:#e8f2ff;color:#0f6bff;padding:4px 8px;font-size:12px;font-weight:900;font-style:normal}.featured-info h3{margin:10px 0 8px;font-size:19px}.featured-info p{height:44px;margin:0;color:#65758e;line-height:1.6}.featured-info div{margin-top:12px}.featured-info b{color:#ff6b00;font-size:25px}.featured-info small{color:#66758b}.process-band{margin-top:30px;text-align:center}.process-steps{display:grid;grid-template-columns:1fr 80px 1fr 80px 1fr 80px 1fr;align-items:center;margin-top:16px}.process-steps article{display:grid;gap:6px}.process-steps span{margin:auto;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#e8f2ff;color:#0f6bff;font-weight:900}.process-steps b{font-size:18px}.process-steps small{color:#65758e}.process-steps i{border-top:2px dashed #8dbaff}.page-view{padding-top:28px}.summary-card{display:grid;grid-template-columns:1.25fr 1.25fr 1.3fr 1.3fr .6fr .6fr 150px;gap:0;align-items:center;padding:18px 22px;border:1px solid #dbe6f3;border-radius:8px;background:#fff;box-shadow:0 16px 42px rgba(24,64,113,.08)}.summary-card article{padding:0 20px;border-right:1px solid #e5edf6}.summary-card span{display:block;color:#6b7b93;font-size:13px;margin-bottom:7px}.summary-card b{font-size:15px}.summary-card button,.toolbar-row button,.quote-price button,.back-button,.order-head button,.book-button,.compare-button{border:1px solid #0f6bff;border-radius:8px;background:#fff;color:#0f6bff;font-weight:900;cursor:pointer}.summary-card button{height:46px}.toolbar-row{display:flex;justify-content:space-between;gap:18px;margin:24px 0 14px}.category-tabs,.sort-tabs{display:flex;gap:12px;flex-wrap:wrap}.category-tabs button,.sort-tabs button{height:40px;padding:0 18px;border-color:#d7e3f1;color:#213650}.category-tabs button.active,.sort-tabs button.active{background:#0f6bff;border-color:#0f6bff;color:#fff}.results-layout{display:grid;grid-template-columns:minmax(0,1fr) 342px;gap:24px}.quote-list{display:grid;gap:10px}.quote-card{position:relative;display:grid;grid-template-columns:255px 1fr 150px;gap:24px;align-items:center;padding:20px 26px;border:1px solid #dfe8f5;border-radius:8px;background:#fff;box-shadow:0 14px 36px rgba(24,64,113,.06);cursor:pointer}.quote-card.selected{border-color:#0f6bff;box-shadow:0 18px 44px rgba(15,107,255,.13)}.quote-badge{position:absolute;left:18px;top:16px;background:#5ecf7a;color:#fff}.quote-visual{height:132px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,#f8fbff,#e8f1ff)}.quote-main h3{margin:0 0 8px;font-size:26px}.quote-main p{margin:0 0 12px;color:#64748b}.spec-line,.rating-line,.service-tags{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.spec-line span{display:inline-flex;align-items:center;gap:5px;color:#34465f}.rating-line{margin:10px 0;color:#ff6b00;font-weight:900}.rating-line em{font-style:normal;color:#65758e;font-weight:500}.service-tags span{padding:6px 10px;border-radius:6px;background:#f0f5fb;color:#56677f;font-size:13px}.quote-price{text-align:center}.quote-price small{display:block;color:#64748b}.quote-price strong{color:#ff6b00;font-size:32px}.quote-price>span{color:#64748b}.quote-price button{display:block;width:126px;height:42px;margin:12px auto 8px;background:#0f6bff;color:#fff}.quote-price a{color:#0f6bff;font-size:13px}.trip-aside{display:grid;gap:16px;align-content:start}.map-panel{position:relative;height:218px;overflow:hidden;border:1px solid #dfe8f5;border-radius:8px;background:#eef7ff;box-shadow:0 14px 36px rgba(24,64,113,.06)}.map-grid{position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,107,255,.06) 1px,transparent 1px),linear-gradient(rgba(15,107,255,.06) 1px,transparent 1px),radial-gradient(circle at 78% 18%,#c9e6ff,transparent 20%),radial-gradient(circle at 18% 80%,#d5f0e0,transparent 24%);background-size:34px 34px,34px 34px,auto,auto}.map-panel b{position:absolute;padding:8px 12px;border-radius:20px;background:#fff;color:#12304f;font-size:13px;box-shadow:0 10px 25px rgba(30,73,126,.12)}.pin-start{left:46px;top:28px}.pin-end{right:24px;bottom:32px}.map-panel i{position:absolute;left:92px;top:72px;width:150px;height:88px;border-right:5px dotted #0f6bff;border-bottom:5px dotted #0f6bff;border-radius:0 0 52px 0}.aside-card{padding:22px;border:1px solid #dfe8f5;border-radius:8px;background:#fff;box-shadow:0 14px 36px rgba(24,64,113,.06)}.aside-card h3{margin:0 0 18px}.aside-card p{display:flex;justify-content:space-between;gap:18px;margin:14px 0;color:#65758e}.aside-card b{text-align:right;color:#152744}.include-card div{display:grid;grid-template-columns:1fr 1fr;gap:18px}.include-card span{display:flex;align-items:center;gap:8px;color:#263b58}.include-card .el-icon{color:#0f6bff}.back-button{display:flex;align-items:center;gap:6px;margin-bottom:16px;border:0;color:#213650;background:transparent}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 365px;gap:24px}.detail-content{padding:24px;border:1px solid #dfe8f5;border-radius:8px;background:#fff;box-shadow:0 14px 38px rgba(24,64,113,.07)}.detail-hero-card{display:grid;grid-template-columns:1fr 1.35fr;min-height:290px;overflow:hidden;border-radius:8px;background:linear-gradient(120deg,#fff 10%,#eef7ff 62%,#ddf0ff)}.detail-copy{padding:28px}.detail-copy h2{margin:14px 0 10px;font-size:42px;line-height:1.08}.detail-copy p{margin:0 0 18px;color:#53647c;font-size:17px;line-height:1.7}.detail-copy b{display:flex;align-items:center;gap:6px;color:#ff6b00}.detail-specs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.detail-specs span{display:flex;align-items:center;gap:6px;color:#263b58}.detail-stage{position:relative}.detail-stage .vehicle-xl{right:26px;bottom:52px}.gallery-row{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:16px 0}.gallery-row span{position:relative;height:78px;display:grid;place-items:center;overflow:hidden;border:1px solid #dfe8f5;border-radius:8px;background:#f8fbff}.gallery-row span.active{border:2px solid #0f6bff}.gallery-row b{position:absolute;right:8px;bottom:6px;color:#64748b;font-size:12px}.vehicle-thumb{transform:scale(.58)}.feature-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #dfe8f5;border-radius:8px}.feature-grid article{display:grid;grid-template-columns:42px 1fr;gap:3px 10px;padding:16px 18px;border-right:1px solid #e7edf5}.feature-grid article:last-child{border-right:0}.feature-grid .el-icon{grid-row:span 2;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#eef5ff;color:#0f6bff;font-size:24px}.feature-grid span{color:#65758e}.block-title{margin:22px 0 12px}.package-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.package-grid article{padding:18px;border:1px solid #dfe8f5;border-radius:8px;background:#fff}.package-grid article.picked{border-color:#0f6bff;box-shadow:0 14px 34px rgba(15,107,255,.12)}.package-grid h4{display:flex;align-items:center;gap:8px;margin:0 0 12px}.package-grid strong{margin-left:auto;color:#0f6bff}.package-grid p{margin:0;color:#5f6f88;line-height:1.7}.package-grid a{display:inline-block;margin-top:12px;color:#0f6bff;font-weight:800}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}.info-grid article{padding:18px;border:1px solid #dfe8f5;border-radius:8px;background:#fbfdff}.info-grid h3{margin:0 0 10px}.info-grid p{color:#5f6f88;line-height:1.7}.info-grid b{font-size:18px}.order-panel{position:sticky;top:96px;align-self:start;padding:24px;border:1px solid #dfe8f5;border-radius:8px;background:#fff;box-shadow:0 14px 38px rgba(24,64,113,.08)}.order-head{display:flex;align-items:center;justify-content:space-between}.order-head h3{margin:0}.order-head button{border:0}.timeline{margin:20px 0;padding-bottom:16px;border-bottom:1px solid #e4ecf5}.timeline p{display:grid;grid-template-columns:16px 42px 1fr;gap:10px;margin:0 0 18px}.timeline i{width:12px;height:12px;margin-top:5px;border-radius:50%;background:#0f6bff}.timeline p:last-child i{background:#b8c4d3}.timeline span{color:#65758e}.timeline b{line-height:1.7}.cost-list{padding-bottom:16px;border-bottom:1px solid #e4ecf5}.cost-list p,.price-compare p{display:flex;justify-content:space-between;margin:11px 0;color:#65758e}.cost-list b,.price-compare b{color:#152744}.price-compare{padding:16px 0;border-bottom:1px solid #e4ecf5}.price-compare h4{margin:0 0 10px}.price-compare p:first-of-type{padding:8px 10px;border:1px solid #dfe8f5;border-radius:6px;background:#fbfdff}.price-compare p:first-of-type b{color:#ff6b00}.final-price{padding:16px 0;text-align:right}.final-price span,.final-price small{display:block;color:#65758e}.final-price strong{display:block;color:#ff6b00;font-size:40px;line-height:1.1}.book-button,.compare-button{width:100%;height:48px;margin-top:12px}.book-button{background:#0f6bff;color:#fff}.compare-button{background:#fff;color:#0f6bff}.order-panel em{display:flex;justify-content:center;gap:6px;margin-top:18px;color:#18b56a;font-style:normal;font-weight:900}@media(max-width:1180px){.hero-grid,.results-layout,.detail-layout{grid-template-columns:1fr}.hero-stage{display:none}.summary-card,.search-grid,.promise-row,.featured-grid{grid-template-columns:1fr 1fr}.primary-action{grid-column:auto;grid-row:auto}.order-panel{position:static}.quote-card{grid-template-columns:220px 1fr}.quote-price{grid-column:1/-1;text-align:left}.quote-price button{margin-left:0}.trip-aside{grid-template-columns:1fr 1fr}.map-panel{grid-column:1/-1}}@media(max-width:760px){.hero-copy h1{font-size:36px}.hero-grid{padding-top:28px}.hero-metrics,.search-top,.toolbar-row{flex-direction:column;align-items:flex-start}.search-grid,.promise-row,.featured-grid,.summary-card,.quote-card,.trip-aside,.detail-hero-card,.gallery-row,.feature-grid,.package-grid,.info-grid{grid-template-columns:1fr}.summary-card article{border-right:0;border-bottom:1px solid #e5edf6;padding:12px 0}.process-steps{grid-template-columns:1fr;gap:14px}.process-steps i{display:none}.detail-stage{min-height:210px}.feature-grid article{border-right:0;border-bottom:1px solid #e7edf5}.feature-grid article:last-child{border-bottom:0}}
</style>
