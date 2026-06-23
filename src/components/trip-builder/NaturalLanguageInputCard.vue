<script setup lang="ts">
import { ArrowDown, MagicStick, Position } from '@element-plus/icons-vue'
import type { Destination, Requirement } from '../../types'

defineProps<{
  modelValue:string
  form:Requirement
  showForm:boolean
  loading:boolean
  preferenceOptions:string[]
  suggestions?:Destination[]
}>()
const emit=defineEmits<{
  'update:modelValue':[value:string]
  'update:showForm':[value:boolean]
  analyze:[]
  chooseDestination:[name:string]
  applyExample:[value:string]
}>()
</script>

<template>
  <section class="nl-card builder-card">
    <div class="nl-head">
      <span class="nl-icon"><el-icon><MagicStick/></el-icon></span>
      <div>
        <p class="section-kicker">AI TRIP BUILDER</p>
        <h1>AI 行程规划</h1>
        <p>描述你的旅行需求，PlanGo 会帮你拆成可确认的每日方案。</p>
      </div>
    </div>

    <div class="input-layout">
      <div class="command-box">
        <div class="command-title">
          <div>
            <strong>告诉 PlanGo 你的旅行想法</strong>
            <small>一句话就能开始，城市、预算、同行人和节奏都可以写在这里。</small>
          </div>
          <el-button size="small" round @click="emit('update:showForm',!showForm)">
            <el-icon><ArrowDown/></el-icon>{{ showForm ? '收起偏好' : '详细偏好' }}
          </el-button>
        </div>
        <el-input
          :model-value="modelValue"
          type="textarea"
          :rows="4"
          resize="none"
          placeholder="例如：带父母去杭州玩 3 天，不要太累，喜欢自然风光和历史文化，预算在 4000 元以内。"
          @update:model-value="emit('update:modelValue',$event)"
        />
        <div class="command-footer">
          <div class="example-row">
            <span>试试：</span>
            <button @click="emit('applyExample','带父母去杭州玩3天，不要太累，喜欢自然风光和历史文化，美食也想体验一下，预算在4000元以内。')">杭州轻松游</button>
            <button @click="emit('applyExample','从上海自驾江浙沪玩4天，喜欢古镇、自然风光和本地小吃，预算5000以内。')">江浙沪自驾</button>
            <button @click="emit('applyExample','去成都落地租车玩4天，想看城市烟火和周边自然风光，2个人。')">成都租车</button>
          </div>
          <el-button class="builder-primary" type="primary" size="large" :loading="loading" @click="emit('analyze')">
            <el-icon><MagicStick/></el-icon>开始分析需求
          </el-button>
        </div>
      </div>

      <aside class="planner-side">
        <div class="side-top">
          <span>PlanGo Builder</span>
          <b>逐日确认式规划</b>
        </div>
        <div class="mini-facts">
          <div><small>目的地</small><strong>{{ form.destination || '待识别' }}</strong></div>
          <div><small>天数</small><strong>{{ form.days }} 天</strong></div>
          <div><small>人数</small><strong>{{ form.peopleCount }} 人</strong></div>
          <div><small>预算</small><strong>¥{{ form.budget }}</strong></div>
        </div>
        <ol>
          <li><span></span>识别需求摘要</li>
          <li><span></span>匹配租车方案</li>
          <li><span></span>逐日生成确认</li>
        </ol>
        <p>后续每一天都会单独确认，已锁定日期不会被自动覆盖。</p>
      </aside>
    </div>

    <el-collapse-transition>
      <div v-show="showForm" class="preference-panel">
        <el-form label-position="top">
          <div class="form-grid">
            <el-form-item label="出发地"><el-input v-model="form.departure" placeholder="如：上海"/></el-form-item>
            <el-form-item label="目的地"><el-input v-model="form.destination" placeholder="也可以让 AI 推荐"/></el-form-item>
            <el-form-item label="旅行天数"><el-input-number v-model="form.days" :min="1" :max="15"/></el-form-item>
            <el-form-item label="预算（元）"><el-input-number v-model="form.budget" :min="500" :step="500"/></el-form-item>
            <el-form-item label="同行人数"><el-input-number v-model="form.peopleCount" :min="1" :max="20"/></el-form-item>
            <el-form-item label="旅行节奏">
              <el-radio-group v-model="form.pace">
                <el-radio-button label="LIGHT">轻松</el-radio-button>
                <el-radio-button label="MEDIUM">适中</el-radio-button>
                <el-radio-button label="TIGHT">充实</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>
          <el-form-item label="旅行偏好">
            <el-checkbox-group v-model="form.preferences">
              <el-checkbox-button v-for="item in preferenceOptions" :key="item" :label="item">{{ item }}</el-checkbox-button>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>
    </el-collapse-transition>

    <div v-if="suggestions?.length" class="destination-choices">
      <button v-for="item in suggestions" :key="item.id" @click="emit('chooseDestination',item.name)">
        <img :src="item.coverUrl" :alt="item.name">
        <span><b>{{ item.name }}</b><small>{{ item.description }}</small></span>
        <el-icon><Position/></el-icon>
      </button>
    </div>
  </section>
</template>

<style scoped>
.nl-card{padding:22px;border-radius:24px;background:rgba(255,255,255,.94)}.nl-head{display:flex;gap:15px;align-items:center;margin-bottom:18px}.nl-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#2563eb,#0d9488);box-shadow:0 12px 28px rgba(37,99,235,.18)}.section-kicker{margin:0 0 4px;color:var(--brand);font-size:11px;font-weight:800;letter-spacing:1.8px}.nl-head h1{margin:0;color:var(--ink);font-size:30px;letter-spacing:0}.nl-head p:last-child{margin:5px 0 0;color:var(--muted)}.input-layout{display:grid;grid-template-columns:minmax(0,1fr) 292px;gap:16px}.command-box{border:1px solid #dfe6ef;border-radius:22px;padding:16px;background:linear-gradient(180deg,#fff,#fbfcfe)}.command-title{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.command-title strong,.command-title small{display:block}.command-title strong{font-size:17px;color:var(--ink)}.command-title small{margin-top:4px;color:#7b8797;font-size:12px}.nl-card :deep(.el-textarea__inner){min-height:116px!important;border:0;border-radius:18px;background:#fff;box-shadow:inset 0 0 0 1px #dfe6ef;color:#1e293b;font-size:15px;line-height:1.75;padding:16px}.command-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px}.example-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:#7b8797;font-size:12px}.example-row button{border:1px solid #e1e8f1;background:#f8fafc;border-radius:999px;padding:7px 11px;color:#43546a;cursor:pointer}.example-row button:hover{border-color:#93b7ee;color:#2563eb;background:#fff}.builder-primary{background:linear-gradient(135deg,#2563eb,#0d9488)!important;border:0!important;border-radius:12px!important;box-shadow:0 10px 22px rgba(37,99,235,.16)}.planner-side{border:1px solid #e5dccf;border-radius:22px;padding:17px;background:linear-gradient(180deg,#fffaf3 0%,#fff 78%);box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}.side-top span,.side-top b{display:block}.side-top span{color:#a36d24;font-size:12px;font-weight:800}.side-top b{margin-top:4px;color:#1f2937;font-size:18px}.mini-facts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.mini-facts div{border:1px solid #f0e7dc;border-radius:13px;background:#fff;padding:10px}.mini-facts small,.mini-facts strong{display:block}.mini-facts small{color:#8b95a4;font-size:11px}.mini-facts strong{margin-top:5px;color:#172033}.planner-side ol{list-style:none;margin:0;padding:0;display:grid;gap:9px}.planner-side li{display:flex;align-items:center;gap:9px;color:#475569;font-size:13px}.planner-side li span{width:8px;height:8px;border-radius:50%;background:#0d9488;box-shadow:0 0 0 4px rgba(13,148,136,.1)}.planner-side p{margin:15px 0 0;padding-top:13px;border-top:1px solid #f0e7dc;color:#758195;font-size:12px;line-height:1.65}.preference-panel{margin-top:16px;padding:18px;border:1px solid var(--line);border-radius:20px;background:#fff}.form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:0 16px}.preference-panel :deep(.el-input-number){width:100%}.destination-choices{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.destination-choices button{display:grid;grid-template-columns:58px 1fr auto;gap:10px;align-items:center;border:1px solid var(--line);background:#fff;border-radius:16px;padding:9px;text-align:left;cursor:pointer}.destination-choices img{width:58px;height:52px;object-fit:cover;border-radius:12px}.destination-choices b,.destination-choices small{display:block}.destination-choices small{color:#718096;font-size:11px;line-height:1.4;margin-top:3px}@media(max-width:1000px){.input-layout{grid-template-columns:1fr}.planner-side{order:-1}.form-grid,.destination-choices{grid-template-columns:1fr}.command-footer{align-items:stretch;flex-direction:column}.command-footer .el-button{width:100%}}
</style>
