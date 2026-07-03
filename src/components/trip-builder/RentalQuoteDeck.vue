<script setup lang="ts">
import { computed } from 'vue'
import { Check, Clock, Headset, Money, StarFilled, Van } from '@element-plus/icons-vue'
import type { RentalQuote } from './types'

const props = defineProps<{ quotes: RentalQuote[]; selectedId: string; loading?: boolean; pickupText?: string }>()
const emit = defineEmits<{ select: [id: string]; continue: [] }>()

const carImages = [
  'https://ai-education-1428653062.cos.ap-shanghai.myqcloud.com/car_rental/index/rental-card-white-sedan.webp',
  'https://ai-education-1428653062.cos.ap-shanghai.myqcloud.com/car_rental/index/rental-card-burgundy-sedan.webp',
  'https://ai-education-1428653062.cos.ap-shanghai.myqcloud.com/car_rental/index/rental-card-silver-suv.webp',
]
const toneText: Record<RentalQuote['tone'], string> = {
  blue: '推荐首选',
  teal: '经济优选',
  gold: '舒适升级',
}
const toneClass = (quote: RentalQuote) => quote.tone || 'blue'
const ribbonText = (quote: RentalQuote) => quote.label || toneText[toneClass(quote)]
const vehicleImage = (quote: RentalQuote, index: number) => quote.raw?.imageUrl || quote.raw?.coverImage || carImages[index % carImages.length]
const displayedQuotes = computed(() => props.quotes.slice(0, 3))
const visibleTags = (quote: RentalQuote) => [
  `${quote.seats} 座`,
  `${quote.luggage} 行李箱`,
  ...quote.tags,
].filter(Boolean).slice(0, 4)
const reasonText = (quote: RentalQuote) =>
  quote.raw?.recommendReason ||
  quote.raw?.description ||
  quote.raw?.summary ||
  quote.raw?.featureTags ||
  quote.raw?.travelTags ||
  quote.serviceTags?.[0] ||
  '匹配你的路线、人数与预算，适合本次自驾行程。'
</script>

<template>
  <section class="quote-section">
    <div v-if="loading" class="quote-loading">正在匹配附近服务点和租车套餐...</div>

    <div v-else-if="!displayedQuotes.length" class="quote-empty">
      <b>暂时没有可展示的租车套餐</b>
      <span>请返回调整到达地点或预算范围后重试。</span>
    </div>

    <div class="quote-grid">
      <article
        v-for="(quote, index) in displayedQuotes"
        :key="quote.id"
        class="quote-card"
        :class="[{ selected: quote.id === selectedId }, toneClass(quote)]"
        @click="emit('select', quote.id)"
      >
        <div class="quote-ribbon">{{ ribbonText(quote) }}</div>
        <span class="selected-check" :class="{ on: quote.id === selectedId }"><el-icon><Check /></el-icon></span>

        <div class="rq-vehicle-row">
          <div class="rq-vehicle-art">
            <img :src="vehicleImage(quote, index)" :alt="quote.name">
          </div>
          <div class="rq-vehicle-copy">
            <h3>{{ quote.name }}</h3>
            <p>{{ quote.subtitle }}</p>
            <div class="specs">
              <span v-for="tag in visibleTags(quote)" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>

        <div class="store-row">
          <div><small>取车</small><b>{{ quote.pickup }}</b><span>{{ quote.pickupTime }}</span></div>
          <i></i>
          <div><small>还车</small><b>{{ quote.returnPlace }}</b><span>{{ quote.returnTime }}</span></div>
        </div>

        <div class="reason-box">
          <b><el-icon><StarFilled /></el-icon>推荐理由</b>
          <span>{{ reasonText(quote) }}</span>
        </div>

        <div class="quote-bottom">
          <div><strong>¥{{ quote.totalPrice }}</strong><span>/ {{ quote.dayCount }} 天</span></div>
          <button class="detail-btn" type="button">查看详情</button>
          <button class="select-btn" type="button" @click.stop="emit('select', quote.id)">选择此方案</button>
        </div>
      </article>
    </div>

    <div class="quote-policy">
      <article>
        <el-icon><Check /></el-icon>
        <div><b>价格包含</b><span>车辆租赁费 · 基础保险 · 车辆清洁费<br>24h 道路救援</span></div>
      </article>
      <article>
        <el-icon><Van /></el-icon>
        <div><b>燃油政策</b><span>满油取车 · 满油还车<br>未满油还车将收取服务费</span></div>
      </article>
      <article>
        <el-icon><Clock /></el-icon>
        <div><b>里程限制</b><span>每日 200 公里<br>超出部分 1.5 元/公里</span></div>
      </article>
      <article>
        <el-icon><Money /></el-icon>
        <div><b>免费取消</b><span>取车前 48 小时可免费取消<br>超时将收取相应费用</span></div>
      </article>
      <article class="service">
        <el-icon><Headset /></el-icon>
        <div><b>专属客服</b><span>行程中有任何问题<br>随时为你提供帮助</span></div>
        <button type="button">联系客服</button>
      </article>
    </div>

  </section>
</template>

<style scoped>
.quote-section {
  margin-top: 18px;
}

.quote-loading {
  margin-bottom: 14px;
  padding: 18px 22px;
  border: 1px solid #e5edf7;
  border-radius: 14px;
  background: #fff;
  color: #64748b;
  font-weight: 800;
  box-shadow: 0 14px 34px rgba(36, 80, 132, .07);
}

.quote-empty {
  margin-bottom: 14px;
  min-height: 156px;
  display: grid;
  place-items: center;
  gap: 6px;
  padding: 20px;
  border: 1px solid #dbe7f3;
  border-radius: 14px;
  background: #fff;
  color: #64748b;
  box-shadow: 0 14px 34px rgba(36, 80, 132, .07);
}

.quote-empty b {
  color: #172033;
  font-size: 17px;
}

.quote-empty span {
  font-size: 13px;
}

.quote-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.quote-card {
  position: relative;
  min-height: 326px;
  padding: 18px;
  border: 1px solid #e1e8f2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 14px 32px rgba(30, 69, 118, .08);
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.quote-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 42px rgba(30, 69, 118, .11);
}

.quote-card.selected {
  border: 2px solid #2f75ff;
  padding: 17px;
  box-shadow: 0 18px 42px rgba(47, 117, 255, .13);
}

.quote-ribbon {
  position: absolute;
  left: 10px;
  top: 8px;
  z-index: 3;
  height: 25px;
  display: inline-flex;
  align-items: center;
  padding: 0 13px;
  border-radius: 5px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.blue .quote-ribbon {
  background: linear-gradient(135deg, #4f92ff, #1f6fff);
}

.teal .quote-ribbon {
  background: linear-gradient(135deg, #8bdcc9, #3fbea5);
}

.gold .quote-ribbon {
  background: linear-gradient(135deg, #ffaf3d, #ff7a00);
}

.selected-check {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 3;
  width: 28px;
  height: 28px;
  display: none;
  place-items: center;
  border-radius: 50%;
  background: #2f75ff;
  color: #fff;
  font-size: 16px;
  box-shadow: 0 8px 16px rgba(47, 117, 255, .22);
}

.selected-check.on {
  display: grid;
}

.rq-vehicle-row {
  display: grid;
  grid-template-columns: 47% minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  min-height: 142px;
}

.rq-vehicle-art {
  height: 126px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.rq-vehicle-art img {
  width: 100%;
  height: 118px;
  object-fit: contain;
  filter: drop-shadow(0 16px 16px rgba(22, 50, 86, .15));
}

.rq-vehicle-copy h3 {
  margin: 0;
  color: #10213b;
  font-size: 23px;
  line-height: 1.16;
  font-weight: 900;
}

.rq-vehicle-copy p {
  margin: 10px 0 12px;
  color: #708099;
  font-size: 13px;
}

.specs {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}

.specs span {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  border: 1px solid #e2eaf5;
  border-radius: 5px;
  background: #f7faff;
  color: #62738b;
  font-size: 12px;
  font-weight: 700;
}

.store-row {
  min-height: 70px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #e5edf6;
  border-radius: 9px;
  background: rgba(255, 255, 255, .82);
}

.store-row div {
  min-width: 0;
}

.store-row small,
.store-row span {
  display: block;
  color: #7b8799;
  font-size: 12px;
}

.store-row b {
  display: block;
  margin: 5px 0 3px;
  overflow: hidden;
  color: #10213b;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-row i {
  position: relative;
  height: 1px;
  background: #b9c7da;
}

.store-row i::after {
  content: "";
  position: absolute;
  right: 0;
  top: -4px;
  width: 8px;
  height: 8px;
  border-top: 1px solid #aab8cb;
  border-right: 1px solid #aab8cb;
  transform: rotate(45deg);
}

.reason-box {
  min-height: 54px;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: linear-gradient(135deg, #eef5ff, #f8fbff);
  color: #66758d;
  font-size: 12px;
  line-height: 1.45;
}

.teal .reason-box {
  background: linear-gradient(135deg, #ecfbf7, #f7fffc);
}

.gold .reason-box {
  background: linear-gradient(135deg, #fff6e9, #fffaf4);
}

.reason-box b {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  color: #3d7cff;
  font-size: 12px;
}

.teal .reason-box b {
  color: #0f9f8f;
}

.gold .reason-box b {
  color: #d97706;
}

.quote-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 98px 112px;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.quote-bottom strong {
  color: #2f75ff;
  font-size: 27px;
  line-height: 1;
  font-weight: 900;
}

.teal .quote-bottom strong {
  color: #0f9f8f;
}

.gold .quote-bottom strong {
  color: #ff7a00;
}

.quote-bottom span {
  color: #66758d;
  font-size: 14px;
}

.quote-bottom button {
  height: 36px;
  border-radius: 7px;
  cursor: pointer;
  font-weight: 800;
}

.detail-btn {
  border: 1px solid #d7e2f0;
  background: #fff;
  color: #64748b;
}

.select-btn {
  border: 0;
  background: #2f75ff;
  color: #fff;
}

.teal .select-btn {
  background: #0f9f8f;
}

.gold .select-btn {
  background: #ff850b;
}

.quote-policy {
  min-height: 106px;
  display: grid;
  grid-template-columns: 1.05fr 1.05fr 1fr 1fr 1.28fr;
  gap: 0;
  align-items: center;
  margin-top: 18px;
  padding: 14px 20px;
  border: 1px solid #e4ecf6;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(30, 69, 118, .08);
}

.quote-policy article {
  min-height: 64px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 0 24px;
  border-right: 1px solid #e3ebf5;
}

.quote-policy article:last-child {
  border-right: 0;
}

.quote-policy .el-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: #287cff;
  font-size: 28px;
}

.quote-policy article:first-child .el-icon,
.quote-policy article:nth-child(4) .el-icon {
  color: #0f9f8f;
}

.quote-policy b {
  display: block;
  margin-bottom: 6px;
  color: #10213b;
  font-size: 15px;
}

.quote-policy span {
  color: #67768d;
  font-size: 12px;
  line-height: 1.55;
}

.quote-policy .service {
  grid-template-columns: 42px minmax(0, 1fr) 82px;
  padding: 12px 16px;
  border-radius: 9px;
  background: #eef5ff;
}

.quote-policy .service button {
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: #2f75ff;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 1100px) {
  .quote-grid,
  .quote-policy {
    grid-template-columns: 1fr;
  }

  .quote-policy article,
  .quote-policy .service {
    border-right: 0;
    border-bottom: 1px solid #e3ebf5;
    padding: 16px 8px;
  }

  .quote-policy article:last-child {
    border-bottom: 0;
  }
}
</style>
