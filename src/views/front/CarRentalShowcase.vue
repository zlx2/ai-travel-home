<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Calendar, Check, Headset, Location, Money, Search, StarFilled, Suitcase, Switch, User, Van } from '@element-plus/icons-vue'

type Car = { id:number; name:string; type:string; badge:string; price:number; score:string; reviews:number; seats:number; bags:number; energy:string; gearbox:string; desc:string }
const mode = ref<'home'|'results'|'detail'>('home')
const activeType = ref('全部')
const activeCarId = ref(4)
const types = ['全部','经济型','舒适型','SUV','新能源','商务型']
const cars:Car[] = [
  { id:1,name:'大众 朗逸',type:'经济型',badge:'经济型',price:168,score:'4.8',reviews:126,seats:5,bags:2,energy:'汽油',gearbox:'自动挡',desc:'经济省油，适合城市出行' },
  { id:2,name:'丰田 凯美瑞',type:'舒适型',badge:'舒适型',price:268,score:'4.9',reviews:215,seats:5,bags:3,energy:'汽油',gearbox:'自动挡',desc:'舒适稳重，商务出行优选' },
  { id:3,name:'本田 CR-V',type:'SUV',badge:'SUV',price:358,score:'4.8',reviews:182,seats:5,bags:3,energy:'汽油',gearbox:'自动挡',desc:'空间宽敞，家庭出游优选' },
  { id:4,name:'特斯拉 Model 3',type:'新能源',badge:'新能源',price:358,score:'4.9',reviews:97,seats:5,bags:2,energy:'纯电',gearbox:'自动挡',desc:'智能电动，极致舒适' },
  { id:5,name:'奥迪 Q5L',type:'SUV',badge:'商务型',price:598,score:'4.9',reviews:88,seats:5,bags:3,energy:'汽油',gearbox:'自动挡',desc:'豪华操控，品质之选' },
]
const filteredCars = computed(() => activeType.value === '全部' ? cars : cars.filter(car => car.type === activeType.value || car.badge === activeType.value))
const activeCar = computed(() => cars.find(car => car.id === activeCarId.value) || cars[0])
const go = (next:'home'|'results'|'detail', id?:number) => {
  if (id) activeCarId.value = id
  mode.value = next
  setTimeout(() => document.querySelector(`.${next}-view`)?.scrollIntoView({ behavior:'smooth', block:'start' }), 20)
}
</script>

<template>
  <div class="rental-page">
    <section v-if="mode==='home'" class="rental-hero">
      <div class="container hero-inner">
        <div class="hero-copy">
          <h1>轻松租车，自在出行</h1>
          <p>多样车型，灵活取还，开启每一段美好旅程</p>
          <div class="hero-promises">
            <span><el-icon><Money /></el-icon><b>价格透明</b><small>无隐藏费用</small></span>
            <span><el-icon><Check /></el-icon><b>免费取消</b><small>灵活无忧</small></span>
            <span><el-icon><Headset /></el-icon><b>24h 专属服务</b><small>全天候支持</small></span>
          </div>
        </div>
        <div class="hero-visual"><div class="plane">✈</div><div class="skyline"></div><div class="car blue"><i></i></div></div>
      </div>
    </section>

    <section v-if="mode==='home'" class="container search-card">
      <div class="tabs"><button class="active">国内租车</button><button>海外租车</button><label><input type="checkbox"> 异地还车</label></div>
      <div class="search-grid">
        <label><span>取车城市</span><b><el-icon><Location /></el-icon>上海</b></label>
        <label><span>取车地点</span><b><el-icon><Location /></el-icon>虹桥机场 T2 航站楼</b></label>
        <label><span>还车地点</span><b><el-icon><Location /></el-icon>与取车地点相同</b></label>
        <label><span>取车时间</span><b><el-icon><Calendar /></el-icon>2025-06-01 周日</b></label>
        <label><span>还车时间</span><b><el-icon><Calendar /></el-icon>2025-06-03 周二</b></label>
        <label><span>乘车人数</span><b><el-icon><User /></el-icon>2 人</b></label>
        <label><span>车型类型</span><b><el-icon><Van /></el-icon>不限车型</b></label>
        <button class="search-button" @click="go('results')"><el-icon><Search /></el-icon>搜索车辆</button>
      </div>
    </section>

    <section v-if="mode==='home'" class="container home-view">
      <div class="service-row">
        <article><el-icon><Money /></el-icon><b>价格透明</b><span>明码标价，无隐形消费</span></article>
        <article><el-icon><Check /></el-icon><b>灵活取消</b><span>免费取消，行程更灵活</span></article>
        <article><el-icon><Location /></el-icon><b>多网点取还</b><span>全国覆盖，随心取还</span></article>
        <article><el-icon><Headset /></el-icon><b>24h 专属服务</b><span>全天候在线支持</span></article>
      </div>
      <h2>热门车型推荐</h2>
      <div class="featured-cars">
        <article v-for="car in cars.slice(0,4)" :key="car.id" class="mini-car" @click="go('detail',car.id)">
          <div class="mini-visual"><div class="car small"><i></i></div></div>
          <div><h3>{{ car.name }}</h3><p>{{ car.gearbox }}　{{ car.seats }}座　{{ car.badge }}</p><strong>¥{{ car.price }} <small>/天起</small></strong></div>
        </article>
      </div>
      <div class="why-plan"><h2>为什么选择 PlanGo</h2><div><span>📍<b>全国覆盖</b><small>200+ 城市 · 2000+ 网点</small></span><i></i><span>📅<b>易预订</b><small>快速预订 · 即时确认</small></span><i></i><span>🚙<b>优质车源</b><small>严选车辆 · 安全可靠</small></span><i></i><span>🛡<b>安心保障</b><small>多重保障 · 行程无忧</small></span></div></div>
    </section>

    <section v-if="mode==='results'" class="container results-view">
      <div class="summary-bar">
        <span><small>取车地点</small><b>上海虹桥机场 T2 航站楼</b></span><span><small>还车地点</small><b>杭州萧山国际机场</b></span><span><small>取车时间</small><b>2025-06-01 周日 10:00</b></span><span><small>还车时间</small><b>2025-06-03 周二 10:00</b></span><button @click="go('home')">修改搜索</button>
      </div>
      <div class="filter-row">
        <button v-for="type in types" :key="type" :class="{active:activeType===type}" @click="activeType=type">{{ type }}</button>
        <span>共 {{ filteredCars.length }} 款车型</span>
      </div>
      <div class="results-layout">
        <div class="car-list">
          <article v-for="car in filteredCars" :key="car.id" class="result-card" :class="{selected:car.id===activeCarId}" @click="activeCarId=car.id">
            <span class="badge">{{ car.badge }}</span><div class="result-visual"><div class="car"><i></i></div></div>
            <div class="result-info"><h3>{{ car.name }}</h3><p><el-icon><User /></el-icon>{{ car.seats }} 座 <el-icon><Suitcase /></el-icon>{{ car.bags }} 行李箱 <el-icon><Switch /></el-icon>{{ car.gearbox }}　{{ car.energy }}</p><p class="score"><el-icon><StarFilled /></el-icon>{{ car.score }}分　{{ car.reviews }} 条评价</p><div><span>免费取消</span><span>基础保险</span><span>24h 道路救援</span></div></div>
            <div class="result-price"><small>单价低至</small><strong>¥{{ car.price }}</strong><span>/天起</span><button @click.stop="go('detail',car.id)">查看详情</button></div>
          </article>
        </div>
        <aside class="side-panel"><div class="map-card"><b>上海虹桥机场 T2 航站楼</b><i></i><strong>杭州萧山国际机场</strong></div><div class="overview-card"><h3>行程概览</h3><p><span>取车</span><b>2025-06-01 周日 10:00<br>上海虹桥机场 T2 航站楼</b></p><p><span>还车</span><b>2025-06-03 周二 10:00<br>杭州萧山国际机场</b></p><p><span>行程时长</span><b>2 天</b></p><p><span>乘车人数</span><b>2 人</b></p><p><span>预计里程</span><b>约 200 公里</b></p></div><div class="include-card"><h3>费用包含</h3><div><span><el-icon><Check /></el-icon>基础保险</span><span><el-icon><Headset /></el-icon>24h 道路救援</span><span><el-icon><Van /></el-icon>车辆清洁</span><span><el-icon><Money /></el-icon>不限里程</span></div></div></aside>
      </div>
    </section>

    <section v-if="mode==='detail'" class="container detail-view">
      <button class="back-link" @click="go('results')"><el-icon><ArrowLeft /></el-icon>返回搜索结果</button>
      <div class="detail-layout">
        <main class="detail-main">
          <section class="detail-hero"><div class="detail-copy"><span>{{ activeCar.badge }}</span><h2>{{ activeCar.name }}</h2><p>{{ activeCar.desc }} · 自动驾驶辅助</p><b><el-icon><StarFilled /></el-icon>{{ activeCar.score }} 分　980+ 评价</b></div><div class="detail-car"><div class="skyline"></div><div class="car large"><i></i></div></div></section>
          <div class="thumb-row"><span v-for="n in 6" :key="n" :class="{active:n===1}"><div class="car tiny"><i></i></div></span></div>
          <div class="feature-row"><article><b>超长续航</b><span>554km CLTC</span></article><article><b>智能驾驶辅助</b><span>Autopilot</span></article><article><b>大屏交互</b><span>15 英寸中控屏</span></article><article><b>极速充电</b><span>超充网络</span></article></div>
          <h3 class="block-title">租车方案</h3>
          <div class="plans"><article><h4>基础保险 <em>已包含</em></h4><p>基础险、第三者责任险、7×24 小时客服支持</p></article><article class="picked"><h4>安心保障套餐 <em>推荐</em><strong>¥60/天</strong></h4><p>车辆损失险、轮胎玻璃保障、道路救援</p></article><article><h4>尊享无忧套餐 <strong>¥120/天</strong></h4><p>安心保障全内容、车上人员险、优先客服支持</p></article></div>
          <div class="notice-grid"><article><h3>费用包含</h3><p>车辆租金　基础保险　24h 道路救援　增值税/手续费</p></article><article><h3>温馨提示</h3><p>取车时请携带本人有效身份证、驾驶证及信用卡。里程限制为 200 公里/天。</p></article></div>
        </main>
        <aside class="order-panel"><h3>订单概览</h3><p><span>取车</span><b>杭州萧山国际机场店<br>6月01日 周日 10:00</b></p><p><span>还车</span><b>杭州萧山国际机场店<br>6月03日 周二 10:00</b></p><div class="costs"><p><span>租期</span><b>2 天</b></p><p><span>乘车人数</span><b>2 人</b></p><p><span>车辆租金</span><b>¥{{ activeCar.price * 2 }}</b></p><p><span>安心保障套餐</span><b>¥120</b></p><p><span>手续费</span><b>¥30</b></p></div><div class="total"><span>预估总价</span><strong>¥{{ activeCar.price * 2 + 150 }}</strong><small>价格已包含税费及手续费</small></div><button>立即预订</button><button class="ghost">加入对比</button><em><el-icon><Check /></el-icon>现在预订可免费取消</em></aside>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rental-page{flex:1;background:#f6f9fe;color:#0f1f3d;padding-bottom:52px}.rental-hero{min-height:330px;overflow:hidden;background:linear-gradient(180deg,#e5f3ff,#fbfdff 70%,#fff);position:relative}.rental-hero:after{content:"";position:absolute;left:-5%;right:-5%;bottom:-60px;height:150px;background:linear-gradient(12deg,#cae5b8,#f8fbff 52%,#dceeff);border-radius:50% 50% 0 0}.hero-inner{position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;align-items:start;min-height:330px;padding-top:44px}.hero-copy h1{font-size:46px;line-height:1.1;margin:0 0 12px;font-weight:900}.hero-copy p{margin:0 0 22px;color:#44546e;font-size:18px}.hero-promises{display:flex;gap:18px}.hero-promises span,.service-row article,.search-card,.summary-bar,.result-card,.side-panel>div,.detail-main,.order-panel,.plans article,.notice-grid article{background:rgba(255,255,255,.94);border:1px solid #dfe8f5;box-shadow:0 16px 45px rgba(30,72,128,.08)}.hero-promises span{display:grid;grid-template-columns:38px 1fr;gap:2px 12px;align-items:center;border-radius:8px;padding:14px 20px;min-width:162px}.hero-promises .el-icon{grid-row:span 2;color:#0f6bff;font-size:28px}.hero-promises small{color:#6c7b91}.hero-visual{position:relative;height:260px}.plane{position:absolute;left:8%;top:20px;color:#5d90d7;font-size:42px;transform:rotate(12deg)}.skyline{position:absolute;right:0;bottom:54px;width:370px;height:160px;opacity:.42;background:linear-gradient(90deg,transparent,#8ebce8 8% 10%,transparent 11% 18%,#5f9ad4 19% 24%,transparent 25% 33%,#7fb0dc 34% 39%,transparent 40%)}.car{position:relative;width:220px;height:78px;margin:auto}.hero-visual .car{position:absolute;right:70px;bottom:34px;width:360px;height:132px}.car:before{content:"";position:absolute;left:18px;right:18px;bottom:20px;height:45px;background:#fff;border:3px solid #d9e2ef;border-radius:56px 60px 18px 18px;box-shadow:0 16px 32px rgba(20,45,78,.18)}.car:after{content:"";position:absolute;left:72px;right:72px;bottom:56px;height:40px;background:#eaf4ff;border:3px solid #d9e2ef;border-bottom:0;border-radius:58px 58px 0 0}.car i:before,.car i:after{content:"";position:absolute;bottom:4px;width:36px;height:36px;border-radius:50%;background:#1b2534;border:8px solid #cfd8e5;z-index:2}.car i:before{left:48px}.car i:after{right:48px}.car.blue:before{background:linear-gradient(180deg,#2084ff,#0767df);border-color:#0a63d6}.car.blue:after{background:#dcefff;border-color:#0a63d6}.car.small{width:150px;transform:scale(.75)}.car.large{width:430px;height:150px;position:absolute;right:40px;bottom:34px}.car.tiny{width:110px;transform:scale(.6)}.search-card{position:relative;margin-top:-48px;border-radius:18px;padding:20px 28px;z-index:2}.tabs{display:flex;align-items:center;gap:34px;border-bottom:1px solid #e7edf5;padding-bottom:14px;margin-bottom:18px}.tabs button{border:0;background:transparent;font-weight:800;color:#253855;cursor:pointer}.tabs button.active{color:#0f6bff}.tabs label{margin-left:auto;color:#43536b}.search-grid{display:grid;grid-template-columns:1.2fr 1.6fr 1.6fr 1fr;gap:16px}.search-grid label span{display:block;color:#65758e;font-size:13px;margin-bottom:8px}.search-grid b{height:44px;border:1px solid #dfe7f2;border-radius:8px;display:flex;align-items:center;gap:8px;padding:0 13px;background:#fff}.search-button{grid-column:4;grid-row:2;height:50px;border:0;border-radius:8px;background:#0f6bff;color:#fff;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.home-view{padding-top:22px}.results-view,.detail-view{padding-top:28px}.service-row{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:20px}.service-row article{border-radius:8px;padding:16px 22px;display:grid;grid-template-columns:46px 1fr;gap:2px 14px}.service-row .el-icon{grid-row:span 2;width:46px;height:46px;border-radius:50%;background:#eef5ff;color:#0f6bff;font-size:26px}.service-row span,.mini-car p,.why-plan small{color:#6b7890}.home-view h2{margin:0 0 16px;font-size:24px}.featured-cars{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.mini-car{display:grid;grid-template-columns:145px 1fr;gap:12px;background:#fff;border:1px solid #dfe8f5;border-radius:8px;padding:14px;cursor:pointer}.mini-visual{display:grid;place-items:center;border-radius:8px;background:linear-gradient(135deg,#f8fbff,#e8f1ff)}.mini-car h3{margin:4px 0 8px;font-size:17px}.mini-car strong{color:#ff6b00;font-size:22px}.mini-car small{color:#6a7688;font-size:12px}.why-plan{margin-top:18px;text-align:center;padding:16px 0 8px}.why-plan>div{display:grid;grid-template-columns:1fr 120px 1fr 120px 1fr 120px 1fr;align-items:center}.why-plan span{display:flex;flex-direction:column;gap:4px;font-size:42px}.why-plan b{font-size:17px}.why-plan i{border-top:3px dashed #8bb8ff}.summary-bar{border-radius:12px;padding:18px 26px;display:grid;grid-template-columns:repeat(4,1fr) 150px;gap:18px;align-items:center}.summary-bar small{display:block;color:#738198;margin-bottom:8px}.summary-bar button,.filter-row button,.result-price button,.order-panel button,.back-link{border:1px solid #0f6bff;background:#fff;color:#0f6bff;border-radius:8px;font-weight:800;cursor:pointer}.summary-bar button{height:46px}.filter-row{display:flex;align-items:center;gap:16px;margin:22px 0 14px}.filter-row button{border-color:#d9e3f1;color:#243955;min-width:90px;height:40px}.filter-row button.active{background:#0f6bff;color:#fff;border-color:#0f6bff}.filter-row>span{margin-left:auto;color:#5f6f88}.results-layout{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:24px}.car-list{display:grid;gap:8px}.result-card{position:relative;border-radius:8px;padding:20px 28px;display:grid;grid-template-columns:250px 1fr 150px;gap:22px;align-items:center;cursor:pointer}.result-card.selected{border-color:#0f6bff;box-shadow:0 14px 42px rgba(15,107,255,.16)}.badge{position:absolute;left:20px;top:16px;background:#5fcf7b;color:#fff;border-radius:4px;padding:4px 9px;font-weight:800;font-size:13px}.result-visual{height:130px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,#f8fbff,#e8f1ff)}.result-info h3{font-size:26px;margin:0 0 12px}.result-info p{display:flex;align-items:center;gap:7px;color:#334966}.score{color:#ff6b00!important}.result-info div{display:flex;gap:10px}.result-info span{background:#f1f5fb;border-radius:6px;color:#5d6b81;padding:6px 10px;font-size:13px}.result-price{text-align:center}.result-price small{display:block;color:#6b7890}.result-price strong{color:#ff6b00;font-size:31px}.result-price button{display:block;width:120px;height:40px;background:#0f6bff;color:#fff;margin:10px auto 0}.side-panel{display:grid;gap:16px}.map-card{height:210px;border-radius:8px;padding:28px;background:linear-gradient(135deg,#ecf7ff,#fff)}.map-card b,.map-card strong{display:block;background:#fff;border-radius:20px;padding:8px 12px;width:max-content}.map-card i{display:block;width:170px;height:72px;margin:12px 50px;border-right:5px dotted #0f6bff;border-bottom:5px dotted #0f6bff;border-radius:0 0 45px 0}.overview-card,.include-card{border-radius:8px;padding:22px}.overview-card h3,.include-card h3,.order-panel h3{margin:0 0 18px}.overview-card p,.order-panel p,.costs p{display:flex;justify-content:space-between;gap:18px;color:#66748a}.overview-card b,.order-panel b,.costs b{color:#152744;text-align:right}.include-card div{display:grid;grid-template-columns:1fr 1fr;gap:18px}.include-card span{display:flex;align-items:center;gap:8px;color:#263b58}.include-card .el-icon{color:#0f6bff}.back-link{border:0;display:flex;align-items:center;gap:6px;margin-bottom:14px;color:#23364f}.detail-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px}.detail-main{border-radius:8px;padding:28px}.detail-hero{height:250px;border-radius:8px;overflow:hidden;background:linear-gradient(120deg,#fff 5%,#eef7ff 55%,#dff1ff);display:grid;grid-template-columns:1fr 1.5fr;align-items:center}.detail-copy{padding-left:28px}.detail-copy span,.plans em{background:#5bd47b;color:#fff;border-radius:4px;padding:5px 10px;font-style:normal;font-weight:800}.detail-copy h2{font-size:40px;margin:14px 0 10px}.detail-copy p{font-size:17px;color:#53637a}.detail-copy b{display:flex;align-items:center;gap:6px;color:#ff6b00}.detail-car{position:relative;height:100%}.thumb-row{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin:16px 0}.thumb-row span{height:72px;border:1px solid #dfe8f5;border-radius:8px;display:grid;place-items:center;background:#f8fbff}.thumb-row span.active{border:2px solid #0f6bff}.feature-row{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #dfe8f5;border-radius:8px}.feature-row article{padding:15px 22px}.feature-row span{display:block;color:#66758b;margin-top:4px}.block-title{margin:20px 0 10px}.plans,.notice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.plans article{border-radius:8px;padding:18px}.plans article.picked{border-color:#0f6bff}.plans h4{margin:0 0 12px;display:flex;align-items:center;gap:8px}.plans strong{margin-left:auto;color:#0f6bff}.plans p,.notice-grid p{color:#53637a;line-height:1.7;margin:0}.notice-grid{grid-template-columns:1fr 1fr;margin-top:14px}.notice-grid article{border-radius:8px;padding:18px}.order-panel{position:sticky;top:96px;border-radius:8px;padding:28px;height:max-content}.costs{border-top:1px solid #e3ebf5;border-bottom:1px solid #e3ebf5;margin:18px 0;padding:12px 0}.total span,.total small{display:block;color:#66758b}.total strong{display:block;text-align:right;color:#ff6b00;font-size:38px}.order-panel button{width:100%;height:48px;background:#0f6bff;color:#fff;margin-top:14px;font-size:18px}.order-panel button.ghost{background:#fff;color:#0f6bff}.order-panel em{display:flex;justify-content:center;gap:6px;color:#18b56a;margin-top:18px;font-style:normal;font-weight:800}@media(max-width:1100px){.hero-inner,.results-layout,.detail-layout{grid-template-columns:1fr}.search-grid,.service-row,.featured-cars,.summary-bar{grid-template-columns:1fr 1fr}.search-button{grid-column:auto;grid-row:auto}.order-panel{position:static}.result-card{grid-template-columns:180px 1fr}.result-price{grid-column:1/-1;text-align:left}.hero-visual{display:none}}@media(max-width:760px){.hero-copy h1{font-size:36px}.hero-promises,.tabs,.filter-row{flex-wrap:wrap}.search-grid,.service-row,.featured-cars,.summary-bar,.result-card,.feature-row,.plans,.notice-grid,.thumb-row{grid-template-columns:1fr}.mini-car{grid-template-columns:1fr}.why-plan>div{grid-template-columns:1fr;gap:14px}.why-plan i{display:none}.detail-hero{grid-template-columns:1fr;height:auto}.detail-car{height:180px}}
</style>
