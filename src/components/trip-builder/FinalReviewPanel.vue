<script setup lang="ts">
import {
  Briefcase,
  Calendar,
  Check,
  CircleCheck,
  Location,
  Lock,
  Message,
  Phone,
  Refresh,
  User,
  Van,
  Wallet,
} from '@element-plus/icons-vue'
import type { BuilderDay, FinalReviewData } from './types'
import { destinationImageFile, homeImage } from '../../utils/homeImages'

const props = defineProps<{ data: FinalReviewData; saving: boolean; orderCreated: boolean; paid: boolean }>()
const emit = defineEmits<{ createOrder: []; sandboxPay: []; back: [] }>()

const destination = () => props.data.requirement.destination || '成都'
const coverImage = () => homeImage(destinationImageFile(destination()), true)
const dayImage = (day: BuilderDay) =>
  day.moments.find(item => item.image)?.image ||
  day.moments.find(item => item.imageUrls?.length)?.imageUrls?.[0] ||
  coverImage()
const dayRoute = (day: BuilderDay) => day.route.slice(0, 3).join(' · ') || day.subtitle || '精选路线'
const dayCost = (day: BuilderDay) => day.budget.total || day.budget.tickets + day.budget.food + day.budget.traffic + day.budget.other
const tripCost = () => props.data.days.reduce((sum, day) => sum + dayCost(day), 0)
const rentalCost = () => props.data.selectedQuote?.totalPrice || 0
const knownBudgetTotal = () => tripCost() + (props.data.hotelCost || 0) + rentalCost()
const payableTotal = () => props.data.selectedQuote ? rentalCost() : knownBudgetTotal()
const payableTitle = () => props.data.selectedQuote ? '本次应付' : '已知费用小计'
const primaryPayText = () => {
  if (props.paid) return '支付已完成'
  const action = props.orderCreated ? '确认支付' : '确认支付'
  return `${action}　¥${payableTotal()}`
}
const preferenceText = () => {
  const prefs = props.data.requirement.preferences || []
  return `${prefs[0] || '自然风光'} / ${prefs[1] || '悠闲探索'}`
}
const routeText = () => {
  const departure = props.data.requirement.departure || '上海'
  return `${departure} → ${destination()}核心城区 → 周边 → 返回`
}
const peopleText = () => `${props.data.requirement.peopleCount || 2} 成人`
const carName = () => props.data.selectedQuote?.name || '紧凑型SUV'
const carSubtitle = () => props.data.selectedQuote?.subtitle || 'CR-V 1.5T CVT两驱活力版'
const pickupName = () => props.data.selectedQuote?.pickup || props.data.rentalContext?.matchedStore?.displayName || `${destination()}双流机场推荐取车点`
const pickupDesc = () => props.data.rentalContext?.pickupPlan?.displayText || '距离到达点约1.5公里，可安排送车接人并现场交车。'
const returnName = () => props.data.rentalTripContext?.returnMode || '同城还车'
const returnDesc = () => props.data.selectedQuote?.returnPlace || `${destination()}推荐取车点`
</script>

<template>
  <section class="final-review">
    <div class="ready-banner">
      <button type="button" class="back-soft" @click="emit('back')">
        <el-icon><Refresh /></el-icon>
        返回调整
      </button>
      <div class="ready-icon"><el-icon><Check /></el-icon></div>
      <div class="ready-copy">
        <h1>行程已准备就绪，请确认并创建订单</h1>
        <p>行程由 AI 为您规划完成，查看详情并安全支付，开启美好旅程。</p>
      </div>
      <div class="stepper" aria-label="订单步骤">
        <div class="step done"><b>1</b><span>行程确认</span></div>
        <i></i>
        <div class="step active"><b>2</b><span>创建订单</span></div>
        <i></i>
        <div class="step"><b>3</b><span>支付完成</span></div>
      </div>
    </div>

    <div class="review-grid">
      <main class="review-main">
        <article class="trip-hero review-card">
          <img :src="coverImage()" alt="trip cover">
          <div class="trip-copy">
            <div class="title-line">
              <h2>{{ destination() }} {{ data.requirement.days }} 日悠闲之旅</h2>
              <span>{{ preferenceText() }}</span>
            </div>
            <p><el-icon><Location /></el-icon>{{ routeText() }}</p>
            <div class="pill-row">
              <em><el-icon><Calendar /></el-icon>{{ data.requirement.days }} 天</em>
              <em><el-icon><User /></el-icon>{{ peopleText() }}</em>
              <em><el-icon><Van /></el-icon>{{ data.selectedQuote ? '已选租车方案' : '公共交通优先' }}</em>
              <em class="green"><el-icon><CircleCheck /></el-icon>可免费取消</em>
            </div>
          </div>
        </article>

        <section class="itinerary-card review-card">
          <h3>行程概览（{{ data.requirement.days }} 天）</h3>
          <article v-for="day in data.days" :key="day.day" class="day-row">
            <div class="day-badge" :class="`day-${day.day}`"><small>DAY</small><b>{{ String(day.day).padStart(2, '0') }}</b></div>
            <img :src="dayImage(day)" :alt="day.title">
            <div class="day-copy">
              <b>{{ day.title }}</b>
              <span>{{ dayRoute(day) }}</span>
            </div>
            <em><el-icon><Lock /></el-icon>已锁定</em>
            <strong>¥{{ dayCost(day) }}</strong>
            <button type="button">⌄</button>
          </article>
        </section>

        <section class="rental-card review-card">
          <h3>租车与附加服务</h3>
          <div class="rental-grid">
            <div class="vehicle-cell">
              <img src="/assets/cars/crv.jpg" alt="rental car">
              <div>
                <b>{{ carName() }}</b>
                <span>{{ carSubtitle() }}</span>
              </div>
            </div>
            <div class="service-cell">
              <i><el-icon><Location /></el-icon></i>
              <div><small>取车点</small><b>{{ pickupName() }}</b><span>{{ pickupDesc() }}</span></div>
            </div>
            <div class="service-cell">
              <i><el-icon><Van /></el-icon></i>
              <div><small>还车方式</small><b>{{ returnName() }}</b><span>{{ returnDesc() }}</span></div>
            </div>
          </div>
          <div class="service-tags">
            <span v-for="tag in (data.selectedQuote?.serviceTags?.length ? data.selectedQuote.serviceTags : ['送车接人', '基础保障', '免费取消'])" :key="tag">
              <el-icon><Lock /></el-icon>{{ tag }}
            </span>
          </div>
        </section>

        <section class="traveler-card review-card">
          <h3>出行人信息</h3>
          <div class="traveler-grid">
            <p><i><el-icon><User /></el-icon></i><span>人数</span><b>{{ peopleText() }}</b></p>
            <p><i><el-icon><CircleCheck /></el-icon></i><span>联系人</span><b>user</b></p>
            <p><i><el-icon><Phone /></el-icon></i><span>手机号</span><b>138 0000 0000</b></p>
            <p><i><el-icon><Message /></el-icon></i><span>邮箱</span><b>user@example.com</b></p>
            <button type="button">编辑信息</button>
          </div>
        </section>
      </main>

      <aside class="pay-card review-card">
        <h3>订单概览</h3>
        <div class="fee-lines">
          <p><i class="green"><el-icon><Wallet /></el-icon></i><span>行程预算参考</span><b>¥{{ tripCost() }}</b></p>
          <p><i class="blue"><el-icon><Briefcase /></el-icon></i><span>住宿预算</span><b>{{ data.hotelCost == null ? '待确认' : `¥${data.hotelCost}` }}</b></p>
          <p><i class="purple"><el-icon><Van /></el-icon></i><span>租车应付</span><b>¥{{ rentalCost() }}</b></p>
        </div>
        <div class="budget-note">
          <span>预算参考小计</span>
          <b>¥{{ knownBudgetTotal() }}</b>
        </div>
        <div class="total-line"><span>{{ payableTitle() }}</span><strong>¥{{ payableTotal() }}</strong></div>
        <ul class="safe-list">
          <li><el-icon><CircleCheck /></el-icon><span>行程已确认<small>AI 行程规划已完成</small></span></li>
          <li><el-icon><CircleCheck /></el-icon><span>可免费取消<small>下单后 24 小时内可免费取消</small></span></li>
          <li><el-icon><Lock /></el-icon><span>安全支付<small>您的信息将受到安全保护</small></span></li>
        </ul>
        <button class="pay-primary" type="button" :disabled="saving || paid" @click="orderCreated ? emit('sandboxPay') : emit('createOrder')">
          <el-icon><Lock /></el-icon>
          {{ primaryPayText() }}
        </button>
        <button class="pay-secondary" type="button" :disabled="saving || orderCreated" @click="emit('createOrder')">
          {{ saving ? '正在创建订单...' : orderCreated ? '订单已创建' : '创建订单并稍后支付' }}
        </button>
        <footer><el-icon><Lock /></el-icon>PlanGo 为您提供安全便捷的出行服务</footer>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.final-review{max-width:1500px;margin:0 auto;padding:18px 0 0;color:#071936}.ready-banner,.review-card{background:rgba(255,255,255,.95);border:1px solid #e5edf7;border-radius:14px;box-shadow:0 14px 44px rgba(31,72,126,.08)}.ready-banner{min-height:96px;display:grid;grid-template-columns:128px 50px minmax(0,1fr) 430px;gap:18px;align-items:center;padding:0 30px}.back-soft{border:0;background:transparent;color:#627089;font-weight:700;display:flex;align-items:center;gap:8px;cursor:pointer}.ready-icon{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#02a76f,#10c59a);color:#fff;font-size:27px;box-shadow:0 12px 24px rgba(6,166,118,.26)}.ready-copy h1{margin:0;color:#071936;font-size:27px;letter-spacing:.2px}.ready-copy p{margin:7px 0 0;color:#63728a;font-size:15px}.stepper{display:grid;grid-template-columns:52px 1fr 52px 1fr 52px;align-items:start;gap:10px}.step{display:grid;justify-items:center;gap:8px;color:#6d7c93;font-size:12px}.step b{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;border:2px solid #d5deeb;background:#fff;color:#516074}.step.done b{border-color:#09a978;background:#09a978;color:#fff}.step.active b{border-color:#2d6df6;background:#2d6df6;color:#fff}.stepper i{height:2px;margin-top:13px;background:#d4dce8;position:relative}.stepper i:first-of-type{background:linear-gradient(90deg,#09a978 0 80%,#d4dce8 80%)}.stepper i:first-of-type:after{content:"";position:absolute;right:20%;top:-3px;width:8px;height:8px;border-radius:50%;background:#0db38d}.review-grid{display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:28px;margin-top:16px}.review-main{display:grid;gap:12px}.trip-hero{min-height:174px;display:grid;grid-template-columns:260px minmax(0,1fr);gap:30px;align-items:center;padding:12px 22px}.trip-hero>img{width:260px;height:132px;border-radius:12px;object-fit:cover}.title-line{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.title-line h2{margin:0;font-size:28px;color:#071936}.title-line span{border:1px solid #ffe1bc;border-radius:999px;background:#fff7ed;color:#c26a18;padding:6px 12px;font-size:13px;font-weight:800}.trip-copy>p{display:flex;align-items:center;gap:8px;margin:17px 0;color:#5c6a82}.trip-copy>p .el-icon{color:#1676ff;font-size:20px}.pill-row{display:flex;gap:8px;flex-wrap:wrap}.pill-row em{height:40px;display:inline-flex;align-items:center;gap:8px;border:1px solid #dfe8f4;border-radius:8px;background:#fff;color:#4f627d;padding:0 14px;font-style:normal;font-weight:700}.pill-row .el-icon{color:#236df4}.pill-row .green,.pill-row .green .el-icon{color:#08a978}.itinerary-card,.rental-card,.traveler-card{padding:14px 22px 10px}.itinerary-card h3,.rental-card h3,.traveler-card h3,.pay-card h3{margin:0 0 11px;color:#071936;font-size:20px}.day-row{min-height:74px;display:grid;grid-template-columns:56px 140px minmax(0,1fr) 100px 78px 24px;gap:16px;align-items:center;border:1px solid #dfe8f4;border-radius:11px;background:#fff;margin-bottom:4px;padding:5px 14px 5px 0}.day-badge{width:56px;height:64px;border-radius:10px;display:grid;place-items:center;background:#fff7ed;color:#ed6a00}.day-badge small{font-size:11px;font-weight:900}.day-badge b{font-size:20px;line-height:1}.day-badge.day-2{background:#edf5ff;color:#1f6df2}.day-badge.day-3{background:#edfffb;color:#00a789}.day-row img{width:136px;height:58px;border-radius:8px;object-fit:cover}.day-copy b,.day-copy span{display:block}.day-copy b{color:#071936;font-size:17px}.day-copy span{margin-top:5px;color:#66758d;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.day-row em{display:flex;align-items:center;gap:5px;color:#09a978;font-style:normal;font-size:13px;font-weight:800}.day-row strong{text-align:right;color:#071936;font-size:17px}.day-row button{border:0;background:transparent;color:#415270;font-size:20px;cursor:pointer}.rental-grid{display:grid;grid-template-columns:1.15fr 1.1fr 1.1fr;gap:24px;align-items:center}.vehicle-cell{display:grid;grid-template-columns:100px 1fr;gap:15px;align-items:center}.vehicle-cell img{width:98px;height:56px;object-fit:cover;mix-blend-mode:multiply}.vehicle-cell b,.service-cell b{display:block;color:#071936;font-size:17px}.vehicle-cell span,.service-cell span{display:block;margin-top:6px;color:#66758d;font-size:13px;line-height:1.5}.service-cell{display:grid;grid-template-columns:42px 1fr;gap:12px;padding-left:24px;border-left:1px solid #e4ecf6}.service-cell i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#eff5ff;color:#1268f4;font-size:22px}.service-cell small{color:#66758d}.service-tags{display:flex;gap:12px;margin-top:14px}.service-tags span{height:34px;display:inline-flex;align-items:center;gap:7px;border:1px solid #dfe8f4;border-radius:9px;background:#f8fbff;color:#32628d;padding:0 14px;font-size:13px;font-weight:800}.service-tags .el-icon{color:#1268f4}.traveler-grid{display:grid;grid-template-columns:repeat(4,1fr) 120px;gap:18px;align-items:center}.traveler-grid p{display:grid;grid-template-columns:44px 1fr;gap:2px 10px;margin:0}.traveler-grid i{grid-row:span 2;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:#eff5ff;color:#1268f4;font-size:23px}.traveler-grid span{color:#66758d}.traveler-grid b{color:#071936}.traveler-grid button{height:40px;border:1px solid #2b72ff;border-radius:9px;background:#fff;color:#2b72ff;font-weight:900;cursor:pointer}.pay-card{align-self:start;position:sticky;top:88px;padding:24px 26px}.fee-lines{display:grid;gap:18px;padding:12px 0 18px;border-bottom:1px dashed #dbe4f0}.fee-lines p{display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center;margin:0}.fee-lines i{width:28px;height:28px;border-radius:8px;display:grid;place-items:center}.fee-lines .green{background:#e7f8f2;color:#05a879}.fee-lines .blue{background:#eaf3ff;color:#2383ff}.fee-lines .purple{background:#f3ecff;color:#7b4acb}.fee-lines span{color:#506078}.fee-lines b{color:#071936;font-size:17px}.total-line{display:flex;justify-content:space-between;align-items:end;margin:18px 0 22px}.total-line span{color:#26384f}.total-line strong{color:#ea5b12;font-size:34px;line-height:1}.safe-list{list-style:none;display:grid;gap:18px;margin:0 0 20px;padding:18px;border:1px solid #eef2f7;border-radius:12px;background:#fff}.safe-list li{display:grid;grid-template-columns:28px 1fr;gap:10px;color:#071936;font-weight:900}.safe-list .el-icon{color:#08a978;font-size:21px}.safe-list small{display:block;margin-top:3px;color:#7b8798;font-size:13px;font-weight:500}.pay-primary,.pay-secondary{width:100%;height:50px;border-radius:9px;font-weight:900;font-size:17px;cursor:pointer}.pay-primary{border:0;background:linear-gradient(135deg,#2469f2,#08b792);color:#fff;display:flex;align-items:center;justify-content:center;gap:10px}.pay-primary:disabled,.pay-secondary:disabled{opacity:.66;cursor:not-allowed}.pay-secondary{margin-top:12px;border:1px solid #2b72ff;background:#fff;color:#2b72ff}.pay-card footer{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:18px;color:#7a8798;font-size:13px}.pay-card footer .el-icon{color:#657895}@media(max-width:1180px){.ready-banner{grid-template-columns:1fr}.stepper{width:min(430px,100%)}.review-grid{grid-template-columns:1fr}.pay-card{position:static}.traveler-grid{grid-template-columns:repeat(2,1fr)}.rental-grid{grid-template-columns:1fr}.service-cell{border-left:0;padding-left:0}}@media(max-width:760px){.trip-hero,.day-row{grid-template-columns:1fr}.trip-hero>img,.day-row img{width:100%;height:160px}.ready-copy h1{font-size:22px}.traveler-grid{grid-template-columns:1fr}.stepper{grid-template-columns:1fr}.stepper i{display:none}}
.budget-note{display:flex;justify-content:space-between;align-items:center;margin:14px 0 0;color:#6a788c;font-size:13px}.budget-note b{color:#26384f;font-size:16px}.total-line{margin:10px 0 22px}
</style>
