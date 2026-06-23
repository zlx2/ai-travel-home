<script setup lang="ts">
import { Briefcase, Check, InfoFilled, Van } from '@element-plus/icons-vue'
import type { RentalQuote } from './types'

defineProps<{ quotes:RentalQuote[]; selectedId:string }>()
const emit=defineEmits<{ select:[id:string]; continue:[] }>()
</script>

<template>
  <section class="quote-section">
    <div class="section-title-row">
      <div>
        <h2>推荐租车方案</h2>
        <p>根据路线、人数和预算，为你匹配 3 种出行方案。</p>
      </div>
      <span>以上报价包含基础保险、手续费及税费</span>
    </div>
    <div class="quote-grid">
      <article v-for="quote in quotes" :key="quote.id" class="quote-card builder-card" :class="[{selected:quote.id===selectedId},quote.tone]" @click="emit('select',quote.id)">
        <div class="quote-top">
          <span class="quote-label">{{ quote.label }}</span>
          <span class="check" :class="{on:quote.id===selectedId}"><el-icon><Check/></el-icon></span>
        </div>
        <div class="vehicle-row">
          <div class="vehicle-art"><el-icon><Van/></el-icon></div>
          <div>
            <h3>{{ quote.name }}</h3>
            <p>{{ quote.subtitle }}</p>
            <div class="specs">
              <span>{{ quote.seats }} 座</span>
              <span><el-icon><Briefcase/></el-icon>{{ quote.luggage }} 行李箱</span>
              <span v-for="tag in quote.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
        <div class="store-row">
          <div><small>取车</small><b>{{ quote.pickup }}</b><span>{{ quote.pickupTime }}</span></div>
          <i></i>
          <div><small>还车</small><b>{{ quote.returnPlace }}</b><span>{{ quote.returnTime }}</span></div>
        </div>
        <div class="quote-bottom">
          <strong>¥{{ quote.totalPrice }}</strong><span>/ {{ quote.dayCount }} 天</span>
          <el-button size="small" round>明细</el-button>
          <em v-if="quote.id===selectedId">已选方案</em>
        </div>
      </article>
    </div>
    <div class="quote-note builder-card">
      <span><el-icon><InfoFilled/></el-icon>报价用于前端演示，真实价格以后接入租车 preview 接口。</span>
      <el-button class="builder-primary" type="primary" @click="emit('continue')">进入逐日生成</el-button>
    </div>
  </section>
</template>

<style scoped>
.quote-section{margin-top:26px}.section-title-row{display:flex;align-items:end;justify-content:space-between;margin-bottom:14px}.section-title-row h2{margin:0;color:var(--ink);font-size:24px}.section-title-row p{margin:7px 0 0;color:var(--muted)}.section-title-row span{color:#8b95a4;font-size:12px}.quote-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.quote-card{padding:18px;cursor:pointer;transition:.2s;border-radius:20px}.quote-card:hover{transform:translateY(-2px);box-shadow:0 20px 55px rgba(15,23,42,.08)}.quote-card.selected{border-color:#2563eb;box-shadow:0 18px 50px rgba(37,99,235,.12)}.quote-top{display:flex;align-items:center;justify-content:space-between}.quote-label{border-radius:999px;padding:6px 10px;background:#f5efe4;color:#8a5f1d;font-size:12px;font-weight:700}.check{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;border:1px solid #d8dee8;color:transparent}.check.on{background:#2563eb;border-color:#2563eb;color:#fff}.vehicle-row{display:grid;grid-template-columns:106px 1fr;gap:14px;align-items:center;margin:18px 0}.vehicle-art{height:74px;border-radius:16px;background:linear-gradient(180deg,#eef6ff,#fff);display:grid;place-items:center;color:#536273;font-size:48px}.quote-card.teal .vehicle-art{background:linear-gradient(180deg,#ecfdf5,#fff)}.quote-card.gold .vehicle-art{background:linear-gradient(180deg,#fff7ed,#fff)}.vehicle-row h3{margin:0;color:#192337;font-size:19px}.vehicle-row p{margin:5px 0 8px;color:#778397;font-size:13px}.specs{display:flex;gap:7px;flex-wrap:wrap}.specs span{display:inline-flex;align-items:center;gap:3px;border-radius:7px;background:#f5f7fa;padding:4px 7px;color:#5d6a7c;font-size:12px}.store-row{display:grid;grid-template-columns:1fr 38px 1fr;gap:12px;border-top:1px solid var(--line);padding-top:14px}.store-row div{display:flex;flex-direction:column;gap:3px}.store-row small{color:#8b96a7}.store-row b{color:#1e293b;font-size:13px}.store-row span{color:#7a8698;font-size:12px}.store-row i{height:1px;background:#cbd5e1;align-self:center;position:relative}.store-row i:after{content:"";position:absolute;right:0;top:-3px;width:7px;height:7px;border-top:1px solid #94a3b8;border-right:1px solid #94a3b8;transform:rotate(45deg)}.quote-bottom{display:flex;align-items:center;gap:8px;margin-top:16px}.quote-bottom strong{font-size:22px;color:#111827}.quote-bottom span{color:#7b8796}.quote-bottom .el-button{margin-left:auto}.quote-bottom em{font-style:normal;border-radius:8px;background:#2563eb;color:#fff;font-size:12px;padding:6px 9px}.quote-note{margin-top:16px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;color:#7c8796;font-size:13px}.quote-note span{display:flex;align-items:center;gap:8px}.builder-primary{background:#2563eb!important;border-color:#2563eb!important;border-radius:10px!important}@media(max-width:1100px){.quote-grid{grid-template-columns:1fr}.section-title-row,.quote-note{align-items:flex-start;flex-direction:column;gap:12px}}
</style>
