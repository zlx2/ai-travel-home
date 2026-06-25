<script setup lang="ts">
import { Check, CreditCard, Lock, Refresh, Van } from '@element-plus/icons-vue'
import type { FinalReviewData } from './types'

defineProps<{ data:FinalReviewData; saving:boolean; orderCreated:boolean; paid:boolean }>()
const emit=defineEmits<{ createOrder:[]; sandboxPay:[]; back:[] }>()
</script>

<template>
  <section class="final-review">
    <div class="final-top">
      <el-button text @click="emit('back')"><el-icon><Refresh/></el-icon>返回调整</el-button>
      <div>
        <h1>行程已准备就绪，请确认并创建订单</h1>
        <p>行程已由 AI 为您规划完成，查看详情并安全支付，开启美好旅程。</p>
      </div>
    </div>

    <article class="hero-summary builder-card">
      <img src="/assets/hq/hangzhou.jpg" alt="trip cover">
      <div>
        <span>{{ data.requirement.preferences[0] || '自然风光' }} · 悠闲探索</span>
        <h2>{{ data.requirement.destination }} {{ data.requirement.days }} 日悠闲之旅</h2>
        <p>{{ data.requirement.departure }} → {{ data.requirement.destination }}核心城区 → 周边 → 返程</p>
        <div>
          <em>{{ data.requirement.days }} 天</em>
          <em>{{ data.requirement.peopleCount }} 成人</em>
          <em>{{ data.selectedQuote ? '已选租车方案' : '公共交通优先' }}</em>
        </div>
      </div>
    </article>

    <div class="day-summaries">
      <article v-for="day in data.days" :key="day.day" class="day-summary builder-card">
        <span>Day {{ String(day.day).padStart(2,'0') }}</span>
        <h3>{{ day.title }}</h3>
        <p>{{ day.route.slice(0,3).join(' · ') }}</p>
        <footer><b>¥{{ day.budget.total }}</b><em><el-icon><Lock/></el-icon>已锁定</em></footer>
      </article>
    </div>

    <div class="final-grid">
      <article v-if="data.selectedQuote" class="final-card builder-card rental-card">
        <h3><el-icon><Van/></el-icon>已选租车方案</h3>
        <div class="rental-main">
          <b>{{ data.selectedQuote.name }}</b>
          <span>{{ data.selectedQuote.pickup }} → {{ data.selectedQuote.returnPlace }}</span>
          <span>{{ data.selectedQuote.pickupTime }} / {{ data.selectedQuote.returnTime }}</span>
        </div>
        <div class="service-tags"><span v-for="tag in data.selectedQuote.serviceTags" :key="tag">{{ tag }}</span></div>
        <strong>租车费用 ¥{{ data.selectedQuote.totalPrice }}</strong>
      </article>

      <article class="final-card builder-card">
        <h3>预算总览</h3>
        <p><span>每日费用汇总</span><b>¥{{ data.days.reduce((sum,day)=>sum+day.budget.total,0) }}</b></p>
        <p><span>住宿费用</span><b>{{ data.hotelCost==null?'待确认':`¥${data.hotelCost}` }}</b></p>
        <p><span>租车费用</span><b>¥{{ data.selectedQuote?.totalPrice || 0 }}</b></p>
        <strong>已知费用小计 <em>¥{{ data.days.reduce((sum,day)=>sum+day.budget.total,0)+(data.hotelCost||0)+(data.selectedQuote?.totalPrice||0) }}</em></strong>
      </article>

      <article class="final-card builder-card traveler-card">
        <h3>出行人信息</h3>
        <p><span>人数</span><b>{{ data.requirement.peopleCount }} 成人</b></p>
        <p><span>联系人</span><b>user</b></p>
        <p><span>手机号</span><b>138 0000 0000</b></p>
        <p><span>邮箱</span><b>user@example.com</b></p>
      </article>

      <article class="final-card builder-card pay-card">
        <h3>创建订单</h3>
        <ul>
          <li><el-icon><Check/></el-icon><span>行程已确认<small>AI 行程规划已完成</small></span></li>
          <li><el-icon><Check/></el-icon><span>可免费取消<small>下单后 24 小时内可免费取消</small></span></li>
          <li><el-icon><Check/></el-icon><span>安全支付<small>您的信息将受到安全保护</small></span></li>
        </ul>
        <div class="pay-amount"><span>已知费用小计</span><b>¥{{ data.days.reduce((sum,day)=>sum+day.budget.total,0)+(data.hotelCost||0)+(data.selectedQuote?.totalPrice||0) }}</b></div>
        <el-button class="create-btn" type="primary" :loading="saving" @click="emit('createOrder')">{{ orderCreated ? '行程订单已创建' : '保存行程并创建订单' }}</el-button>
        <el-button class="sandbox-btn" :disabled="!orderCreated || paid" @click="emit('sandboxPay')"><el-icon><CreditCard/></el-icon>{{ paid ? '支付已确认' : '确认支付' }}</el-button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.final-review{display:grid;gap:18px}.final-top{display:grid;grid-template-columns:160px 1fr 160px;align-items:center;text-align:center;margin:6px 0 8px}.final-top h1{margin:0;color:#111827;font-size:28px}.final-top p{margin:8px 0 0;color:#718096}.hero-summary{display:grid;grid-template-columns:220px 1fr;gap:26px;align-items:center;padding:18px}.hero-summary img{width:220px;height:126px;border-radius:18px;object-fit:cover}.hero-summary span{display:inline-block;border-radius:999px;background:#fff7ed;color:#9a6a24;padding:7px 12px;font-weight:700;font-size:12px}.hero-summary h2{margin:12px 0 6px;color:#111827;font-size:28px}.hero-summary p{margin:0 0 14px;color:#475569}.hero-summary em{font-style:normal;margin-right:22px;color:#374151}.day-summaries{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.day-summary{padding:16px}.day-summary span{color:#a06d25;font-weight:800}.day-summary h3{margin:8px 0 6px;color:#172033;font-size:17px}.day-summary p{margin:0;color:#718096;font-size:13px;min-height:38px}.day-summary footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px}.day-summary footer b{color:#111827}.day-summary footer em{display:flex;align-items:center;gap:4px;font-style:normal;color:#059669;font-size:12px}.final-grid{display:grid;grid-template-columns:1.2fr .8fr .8fr .9fr;gap:16px}.final-card{padding:20px}.final-card h3{display:flex;align-items:center;gap:8px;margin:0 0 16px;color:#172033}.final-card p{display:flex;justify-content:space-between;color:#718096;margin:10px 0}.final-card p b{color:#1f2937}.final-card strong{display:flex;justify-content:space-between;border-top:1px solid var(--line);margin-top:14px;padding-top:14px;color:#172033}.final-card strong em{font-style:normal;color:#2563eb;font-size:24px}.rental-main{display:grid;gap:6px;color:#64748b}.rental-main b{color:#1f2937;font-size:18px}.service-tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.service-tags span{border-radius:999px;background:#f1f5f9;color:#475569;padding:6px 9px;font-size:12px}.pay-card ul{list-style:none;margin:0;padding:0;display:grid;gap:14px}.pay-card li{display:flex;gap:10px;color:#111827}.pay-card li .el-icon{margin-top:2px;color:#10b981}.pay-card small{display:block;color:#8792a3;margin-top:3px}.pay-amount{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);margin-top:18px;padding-top:16px}.pay-amount b{color:#2563eb;font-size:25px}.create-btn,.sandbox-btn{width:100%;height:44px;margin:14px 0 0!important;border-radius:12px!important}.create-btn{background:#2563eb!important;border-color:#2563eb!important}.sandbox-btn{border-color:#2563eb!important;color:#2563eb!important}@media(max-width:1200px){.final-grid{grid-template-columns:1fr 1fr}.day-summaries{grid-template-columns:repeat(2,1fr)}}@media(max-width:780px){.final-top,.hero-summary,.final-grid,.day-summaries{grid-template-columns:1fr}.hero-summary img{width:100%}}
</style>
