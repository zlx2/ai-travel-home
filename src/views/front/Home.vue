<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, Check, Collection, MagicStick, MapLocation, Picture, User } from '@element-plus/icons-vue'
import { homeApi } from '../../api'
import type { Destination, Note } from '../../types'

const router = useRouter()
const loading = ref(true)
const destinations = ref<Destination[]>([])
const notes = ref<Note[]>([])
const routes = ref<any[]>([])

onMounted(async () => {
  try {
    const data = await homeApi.getHome()
    destinations.value = data.hotDestinations
    notes.value = data.hotNotes
    routes.value = data.recommendedTrips
  } finally {
    loading.value = false
  }
})

const useRoute = (item: any) => router.push({
  path: '/ai-trip',
  query: { destination: item.destination, days: item.days, preferences: item.preferences.join(',') },
})

const features = [
  { icon: Check, title: 'AI 智能生成行程', text: '一句话输入需求，快速生成结构化专属路线', color: '#31c9cf' },
  { icon: MagicStick, title: '个性化旅行建议', text: '结合偏好与预算，推荐景点、美食与节奏', color: '#8c62ef' },
  { icon: User, title: '真实游记社区', text: '发现旅行者的真实攻略，分享旅途故事', color: '#ffad45' },
  { icon: Picture, title: '行程保存与管理', text: '保存、查看和管理行程，出发更从容', color: '#52d191' },
]
</script>

<template>
  <div class="compact-home" v-loading="loading">
    <section class="reference-hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <h1>用 AI 轻松规划<br><span>你的下一次旅行</span></h1>
          <p>智能生成个性化行程，推荐地道玩法与美食，<br>让每一次出发都更省心、更精彩。</p>
          <div class="hero-actions">
            <el-button class="gradient-button" type="primary" size="large" @click="router.push('/ai-trip')"><el-icon><MagicStick /></el-icon>立即开始 AI 规划</el-button>
            <el-button size="large" @click="router.push('/notes')"><el-icon><Collection /></el-icon>查看热门游记</el-button>
          </div>
          <div class="hero-proof"><img src="/assets/traveler-avatars.png"><b>10万+</b><span>旅行者已体验 AI 规划</span></div>
        </div>

        <div class="planner-mock">
          <div class="mock-title"><el-icon><MagicStick /></el-icon><b>为你生成的行程</b><small>（示例）</small></div>
          <div class="mock-content">
            <aside><b><el-icon><MapLocation /></el-icon>行程概览</b><span><el-icon><Calendar /></el-icon>每日行程</span><span>✦ 景点推荐</span><span>♨ 美食推荐</span><span>▣ 交通建议</span></aside>
            <div class="mock-main">
              <h2>重庆 3 日 2 夜</h2>
              <div class="chips"><i>美食之旅</i><i>城市夜景</i><i>轻松游</i></div>
              <p>2026/06/22 - 06/24　·　2 人出行</p>
              <div class="mock-route"><h3>行程概览</h3><div><em></em><b>洪崖洞夜景</b><small>璀璨夜色，重庆地标打卡</small></div><div><em class="green"></em><b>长江索道</b><small>横跨长江，俯瞰山城风光</small></div><div><em class="orange"></em><b>磁器口古镇</b><small>老街古镇，体验传统文化</small></div><a>查看完整行程 ›</a></div>
            </div>
            <div class="mock-side"><div class="map-card"></div><div class="ai-tip"><b>AI 小贴士</b><p>重庆夏季多雨，建议携带轻便雨具与舒适步行鞋。</p><span>✦</span></div></div>
          </div>
        </div>
      </div>
      <div class="hero-dots"><i class="active"></i><i></i><i></i><i></i></div>
    </section>

    <div class="home-body">
      <section class="container feature-row">
        <article v-for="item in features" :key="item.title"><span :style="{ background: item.color }"><el-icon><component :is="item.icon" /></el-icon></span><div><h3>{{ item.title }}</h3><p>{{ item.text }}</p></div></article>
      </section>

      <section class="container compact-dashboard">
        <article class="dash-panel destination-panel"><div class="panel-head"><h3>热门目的地</h3><a>查看更多 ›</a></div><div class="mini-destinations"><button v-for="item in destinations" :key="item.id"><img :src="item.coverUrl"><span>{{ item.name }}</span></button></div></article>
        <div class="dash-middle">
          <article class="dash-panel tag-panel"><h3>热门标签</h3><div><el-tag v-for="tag in ['美食','夜景','亲子','轻松游','拍照打卡','文化历史','海岛','徒步','自驾']" :key="tag" round effect="light">{{ tag }}</el-tag></div></article>
          <article class="dash-panel route-panel"><div class="panel-head"><h3>推荐行程</h3><a>查看更多 ›</a></div><div class="mini-routes"><button v-for="(item, i) in routes" :key="item.destination" @click="useRoute(item)"><img :src="destinations[i]?.coverUrl"><b>{{ item.destination }} {{ item.days }} 日游</b><span>{{ item.preferences.join(' · ') }}</span></button></div></article>
        </div>
        <article class="dash-panel note-panel"><div class="panel-head"><h3>热门游记</h3><a @click="router.push('/notes')">查看更多 ›</a></div><div class="mini-notes"><button v-for="note in notes" :key="note.id" @click="router.push(`/notes/${note.id}`)"><img :src="note.coverUrl"><b>{{ note.title }}</b><p>{{ note.summary }}</p><div><span>{{ note.authorNickname }}</span><small>♥ {{ note.likeCount }}</small></div></button></div></article>
      </section>
    </div>
  </div>
</template>

<style scoped>
.compact-home {
  --page-width: min(1680px, calc(100vw - clamp(48px, 6vw, 120px)));
  flex: 1;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f7faff 0%, #f8fbff 100%);
}
.compact-home .container { width: var(--page-width); }
.reference-hero {
  height: clamp(410px, 42vh, 485px);
  min-height: 410px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, rgba(242,250,255,.97) 0%, rgba(230,246,255,.85) 32%, rgba(213,239,251,.16) 60%), url('/assets/hero-chongqing-v2.png') center/cover;
}
.hero-grid {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(430px, .9fr) minmax(650px, 1.25fr);
  gap: clamp(44px, 5vw, 90px);
  align-items: center;
}
.hero-copy { padding-left: clamp(0px, 1vw, 18px); }
.hero-copy h1 { font-size: clamp(48px, 3vw, 62px); line-height: 1.12; letter-spacing: -1.5px; margin: 0 0 16px; color: #111b31; }
.hero-copy h1 span { font-size: 1.04em; background: linear-gradient(90deg,#176ff1,#05bb91); -webkit-background-clip: text; color: transparent; }
.hero-copy>p { font-size: clamp(15px, 1vw, 18px); line-height: 1.75; color: #607085; margin: 0 0 21px; }
.hero-actions { display: flex; gap: 16px; }
.hero-actions .el-button { height: 48px; border-radius: 9px; padding: 0 26px; font-size: 15px; }
.hero-actions .el-button:last-child { color: #176ff1; border-color: #488ef1; background: #ffffffd9; }
.hero-proof { display: flex; align-items: center; margin-top: 18px; font-size: 13px; color: #68768b; }
.hero-proof img { width: 96px; height: 31px; object-fit: cover; border-radius: 16px; margin-right: 10px; }
.hero-proof b { color: #364258; margin-right: 5px; }
.planner-mock { height: min(390px, calc(45vh - 55px)); min-height: 350px; background: #ffffffed; border: 1px solid #ffffffd9; border-radius: 18px; box-shadow: 0 18px 55px rgba(44,92,132,.18); overflow: hidden; backdrop-filter: blur(15px); }
.mock-title { height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 19px; border-bottom: 1px solid #e8edf3; font-size: 13px; }
.mock-title .el-icon { color: #126ef5; }
.mock-title small { color: #8c96a5; }
.mock-content { display: grid; grid-template-columns: 112px minmax(300px, 1fr) 205px; height: calc(100% - 48px); }
.mock-content aside { padding: 14px 9px; border-right: 1px solid #edf1f5; display: flex; flex-direction: column; gap: 5px; color: #667286; font-size: 11px; }
.mock-content aside>* { height: 36px; border-radius: 7px; padding: 0 9px; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.mock-content aside b { background: #eaf3ff; color: #176ff1; border-left: 3px solid #176ff1; }
.mock-main { padding: 14px; }
.mock-main h2 { font-size: 22px; margin: 0 0 6px; }
.chips { display: flex; gap: 6px; }
.chips i { font-style: normal; font-size: 10px; border-radius: 10px; padding: 3px 9px; background: #dceeff; color: #4184c6; }
.chips i:nth-child(2) { background: #ffe9ce; color: #db8a28; }
.chips i:nth-child(3) { background: #dff5e4; color: #43a25d; }
.mock-main>p { font-size: 10px; color: #758092; margin: 7px 0; }
.mock-route { background: #fff; border: 1px solid #e7ecf1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 5px 14px #7890a010; }
.mock-route h3 { font-size: 12px; margin: 0 0 3px; }
.mock-route>div { padding: 5px 0 5px 17px; position: relative; }
.mock-route em { position: absolute; left: 0; top: 10px; width: 9px; height: 9px; border-radius: 50%; border: 2px solid #2686ff; }
.mock-route em.green { border-color: #39c76e; }
.mock-route em.orange { border-color: #ffa81c; }
.mock-route b,.mock-route small { display: block; }
.mock-route b { font-size: 11px; }
.mock-route small { font-size: 9px; color: #7c8797; }
.mock-route a { display: block; color: #176ff1; font-size: 10px; margin-top: 3px; }
.mock-side { padding: 15px 11px 9px 2px; }
.map-card { height: 56%; border: 5px solid #fff; border-radius: 14px; background: url('/assets/map-card.jpg') center/cover; box-shadow: 0 4px 14px #647c8f42; }
.ai-tip { min-height: 94px; margin-top: 9px; border-radius: 11px; background: #fff; padding: 11px; box-shadow: 0 4px 14px #647c8f22; position: relative; }
.ai-tip b { font-size: 11px; color: #176ff1; }
.ai-tip p { font-size: 9px; line-height: 1.55; width: 135px; color: #5e6a7b; }
.ai-tip span { position: absolute; right: 10px; bottom: 9px; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--gradient); color: #fff; }
.hero-dots { position: absolute; left: 50%; bottom: 12px; display: flex; gap: 10px; }
.hero-dots i { width: 8px; height: 8px; border-radius: 50%; background: #8d98a8; }
.hero-dots i.active { background: #4d8eea; }
.home-body { padding: clamp(14px, 1.6vh, 20px) 0 clamp(18px, 2vh, 26px); }
.feature-row { display: grid; grid-template-columns: repeat(4,1fr); gap: clamp(14px, 1.4vw, 24px); }
.feature-row article { min-height: 86px; background: #fff; border: 1px solid #e9eef3; border-radius: 10px; display: flex; align-items: center; padding: 15px 19px; gap: 15px; box-shadow: 0 5px 18px #5c77900c; }
.feature-row article>span { flex: 0 0 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 24px; box-shadow: 0 6px 13px #5b718e33; }
.feature-row h3 { font-size: 15px; margin: 0 0 5px; }
.feature-row p { font-size: 13px; line-height: 1.45; color: #758091; margin: 0; }
.compact-dashboard { width: min(1840px, calc(100vw - 48px)) !important; margin-top: clamp(12px, 1.4vh, 16px); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(0, 1.4fr); gap: clamp(10px, .8vw, 16px); align-items: stretch; }
.compact-dashboard>* { min-height: 0; }
.dash-panel { min-height: 0; background: #fff; border: 1px solid #e9eef3; border-radius: 13px; padding: 14px 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(53,78,110,.045); }
.panel-head { display: flex; align-items: center; justify-content: space-between; height: 25px; margin-bottom: 10px; }
.panel-head h3,.tag-panel h3 { font-size: 17px; margin: 0; }
.panel-head a { font-size: 12px; color: #7f8998; cursor: pointer; }
.mini-destinations { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(7px, .5vw, 10px); }
.mini-destinations button { aspect-ratio: 16 / 9; min-width: 0; border: 0; border-radius: 8px; overflow: hidden; position: relative; padding: 0; cursor: pointer; background: #ddd; }
.mini-destinations img { width: 100%; height: 100%; display: block; object-fit: cover; }
.mini-destinations button:after { content: ''; position: absolute; inset: 40% 0 0; background: linear-gradient(transparent,#0b1424bb); }
.mini-destinations span { position: absolute; z-index: 1; left: 10px; bottom: 7px; color: #fff; font-size: clamp(15px, 1vw, 18px); font-weight: 800; text-shadow: 0 1px 3px #000; }
.dash-middle { display: grid; grid-template-rows: auto auto; gap: clamp(9px, .7vw, 12px); align-content: start; min-height: 0; }
.tag-panel { padding-top: 10px; }
.tag-panel h3 { margin-bottom: 7px; }
.tag-panel>div { display: flex; flex-wrap: wrap; gap: 7px; }
.tag-panel .el-tag { height: 22px; padding: 0 8px; font-size: 11px; border: 0; }
.route-panel { min-height: 0; padding-top: 12px; }
.mini-routes { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: clamp(7px, .5vw, 10px); }
.mini-routes button { border: 0; background: transparent; text-align: left; padding: 0; min-width: 0; min-height: 0; cursor: pointer; }
.mini-routes img { width: 100%; height: auto; aspect-ratio: 16 / 9; display: block; object-fit: cover; border-radius: 7px; }
.mini-routes b,.mini-routes span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-routes b { font-size: 13px; margin: 4px 0; }
.mini-routes span { font-size: 11px; color: #6d80a1; }
.mini-notes { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(8px, .6vw, 12px); }
.mini-notes button { border: 0; background: transparent; text-align: left; padding: 0; min-width: 0; min-height: 0; cursor: pointer; }
.mini-notes img { width: 100%; height: auto; aspect-ratio: 16 / 9; display: block; object-fit: cover; border-radius: 8px; }
.mini-notes b { display: block; font-size: 13px; margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-notes p { font-size: 11px; color: #6e7989; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-notes div { display: flex; justify-content: space-between; color: #7e8998; font-size: 11px; margin-top: 5px; }

@media (max-width: 1450px) {
  .compact-home { --page-width: min(1320px, calc(100vw - 48px)); }
  .hero-grid { grid-template-columns: minmax(400px,.85fr) minmax(600px,1.2fr); gap: 34px; }
  .hero-copy h1 { font-size: clamp(43px, 3.35vw, 52px); }
  .feature-row p { font-size: 12px; }
}
@media (max-height: 850px) {
  .reference-hero { height: 410px; }
}
</style>
