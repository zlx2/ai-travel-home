<script setup lang="ts">
import { ChatLineRound, MapLocation, Refresh, Sunny, Van, Wallet } from '@element-plus/icons-vue'
import type { BuilderDay, RentalQuote } from './types'

defineProps<{ day:BuilderDay; selectedQuote?:RentalQuote|null; confirming:boolean }>()
const emit=defineEmits<{ confirm:[]; regenerate:[]; revise:[] }>()
</script>

<template>
  <article class="day-plan-card builder-card">
    <header class="day-hero">
      <div class="day-badge"><small>Day</small><b>{{ String(day.day).padStart(2,'0') }}</b></div>
      <div>
        <div class="title-row"><h2>{{ day.title }}</h2><span>{{ day.status==='generating'?'正在生成':'当前正在确认' }}</span></div>
        <p>{{ day.subtitle }}</p>
      </div>
      <el-button round><el-icon><MapLocation/></el-icon>查看地图</el-button>
    </header>

    <div class="day-content-grid">
      <section class="route-panel">
        <h3>今日路线概览</h3>
        <div class="route-strip">
          <span v-for="(item,index) in day.route" :key="item">
            <i></i><b>{{ item }}</b><em v-if="index<day.route.length-1">→</em>
          </span>
        </div>
      </section>

      <section class="timeline-panel">
        <div v-for="moment in day.moments" :key="moment.key" class="moment-row">
          <div class="moment-period">
            <el-icon><Sunny/></el-icon>
            <b>{{ moment.period }}</b>
            <small>{{ moment.time }}</small>
          </div>
          <img :src="moment.image" :alt="moment.title">
          <div class="moment-main">
            <h4>{{ moment.title }}</h4>
            <p>{{ moment.description }}</p>
            <div><span v-for="tag in moment.tags" :key="tag">{{ tag }}</span></div>
          </div>
          <strong>预计 ¥{{ moment.cost }}</strong>
        </div>
      </section>

      <aside class="side-panels">
        <section class="side-card rental">
          <h3><el-icon><Van/></el-icon>租车与交通</h3>
          <div class="rental-line"><span>今日是否用车</span><b>{{ day.rental.enabled ? '是' : '否' }}</b></div>
          <div class="rental-line"><span>出发地</span><b>{{ day.rental.departure }}</b></div>
          <div class="rental-line"><span>用车时长</span><b>{{ day.rental.duration }}</b></div>
          <div v-if="selectedQuote" class="quote-mini">
            <div>
              <span>推荐车型</span>
              <b>{{ selectedQuote.name }}</b>
            </div>
            <em>套餐 ¥{{ selectedQuote.totalPrice }} / {{ selectedQuote.dayCount }} 天</em>
          </div>
          <div class="rental-stats">
            <span>今日里程预估<br><b>{{ day.rental.mileage }} km</b></span>
            <span>预估油费/停车<br><b>¥{{ day.rental.fuelCost }}</b></span>
          </div>
          <button>查看详细路线 ›</button>
        </section>

        <section class="side-card budget">
          <h3><el-icon><Wallet/></el-icon>今日预算汇总</h3>
          <p><span>景点门票</span><b>¥{{ day.budget.tickets }}</b></p>
          <p><span>餐饮</span><b>¥{{ day.budget.food }}</b></p>
          <p><span>交通/油费</span><b>¥{{ day.budget.traffic }}</b></p>
          <p><span>其他</span><b>¥{{ day.budget.other }}</b></p>
          <strong>今日预计总计 <em>¥{{ day.budget.total }}</em></strong>
        </section>

        <section class="side-card tips">
          <h3>AI 提醒</h3>
          <ul><li v-for="tip in day.tips" :key="tip">{{ tip }}</li></ul>
        </section>
      </aside>
    </div>

    <footer class="day-actions">
      <button @click="emit('regenerate')"><el-icon><Refresh/></el-icon><span><b>重新生成这一天</b><small>换个思路，重新规划</small></span></button>
      <button @click="emit('revise')"><el-icon><ChatLineRound/></el-icon><span><b>告诉 AI 怎么改</b><small>调整景点 / 餐饮 / 节奏</small></span></button>
      <el-button class="confirm-btn" type="primary" size="large" :loading="confirming" @click="emit('confirm')">确认 Day {{ String(day.day).padStart(2,'0') }}</el-button>
    </footer>
  </article>
</template>

<style scoped>
.day-plan-card{overflow:hidden}.day-hero{min-height:118px;display:grid;grid-template-columns:74px 1fr auto;gap:20px;align-items:center;padding:24px 26px;border-bottom:1px solid #eee5d7;background:linear-gradient(90deg,#fff 0%,#fffaf3 58%,#f8f3eb 100%);position:relative}.day-hero:after{content:"";position:absolute;right:22px;top:16px;width:340px;height:84px;opacity:.12;background:linear-gradient(135deg,transparent 18%,#9a7a4b 18% 20%,transparent 20% 45%,#9a7a4b 45% 47%,transparent 47%);background-size:42px 42px;pointer-events:none}.day-badge{width:70px;height:70px;border-radius:14px;background:linear-gradient(135deg,#a1763f,#c09b63);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}.day-badge small{font-size:18px;font-family:Georgia,serif}.day-badge b{font-size:32px;line-height:1}.title-row{display:flex;align-items:center;gap:14px}.title-row h2{margin:0;color:#111827;font-size:26px}.title-row span{border-radius:8px;background:#f6eadb;color:#a16207;padding:6px 10px;font-size:12px;font-weight:700}.day-hero p{margin:8px 0 0;color:#778397}.day-content-grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:18px;padding:18px}.route-panel,.timeline-panel,.side-card{border:1px solid #eee5d9;border-radius:16px;background:#fff}.route-panel{grid-column:1/2;padding:18px}.route-panel h3,.side-card h3{margin:0 0 14px;color:#243044;font-size:16px}.route-strip{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}.route-strip span{display:flex;align-items:center;gap:10px;color:#475569;font-size:13px}.route-strip i{width:8px;height:8px;border-radius:50%;background:#9b784a}.route-strip em{font-style:normal;color:#a9b1bd}.timeline-panel{grid-column:1/2;overflow:hidden}.moment-row{display:grid;grid-template-columns:112px 112px minmax(0,1fr) 82px;gap:16px;align-items:center;padding:16px 18px;border-bottom:1px solid #f0e7db}.moment-row:last-child{border-bottom:0}.moment-period{display:grid;grid-template-columns:24px 1fr;gap:3px 8px;color:#8a6a35}.moment-period .el-icon{grid-row:span 2;font-size:22px;color:#f59e0b}.moment-period b{color:#2c3648}.moment-period small{color:#7c8796}.moment-row img{width:112px;height:76px;object-fit:cover;border-radius:12px}.moment-main h4{margin:0;color:#1d293b;font-size:16px}.moment-main p{margin:6px 0 8px;color:#667386;font-size:13px;line-height:1.5}.moment-main span{display:inline-block;margin:0 6px 5px 0;border-radius:7px;background:#f7f1e7;color:#8a6a35;padding:4px 7px;font-size:12px}.moment-row>strong{text-align:right;color:#8a6a35;font-size:14px}.side-panels{grid-column:2/3;grid-row:1/3;display:grid;gap:12px}.side-card{padding:16px}.side-card h3{display:flex;align-items:center;gap:8px}.rental-line,.budget p{display:flex;justify-content:space-between;margin:10px 0;color:#748095;font-size:13px}.rental-line b,.budget b{color:#1f2937}.quote-mini{border-top:1px solid #eef0f3;border-bottom:1px solid #eef0f3;padding:12px 0;margin:12px 0}.quote-mini span{display:block;color:#788496;font-size:12px}.quote-mini b{color:#1f2937}.quote-mini em{display:block;margin-top:5px;color:#64748b;font-style:normal;font-size:12px}.rental-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.rental-stats span{border-radius:12px;background:#f8fafc;padding:10px;color:#738096;font-size:12px}.rental-stats b{color:#1d293b}.rental button{border:0;background:transparent;color:#0d9488;font-weight:700;cursor:pointer;float:right}.budget strong{display:flex;justify-content:space-between;border-top:1px solid #edf0f4;margin-top:12px;padding-top:12px;color:#1f2937}.budget em{font-style:normal;color:#f97316;font-size:22px}.tips{background:#f2f7ff;border-color:#d8e8ff}.tips ul{margin:0;padding-left:18px;color:#506174;font-size:13px;line-height:1.8}.day-actions{position:sticky;bottom:0;display:grid;grid-template-columns:1fr 1fr minmax(230px,360px);gap:16px;align-items:center;padding:14px 18px;background:rgba(255,255,255,.88);backdrop-filter:blur(14px);border-top:1px solid #edf0f3}.day-actions>button{border:0;background:#fff;display:flex;align-items:center;gap:12px;text-align:left;color:#172033;cursor:pointer}.day-actions>button:not(:last-child){border-right:1px solid #e5eaf0}.day-actions .el-icon{font-size:26px;color:#0d9488}.day-actions b,.day-actions small{display:block}.day-actions small{color:#7d8898;font-size:12px;margin-top:3px}.confirm-btn{height:46px;border:0!important;border-radius:12px!important;background:linear-gradient(135deg,#0d9488,#10b981)!important}@media(max-width:1180px){.day-content-grid{grid-template-columns:1fr}.side-panels{grid-column:auto;grid-row:auto}.day-actions{grid-template-columns:1fr}.day-actions>button:not(:last-child){border-right:0}}@media(max-width:760px){.day-hero{grid-template-columns:1fr}.moment-row{grid-template-columns:1fr}.moment-row img{width:100%;height:150px}.moment-row>strong{text-align:left}}
</style>
